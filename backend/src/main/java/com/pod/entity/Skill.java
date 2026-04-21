package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * T0.2 seed entity — Skill lookup for resource matching.
 * V1.4 seed inserts ~20 core skills.
 */
@Entity
@Table(name = "skills")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Skill {

    @Id
    @Column(name = "skill_name", nullable = false, length = 50)
    private String skillName;

    @Column(name = "category", nullable = false, length = 30)
    private String category;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
