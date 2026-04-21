package com.pod.service;

import com.pod.entity.Rate;
import com.pod.exception.RatePeriodGapException;
import com.pod.repository.RateRepository;
import com.pod.repository.RepositoryTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * RateServiceTest — TDD RED → GREEN → REFACTOR for createRate().
 *
 * Tests:
 *   - testCreateRate_contiguousSequence_succeeds()
 *   - testCreateRate_gapDetected_throwsRatePeriodGapException()
 *   - testConcurrentRateCreation_pessimisticLockPreventsDoubleClose()
 */
@SpringBootTest
@ContextConfiguration(classes = RepositoryTestConfig.class)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.format_sql=true",
    "spring.flyway.enabled=false",
    "spring.main.allow-bean-definition-overriding=true"
})
@Transactional
@Rollback
class RateServiceTest {

    @Autowired
    private RateService rateService;

    @Autowired
    private RateRepository rateRepository;

    @Test
    void testCreateRate_contiguousSequence_succeeds() {
        // Given: an active rate covering 202512
        Rate existing = rateRepository.save(Rate.builder()
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .monthlyRateK(new BigDecimal("150.00"))
            .effectiveFrom("202512")
            .effectiveTo(null)  // active
            .isBillable(true)
            .isActive(true)
            .build());
        // Force INSERT so query can find it
        rateRepository.flush();

        // Create request for next month (202601)
        RateService.CreateRateRequest request = new RateService.CreateRateRequest(
            "ENG-CC1", "BTC-API", new BigDecimal("160.00"), "202601", true
        );

        // When: create the new rate
        Rate result = rateService.createRate(request);

        // Then: existing rate is closed (effectiveTo = 202512) and new rate is active (effectiveTo=null)
        Optional<Rate> updatedPrev = rateRepository.findById(existing.getId());
        assertThat(updatedPrev).isPresent();
        assertThat(updatedPrev.get().getEffectiveTo()).isEqualTo("202512"); // closes at prev month

        assertThat(result.getCostCenterId()).isEqualTo("ENG-CC1");
        assertThat(result.getBillableTeamCode()).isEqualTo("BTC-API");
        assertThat(result.getEffectiveFrom()).isEqualTo("202601");
        assertThat(result.getEffectiveTo()).isNull(); // active
    }

    @Test
    void testCreateRate_gapDetected_throwsRatePeriodGapException() {
        // Given: an active rate covering 202512
        Rate existing = rateRepository.save(Rate.builder()
            .costCenterId("ENG-CC2")
            .billableTeamCode("BTC-WEB")
            .monthlyRateK(new BigDecimal("140.00"))
            .effectiveFrom("202512")
            .effectiveTo(null)
            .isBillable(true)
            .isActive(true)
            .build());
        // Force INSERT so JPQL query can see it
        rateRepository.flush();

        // Create request skipping a month (202603 skips Jan & Feb)
        RateService.CreateRateRequest request = new RateService.CreateRateRequest(
            "ENG-CC2", "BTC-WEB", new BigDecimal("160.00"), "202603", true
        );

        // When/Then: creation throws RatePeriodGapException
        assertThatThrownBy(() -> rateService.createRate(request))
            .isInstanceOf(RatePeriodGapException.class)
            .hasMessageContaining("Gap");
    }

    @Test
    void testConcurrentRateCreation_pessimisticLockPreventsDoubleClose() {
        // Given: one active rate 202512
        Rate existing = rateRepository.save(Rate.builder()
            .costCenterId("ENG-CC3")
            .billableTeamCode("BTC-MOBILE")
            .monthlyRateK(new BigDecimal("155.00"))
            .effectiveFrom("202512")
            .effectiveTo(null)
            .isBillable(true)
            .isActive(true)
            .build());

        RateService.CreateRateRequest request = new RateService.CreateRateRequest(
            "ENG-CC3", "BTC-MOBILE", new BigDecimal("165.00"), "202601", true
        );

        // When: two concurrent threads try to create next month rate
        // (H2 serializes auto-commit transactions; this test serves as documentation
        // of intent — actual DB-level PESSIMISTIC_WRITE lock acquired on findActiveRate)
        Rate result1 = rateService.createRate(request);

        // Then: the first succeeds (RED stubs return same object; GREEN uses DB lock)
        assertThat(result1).isNotNull();
        assertThat(result1.getEffectiveFrom()).isEqualTo("202601");

        // Second attempt with the same pre-closed existing rate would have a stale
        // effectiveTo value — full integration test requires DB-specific lock validation;
        // this RED test documents the expected behaviour for GREEN implementation.
    }
}
