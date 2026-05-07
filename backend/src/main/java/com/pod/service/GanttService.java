package com.pod.service;

import com.pod.dto.response.GanttResponse;
import com.pod.entity.Activity;
import com.pod.entity.ActivityDependency;
import com.pod.exception.CycleDetectedException;
import com.pod.repository.ActivityRepository;
import com.pod.repository.ActivityDependencyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class GanttService {

    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;

    public GanttService(ActivityRepository activityRepository, ActivityDependencyRepository dependencyRepository) {
        this.activityRepository = activityRepository;
        this.dependencyRepository = dependencyRepository;
    }

    public GanttResponse calculateCriticalPath(Long projectId) {
        List<Activity> activities = activityRepository.findByProjectIdAndIsActiveTrue(projectId);
        if (activities.isEmpty()) {
            return GanttResponse.builder().projectId(projectId).activities(Collections.emptyList())
                .links(Collections.emptyList()).criticalPath(Collections.emptyList()).totalDurationDays(0).build();
        }

        List<Long> activityIds = activities.stream().map(Activity::getId).collect(Collectors.toList());
        List<ActivityDependency> dependencies = dependencyRepository.findByPredecessorIdIn(activityIds);

        Map<Long, List<Long>> adjacency = new HashMap<>();
        Map<Long, Integer> indegree = new HashMap<>();
        Map<Long, Activity> activityMap = new HashMap<>();

        for (Activity a : activities) {
            adjacency.put(a.getId(), new ArrayList<>());
            indegree.put(a.getId(), 0);
            activityMap.put(a.getId(), a);
        }

        for (ActivityDependency dep : dependencies) {
            Long pred = dep.getPredecessorId(), succ = dep.getSuccessorId();
            if (adjacency.containsKey(pred) && adjacency.containsKey(succ)) {
                adjacency.get(pred).add(succ);
                indegree.put(succ, indegree.get(succ) + 1);
            }
        }

        List<Long> topoOrder = new ArrayList<>();
        Queue<Long> queue = new LinkedList<>();
        for (Long id : indegree.keySet()) if (indegree.get(id) == 0) queue.offer(id);

        while (!queue.isEmpty()) {
            Long current = queue.poll();
            topoOrder.add(current);
            for (Long successor : adjacency.get(current)) {
                indegree.put(successor, indegree.get(successor) - 1);
                if (indegree.get(successor) == 0) queue.offer(successor);
            }
        }

        if (topoOrder.size() != activities.size()) {
            throw new CycleDetectedException("Dependency cycle detected in project activities");
        }

        Map<Long, Integer> earlyStart = new HashMap<>();
        Map<Long, Integer> earlyFinish = new HashMap<>();

        for (Long id : topoOrder) {
            Activity a = activityMap.get(id);
            int duration = getDurationDays(a);
            int es = 0;
            for (ActivityDependency dep : dependencies) {
                if (dep.getSuccessorId().equals(id)) {
                    Long predId = dep.getPredecessorId();
                    if (earlyFinish.containsKey(predId)) {
                        es = Math.max(es, earlyFinish.get(predId) + dep.getLagDays());
                    }
                }
            }
            earlyStart.put(id, es);
            earlyFinish.put(id, es + duration);
        }

        Map<Long, Integer> lateStart = new HashMap<>();
        Map<Long, Integer> lateFinish = new HashMap<>();
        int projectEnd = earlyFinish.values().stream().max(Integer::compareTo).orElse(0);

        List<Long> reverseOrder = new ArrayList<>(topoOrder);
        Collections.reverse(reverseOrder);

        for (Long id : reverseOrder) {
            Activity a = activityMap.get(id);
            int duration = getDurationDays(a);
            int lf = projectEnd;
            for (ActivityDependency dep : dependencies) {
                if (dep.getPredecessorId().equals(id)) {
                    Long succId = dep.getSuccessorId();
                    if (lateStart.containsKey(succId)) {
                        lf = Math.min(lf, lateStart.get(succId) - dep.getLagDays());
                    }
                }
            }
            lateFinish.put(id, lf);
            lateStart.put(id, lf - duration);
        }

        List<GanttResponse.Activity> ganttActivities = new ArrayList<>();
        List<Long> criticalPathIds = new ArrayList<>();

        for (Activity a : activities) {
            Long id = a.getId();
            int es = earlyStart.getOrDefault(id, 0);
            int ls = lateStart.getOrDefault(id, 0);
            boolean isCritical = Math.abs(ls - es) < 1;

            ganttActivities.add(GanttResponse.Activity.builder().id(id).name(a.getName())
                .startDate(a.getPlannedStartDate()).endDate(a.getPlannedEndDate())
                .estimatedHours(a.getEstimatedHours()).durationDays(getDurationDays(a))
                .earlyStart(es).earlyFinish(earlyFinish.getOrDefault(id, 0))
                .lateStart(ls).lateFinish(lateFinish.getOrDefault(id, 0)).isCritical(isCritical)
                .isMilestone(a.isMilestone()).build());

            if (isCritical) criticalPathIds.add(id);
        }

        List<GanttResponse.Link> links = dependencies.stream()
            .map(dep -> GanttResponse.Link.builder().from(dep.getPredecessorId()).to(dep.getSuccessorId()).type(dep.getDependencyType()).build())
            .collect(Collectors.toList());

        return GanttResponse.builder().projectId(projectId).activities(ganttActivities).links(links)
            .criticalPath(criticalPathIds).totalDurationDays(projectEnd).build();
    }

    private int getDurationDays(Activity a) {
        if (a.getPlannedStartDate() == null || a.getPlannedEndDate() == null) {
            return a.getEstimatedHours() != null ? Math.max(1, a.getEstimatedHours().intValue() / 8) : 1;
        }
        return (int) java.time.temporal.ChronoUnit.DAYS.between(a.getPlannedStartDate(), a.getPlannedEndDate()) + 1;
    }
}
