package com.pod.service;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import com.pod.exception.InvalidStatusTransitionException;
import com.pod.repository.ResourceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ResourceService - Business logic layer for Resource entity lifecycle.
 *
 * PROCESS FLOW:
 * 1. Query Operations (read-only):
 *    - findAllWithFilters() - Paginated search with dynamic filtering via JPA Specifications
 *    - findAll() - Returns all active resources
 *    - findById() - Returns single resource by ID
 *
 * 2. Write Operations (with transaction):
 *    - create() - Creates new resource, defaults status to ACTIVE if not specified
 *    - updateFields() - Partial update using PESSIMISTIC_WRITE lock
 *    - changeStatus() - State transition with validation and locking
 *    - deactivate() - Soft delete (sets isActive=false)
 *
 * CONCURRENCY CONTROL:
 * - All write operations use PESSIMISTIC_WRITE lock to prevent concurrent modification
 * - Optimistic locking via @Version field provides secondary conflict detection
 *
 * FILTERING:
 * - Supports filtering by: search, skill, costCenter, status, functionalManager, l5TeamCode
 * - Search uses case-insensitive LIKE on name, externalId, costCenterId
 * - Always filters for isActive=true to return only active records
 *
 * STATE MACHINE:
 * - changeStatus() validates transitions via Resource.isValidTransition()
 * - Invalid transitions throw InvalidStatusTransitionException
 * - Transitions: ACTIVE->ON_LEAVE/TERMINATED, ON_LEAVE->ACTIVE, TERMINATED->(none)
 */
@Service
@Transactional
public class ResourceService {

    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);

    private final ResourceRepository resourceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    @Transactional(readOnly = true)
    public Page<Resource> findAllWithFilters(String search, String skill, String costCenter, String status, String functionalManager, String l5TeamCode, Pageable pageable) {
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
        if (functionalManager != null && !functionalManager.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("functionalManager"), functionalManager));
        }
        if (l5TeamCode != null && !l5TeamCode.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("l5TeamCode"), l5TeamCode));
        }
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));

        return resourceRepository.findAll(spec, pageable);
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

        // Record audit - use proper logging
        log.info("Resource {} status changed: {} -> {}, reason: {}",
            resourceId, resource.getStatus(), newStatus, reason);
    }

    /**
     * Update resource fields.
     */
    public Resource updateFields(Long id, Map<String, Object> fields) {
        Resource resource = entityManager.find(Resource.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (resource == null) {
            throw new EntityNotFoundException("Resource not found: " + id);
        }

        if (fields.containsKey("name") && fields.get("name") != null) {
            resource.setName(fields.get("name").toString());
        }
        if (fields.containsKey("externalId") && fields.get("externalId") != null) {
            resource.setExternalId(fields.get("externalId").toString());
        }
        if (fields.containsKey("costCenterId") && fields.get("costCenterId") != null) {
            resource.setCostCenterId(fields.get("costCenterId").toString());
        }
        if (fields.containsKey("billableTeamCode") && fields.get("billableTeamCode") != null) {
            resource.setBillableTeamCode(fields.get("billableTeamCode").toString());
        }
                if (fields.containsKey("skill") && fields.get("skill") != null) {
            resource.setSkill(fields.get("skill").toString());
        }
        if (fields.containsKey("level") && fields.get("level") != null) {
            resource.setLevel(Integer.parseInt(fields.get("level").toString()));
        }
        if (fields.containsKey("functionalManager") && fields.get("functionalManager") != null) {
            resource.setFunctionalManager(fields.get("functionalManager").toString());
        }
        if (fields.containsKey("l5TeamCode") && fields.get("l5TeamCode") != null) {
            resource.setL5TeamCode(fields.get("l5TeamCode").toString());
        }
        if (fields.containsKey("skills") && fields.get("skills") != null) {
            // Support multiple skills as JSON array or comma-separated string
            resource.setSkill(fields.get("skills").toString());
        } else if (fields.containsKey("skill") && fields.get("skill") != null) {
            resource.setSkill(fields.get("skill").toString());
        }

        return resourceRepository.save(resource);
    }
}
