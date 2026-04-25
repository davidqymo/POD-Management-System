package com.pod.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GanttResponse {
    private Long projectId;
    private List<Activity> activities;
    private List<Link> links;
    private List<Long> criticalPath;
    private int totalDurationDays;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Activity {
        private Long id;
        private String name;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal estimatedHours;
        private int durationDays;
        private int earlyStart;
        private int earlyFinish;
        private int lateStart;
        private int lateFinish;
        private boolean isCritical;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Link {
        private Long from;
        private Long to;
        private String type;
    }
}
