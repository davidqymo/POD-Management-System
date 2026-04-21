package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * T0.2 seed entity — Holiday calendar.
 *
 * V1.2 seeds 2026 holidays (public + observances).
 */
@Entity
@Table(name = "holidays")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(name = "cost_center_filter", length = 50)
    private String costCenterFilter;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
