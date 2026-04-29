package com.pod.service.dto;

public class OverplanProjectDTO {
    private Long projectId;
    private String projectName;
    private double budgetK;
    private double estimatedHours;
    private double allocatedHours;
    private double spentK;
    private double overHours;
    private double overBudgetK;

    public OverplanProjectDTO() {}

    public OverplanProjectDTO(Long projectId, String projectName, double budgetK,
                               double estimatedHours, double allocatedHours, double spentK,
                               double overHours, double overBudgetK) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.budgetK = budgetK;
        this.estimatedHours = estimatedHours;
        this.allocatedHours = allocatedHours;
        this.spentK = spentK;
        this.overHours = overHours;
        this.overBudgetK = overBudgetK;
    }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }
    public double getBudgetK() { return budgetK; }
    public void setBudgetK(double budgetK) { this.budgetK = budgetK; }
    public double getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(double estimatedHours) { this.estimatedHours = estimatedHours; }
    public double getAllocatedHours() { return allocatedHours; }
    public void setAllocatedHours(double allocatedHours) { this.allocatedHours = allocatedHours; }
    public double getSpentK() { return spentK; }
    public void setSpentK(double spentK) { this.spentK = spentK; }
    public double getOverHours() { return overHours; }
    public void setOverHours(double overHours) { this.overHours = overHours; }
    public double getOverBudgetK() { return overBudgetK; }
    public void setOverBudgetK(double overBudgetK) { this.overBudgetK = overBudgetK; }
}