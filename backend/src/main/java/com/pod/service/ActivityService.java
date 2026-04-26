package com.pod.service;

import com.pod.entity.Activity;
import com.pod.entity.ActivityDependency;
import com.pod.repository.ActivityDependencyRepository;
import com.pod.repository.ActivityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;

    public ActivityService(ActivityRepository activityRepository, ActivityDependencyRepository dependencyRepository) {
        this.activityRepository = activityRepository;
        this.dependencyRepository = dependencyRepository;
    }

    @Transactional(readOnly = true)
    public List<Activity> findByProjectId(Long projectId) {
        return activityRepository.findByProjectIdAndIsActiveTrue(projectId);
    }

    public Activity create(Long projectId, Map<String, Object> payload) {
        Activity activity = new Activity();
        activity.setProjectId(projectId);
        activity.setName((String) payload.get("name"));
        activity.setDescription((String) payload.get("description"));
        if (payload.get("plannedStartDate") != null) activity.setPlannedStartDate(LocalDate.parse((String) payload.get("plannedStartDate")));
        if (payload.get("plannedEndDate") != null) activity.setPlannedEndDate(LocalDate.parse((String) payload.get("plannedEndDate")));
        if (payload.get("estimatedHours") != null) activity.setEstimatedHours(new BigDecimal(payload.get("estimatedHours").toString()));
        if (payload.get("isMilestone") != null) activity.setMilestone(Boolean.TRUE.equals(payload.get("isMilestone")));
        if (payload.get("sequence") != null) activity.setSequence(((Number) payload.get("sequence")).intValue());
        activity.setActive(true);
        return activityRepository.save(activity);
    }

    public Activity update(Long id, Map<String, Object> payload) {
        Activity activity = activityRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Activity not found: " + id));
        if (payload.get("name") != null) activity.setName((String) payload.get("name"));
        if (payload.get("description") != null) activity.setDescription((String) payload.get("description"));
        if (payload.get("plannedStartDate") != null) activity.setPlannedStartDate(LocalDate.parse((String) payload.get("plannedStartDate")));
        if (payload.get("plannedEndDate") != null) activity.setPlannedEndDate(LocalDate.parse((String) payload.get("plannedEndDate")));
        if (payload.get("estimatedHours") != null) activity.setEstimatedHours(new BigDecimal(payload.get("estimatedHours").toString()));
        if (payload.get("isMilestone") != null) activity.setMilestone(Boolean.TRUE.equals(payload.get("isMilestone")));
        if (payload.get("sequence") != null) activity.setSequence(((Number) payload.get("sequence")).intValue());
        return activityRepository.save(activity);
    }

    public void deactivate(Long id) {
        Activity activity = activityRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Activity not found: " + id));
        activity.setActive(false);
        activityRepository.save(activity);
    }

    public ActivityDependency addDependency(Long predecessorId, Long successorId, String dependencyType) {
        ActivityDependency dep = ActivityDependency.builder()
            .predecessorId(predecessorId).successorId(successorId)
            .dependencyType(dependencyType != null ? dependencyType : "FS").lagDays(0).build();
        return dependencyRepository.save(dep);
    }

    public void removeDependency(Long predecessorId, Long successorId) {
        dependencyRepository.deleteById(new ActivityDependency.Id(predecessorId, successorId));
    }
}
