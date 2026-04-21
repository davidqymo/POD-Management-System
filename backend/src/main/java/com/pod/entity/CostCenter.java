package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * T0.2 seed entity — CostCenter lookup.
 * V1.1 seed inserts 12 rows per spec requirements.
 */
@Entity
@Table(name = "cost_centers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CostCenter {

    @Id
    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @Column(name = "description", nullable = false, length = 100)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
