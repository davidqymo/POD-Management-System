package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", length = 50)
    private String requestId;

    @Column(name = "clarity_id", length = 50)
    private String clarityId;

    @Column(name = "billable_product_id", length = 50)
    private String billableProductId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @JsonProperty("budgetTotalK")
    @Column(name = "budget_total_k", nullable = false, precision = 10, scale = 2)
    private BigDecimal budgetTotalK;

    @Column(name = "budget_monthly_breakdown", columnDefinition = "text")
    private String budgetMonthlyBreakdown;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.REQUESTED;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "owner_user_id")
    private Long ownerUserId;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Version
    private Long version;

    @Column(name = "is_active", nullable = false)
    @JsonProperty("isActive")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonIgnore
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @JsonIgnore
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (budgetTotalK == null) budgetTotalK = BigDecimal.ZERO;
        updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}