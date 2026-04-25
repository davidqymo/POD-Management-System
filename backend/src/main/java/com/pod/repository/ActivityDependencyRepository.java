package com.pod.repository;

import com.pod.entity.ActivityDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActivityDependencyRepository extends JpaRepository<ActivityDependency, ActivityDependency.Id> {
    List<ActivityDependency> findByPredecessorId(Long predecessorId);
    List<ActivityDependency> findBySuccessorId(Long successorId);
    List<ActivityDependency> findByPredecessorIdIn(List<Long> predecessorIds);
}
