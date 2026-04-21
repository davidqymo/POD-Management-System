package com.pod.util;

import com.github.javafaker.Faker;
import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import java.util.Random;

/**
 * TestFixtures — deterministic seeded test data factory.
 *
 * T0.1: Uses Faker with fixed seed 42 for reproducible "random" data.
 * T1.1: Expanded to cover Resource entity fields required by tests.
 */
public final class TestFixtures {

    private static final long FIXED_SEED = 42L;
    private static final Random RANDOM = new Random(FIXED_SEED);
    private static final Faker FAKER = new Faker(RANDOM);

    private TestFixtures() {}

    /**
     * Generate a Resource entity with randomized realistic data (seeded).
     * External ID always starts with EMP- plus numeric suffix.
     *
     * Includes all fields verified by TestFixturesTest (core Sprint 1 set):
     * - skill: one of {backend, frontend, devops, qa, pm}
     * - level: 1–10
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
     * Null override values → random defaults.
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
            .costCenterId(costCenterId != null ? costCenterId : "CC-UNKNOWN")
            .billableTeamCode(billableTeamCode != null ? billableTeamCode : "BTC-GEN")
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
        String[] skills = {"backend", "frontend", "devops", "qa", "pm", "mobile", "data"};
        return skills[FAKER.random().nextInt(skills.length)];
    }

    private static Integer randomLevel() {
        // Levels 1–10, weighted toward middle
        return FAKER.number().numberBetween(1, 10);
    }

    private static String randomCostCenter() {
        String[] centers = {"ENG-CC1", "FIN-CC2", "PM-CC3", "OPS-CC4", "HR-CC5"};
        return centers[FAKER.random().nextInt(centers.length)];
    }

    private static String randomBillableTeam() {
        String[] teams = {"BTC-API", "BTC-WEB", "BTC-MOBILE", "BTC-DATA", "BTC-INFRA"};
        return teams[FAKER.random().nextInt(teams.length)];
    }
}
