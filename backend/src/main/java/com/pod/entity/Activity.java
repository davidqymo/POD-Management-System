package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Activity Entity - Work package within a project.
 *
 * PURPOSE:
 * Represents a task/work package that can be allocated to resources.
 * Activities are part of a project and can have dependencies on other activities.
 *
 * FIELDS:
 * - projectId: Reference to parent project (required)
 * - name: Activity name (required, max 200 chars)
 * - description: Detailed description (optional, max 1000 chars)
 * - plannedStartDate: Planned start date
 * - plannedEndDate: Planned end date
 * - estimatedHours: Estimated effort in hours
 * - isMilestone: Whether this activity is a milestone
 * - milestoneStatus: Status for milestones (NOT_STARTED, COMPLETED)
 * - sequence: Ordering within project
 *
 * RELATIONSHIPS:
 * - ManyToOne with Project (via projectId)
 * - OneToMany with ActivityDependency (as predecessor or successor)
 * - OneToMany with Allocations (resources assigned to this activity)
 *
 * GANTCHARTS:
 * - Used by GanttService to generate timeline visualizations
 * - Dependencies create the network diagram for scheduling
 */
@Entity
@Table(name = "activities")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "estimated_hours", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal estimatedHours = BigDecimal.ZERO;

    @Column(name = "actual_hours", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal actualHours = BigDecimal.ZERO;

    @Column(name = "is_milestone", nullable = false)
    @Builder.Default
    @JsonProperty("isMilestone")
    private boolean isMilestone = false;

    @Column(name = "milestone_status", length = 20)
    private String milestoneStatus;

    @Column(name = "sequence", nullable = false)
    @Builder.Default
    private Integer sequence = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
