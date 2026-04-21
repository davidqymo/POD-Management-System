package com.pod.repository;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Minimal Spring Boot application for @DataJpaTest.
 * Scans entities and repositories in the test scope.
 */
@SpringBootApplication
@EntityScan(basePackages = "com.pod.entity")
@EnableJpaRepositories(basePackages = "com.pod.repository")
public class RepositoryTestConfig {

    @Bean
    public ApplicationRunner runner() {
        return args -> {
            // No-op: prevents ApplicationFailedEvent on H2 startup
        };
    }
}
