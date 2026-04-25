package com.pod.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JacksonConfigTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void instant_serializedAsIso8601() throws Exception {
        Instant instant = Instant.parse("2026-04-24T12:00:00Z");
        String json = objectMapper.writeValueAsString(instant);
        assertThat(json).contains("2026-04-24");
        assertThat(json).doesNotMatch("^\\d+$");
    }
}
