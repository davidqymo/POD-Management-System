package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder.Default;

import java.io.Serializable;

@Entity
@Table(name = "activity_dependencies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(ActivityDependency.Id.class)
public class ActivityDependency {

    @Id
    @Column(name = "predecessor_id", nullable = false)
    private Long predecessorId;

    @Id
    @Column(name = "successor_id", nullable = false)
    private Long successorId;

    @Column(name = "dependency_type", nullable = false, length = 10)
    @Builder.Default
    private String dependencyType = "FS";

    @Column(name = "lag_days")
    @Builder.Default
    private Integer lagDays = 0;

    public static class Id implements Serializable {
        private Long predecessorId;
        private Long successorId;
    }
}
