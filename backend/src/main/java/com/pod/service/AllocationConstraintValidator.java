package com.pod.service;

import com.pod.dto.response.ConstraintViolation;
import com.pod.entity.Project;
import com.pod.entity.Resource;
import com.pod.repository.AllocationRepository;
import com.pod.repository.ProjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * AllocationConstraintValidator — validates HCM-based constraints for allocation.
 * Simplified version - full validation logic can be added later.
 */
@Service
@RequiredArgsConstructor
public class AllocationConstraintValidator {

    private final AllocationRepository allocationRepository;
    private final ProjectRepository projectRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Validate HCM-based allocation proposal.
     *
     * @param resourceId  ID of the resource being allocated
     * @param projectId ID of the project
     * @param hcm    HCM in YYYYMM format (e.g., 202512 = December 2025)
     * @param hours   total hours proposed for that HCM (max 144h)
     * @param activityId nullable activity ID
     * @return list of constraint violations (empty = all checks passed)
     */
    @Transactional(readOnly = true)
    public List<ConstraintViolation> validateHcm(
        Long resourceId,
        Long projectId,
        Integer hcm,
        BigDecimal hours,
        Long activityId
    ) {
        List<ConstraintViolation> violations = new ArrayList<>();

        if (hours == null || hours.compareTo(BigDecimal.ONE) <= 0) {
            violations.add(ConstraintViolation.builder()
                .code("INVALID_HOURS")
                .message("Hours must be greater than zero")
                .build());
            return violations;
        }

        // Simple check: hours cannot exceed 144 per allocation
        if (hours.compareTo(BigDecimal.valueOf(144)) > 0) {
            violations.add(ConstraintViolation.builder()
                .code("MONTHLY_CAP_EXCEEDED")
                .message(String.format("Allocation %.2f exceeds cap of 144h (1 HCM)", hours))
                .details("Single allocation cannot exceed 144 hours")
                .build());
        }

        return violations;
    }
}