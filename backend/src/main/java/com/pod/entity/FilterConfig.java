package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * FilterConfig Entity - Stores dynamic filter options for UI dropdowns.
 *
 * PURPOSE:
 * Enables admin users to manage filter values without code changes.
 * Values are displayed in dropdown menus across the application.
 *
 * CATEGORIES:
 * - skill: Technical skills (e.g., "Java", "React", "Python")
 * - cost_center: Cost center codes (e.g., "HT366", "ENG-CC1")
 * - l5_team: L5 team codes (e.g., "AM-LENDING")
 * - billable_team: Billable team codes (e.g., "ITDDEVPEM18")
 * - level: Resource levels (1-10)
 * - status: Resource statuses (ACTIVE, ON_LEAVE, TERMINATED)
 *
 * FIELDS:
 * - category: Filter category (required)
 * - value: Display value (required, unique within category)
 * - displayOrder: Sorting order in UI dropdowns
 * - isActive: Enable/disable (soft delete)
 *
 * USAGE:
 * - Frontend queries /api/v1/admin/filters to populate dropdowns
 * - Admin page allows CRUD operations on filter values
 * - Fallback to hardcoded defaults if API unavailable
 */
@Entity
@Table(name = "filter_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FilterConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "value", nullable = false, length = 100)
    private String value;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}