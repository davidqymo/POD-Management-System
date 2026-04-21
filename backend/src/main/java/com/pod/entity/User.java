package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * T0.3 auth + AC entity placeholder.
 *
 * T5.x expands this with roles[] JSONB + resource_id FK + salted-hash password.
 *
 * T0.2 seed creates 5 test users (PM, POD, Admin, Viewer).
 */
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "roles", columnDefinition = "jsonb")
    private String rolesJson;  // Minimal — list of role names as JSON array string

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
