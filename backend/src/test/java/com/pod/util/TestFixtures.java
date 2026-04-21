package com.pod.util;

import com.github.javafaker.Faker;
import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import java.util.Random;

/**
 * TestFixtures — deterministic seeded test data factory.
 *
 * T0.1: Faker with fixed seed 42 → reproducible "random" data.
 * REFACTOR: DRY constantization of skill, cost center, team arrays.
 */
public final class TestFixtures {

    private static final long FIXED_SEED = 42L;
    private static final Random RANDOM = new Random(FIXED_SEED);
    private static final Faker FAKER = new Faker(RANDOM);

    // REFACTOR: constant arrays replace scattered literals
    private static final String[] SKILLS = {"backend", "frontend", "devops", "qa", "pm", "mobile", "data"};
    private static final String[] COST_CENTERS = {"ENG-CC1", "FIN-CC2", "PM-CC3", "OPS-CC4", "HR-CC5"};
    private static final String[] BILLABLE_TEAMS = {"BTC-API", "BTC-WEB", "BTC-MOBILE", "BTC-DATA", "BTC-INFRA"};

    private TestFixtures() {}

    /**
     * Generate a Resource entity with randomized realistic data (seeded).
     * External ID always starts with EMP- plus 3-digit numeric suffix.
     *
     * Includes all fields verified by TestFixturesTest (core Sprint 1 set):
     * - skill: one of SKILLS array
     * - level: 1–10 integer
     * - category: PERMANENT
     */
    public static Resource resource() {
        return resource(
            "EMP-" + String.format("%03d", FAKER.number().numberBetween(1, 999)),
            FAKER.name().fullName(),
            randomCostCenter(),
            randomBillableTeam(),
            randomSkill(),
            randomLevel()
        );
    }

    /**
     * Resource factory with selective field overrides.
     * Null override values → random seeded defaults.
     */
    public static Resource resource(
            String externalId,
            String name,
            String costCenterId,
            String billableTeamCode,
            String skill,
            Integer level
    ) {
        return Resource.builder()
            .externalId(externalId != null ? externalId : "EMP-TEST")
            .name(name != null ? name : FAKER.name().fullName())
            .costCenterId(costCenterId != null ? costCenterId : COST_CENTERS[0])
            .billableTeamCode(billableTeamCode != null ? billableTeamCode : BILLABLE_TEAMS[0])
            .category(ResourceCategory.PERMANENT)
            .skill(skill != null ? skill : randomSkill())
            .level(level != null ? level : randomLevel())
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(true)
            .version(1)
            .build();
    }

    private static String randomSkill() {
        return SKILLS[FAKER.random().nextInt(SKILLS.length)];
    }

    private static Integer randomLevel() {
        return FAKER.number().numberBetween(1, 10);
    }

    private static String randomCostCenter() {
        return COST_CENTERS[FAKER.random().nextInt(COST_CENTERS.length)];
    }

    private static String randomBillableTeam() {
        return BILLABLE_TEAMS[FAKER.random().nextInt(BILLABLE_TEAMS.length)];
    }
}
