package com.pod.service;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import com.pod.exception.InvalidStatusTransitionException;
import com.pod.repository.ResourceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ResourceService — business logic for Resource entity lifecycle.
 *
 * T1.4: changeStatus() applies guarded state transitions with PESSIMISTIC_WRITE
 * locking to prevent concurrent edits, validates via Resource.isValidTransition(),
 * and records audit changes (stubbed here; real AuditService wired in REFACTOR).
 */
@Service
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    @Transactional(readOnly = true)
    public Page<Resource> findAllWithFilters(String search, String skill, String costCenter, String status, Pageable pageable) {
        Specification<Resource> spec = Specification.where(null);

        if (search != null && !search.isBlank()) {
            spec = spec.and((root, query, cb) ->
                cb.or(
                    cb.like(cb.lower(root.get("name")), "%" + search.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("externalId")), "%" + search.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("costCenterId")), "%" + search.toLowerCase() + "%")
                )
            );
        }
        if (skill != null && !skill.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("skill"), skill));
        }
        if (costCenter != null && !costCenter.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("costCenterId"), costCenter));
        }
        if (status != null && !status.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), ResourceStatus.valueOf(status)));
        }
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));

        return resourceRepository.findAll(spec, pageable);
    }

    /**
     * Change the status of a resource with validation and locking.
     *
     * @param resourceId the resource primary key
     * @param newStatus  the desired new status
     * @param reason     audit reason for the change
     * @throws InvalidStatusTransitionException if transition violates business rules
     */
    public void changeStatus(Long resourceId, ResourceStatus newStatus, String reason) {
        // Acquire PESSIMISTIC_WRITE lock to prevent concurrent edits
        Resource resource = entityManager.find(Resource.class, resourceId, LockModeType.PESSIMISTIC_WRITE);
        if (resource == null) {
            throw new IllegalArgumentException("Resource not found: " + resourceId);
        }

        // Validate state transition
        if (!resource.isValidTransition(resource.getStatus(), newStatus)) {
            throw new InvalidStatusTransitionException(
                String.format("Invalid status transition from %s to %s for resource %d",
                    resource.getStatus(), newStatus, resourceId));
        }

        // Apply change
        resource.setStatus(newStatus);
        resourceRepository.save(resource);

        // Record audit (GREEN: stub — simple log; REFACTOR will inject AuditService)
        System.out.printf("[AUDIT] Resource %d status %s → %s : %s%n",
            resourceId, resource.getStatus(), newStatus, reason);
    }
}
