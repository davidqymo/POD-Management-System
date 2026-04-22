package com.pod.service;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import com.pod.exception.InvalidStatusTransitionException;
import com.pod.repository.ResourceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * ResourceService — business logic for Resource entity lifecycle.
 *
 * T1.4: changeStatus() applies guarded state transitions with PESSIMISTIC_WRITE
 * locking to prevent concurrent edits, validates via Resource.isValidTransition(),
 * and records audit changes (stubbed here; real AuditService wired in REFACTOR).
 *
 * T1.5: Added findAll(), findById(), create(), deactivate() for REST API.
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

    /**
     * Find all active resources.
     */
    @Transactional(readOnly = true)
    public List<Resource> findAll() {
        return resourceRepository.findAll();
    }

    /**
     * Find resource by ID.
     */
    @Transactional(readOnly = true)
    public Optional<Resource> findById(Long id) {
        return resourceRepository.findById(id);
    }

    /**
     * Create a new resource.
     */
    public Resource create(Resource resource) {
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }
        return resourceRepository.save(resource);
    }

    /**
     * Soft delete (deactivate) a resource.
     */
    public void deactivate(Long id) {
        Resource resource = entityManager.find(Resource.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (resource == null) {
            throw new EntityNotFoundException("Resource not found: " + id);
        }
        resource.setActive(false);
        resourceRepository.save(resource);
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
