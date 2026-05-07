package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * ScrollNotice - Entity for managing scroll/announcement notices.
 *
 * Used for displaying scrolling announcements at the top of frontend pages.
 * Admin can create, edit, delete, enable/disable notices.
 */
@Entity
@Table(name = "scroll_notices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScrollNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content", nullable = false, length = 200)
    private String content;

    @Column(name = "speed", nullable = false)
    @Builder.Default
    private Integer speed = 2; // 1=Slow(2px), 2=Medium(3px), 3=Fast(5px)

    @Column(name = "direction", nullable = false)
    @Builder.Default
    private Integer direction = 1; // 1=right-to-left, 2=left-to-right

    @Column(name = "status", nullable = false)
    @Builder.Default
    private Integer status = 1; // 0=Disabled, 1=Enabled

    @Column(name = "link", length = 500)
    private String link;

    @Column(name = "remark", length = 100)
    private String remark;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}