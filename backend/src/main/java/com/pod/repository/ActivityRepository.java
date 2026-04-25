package com.pod.repository;

import com.pod.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByProjectIdAndIsActiveTrue(Long projectId);
    List<Activity> findByProjectId(Long projectId);
}
