package com.pod.service.dto;

public class VarianceDTO {
    private Long projectId;
    private String projectName;
    private double budgetK;
    private double allocatedK;
    private double spentK;
    private double varianceK;
    private double variancePercent;

    public VarianceDTO() {}

    public VarianceDTO(Long projectId, String projectName, double budgetK,
                       double allocatedK, double spentK, double varianceK, double variancePercent) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.budgetK = budgetK;
        this.allocatedK = allocatedK;
        this.spentK = spentK;
        this.varianceK = varianceK;
        this.variancePercent = variancePercent;
    }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }
    public double getBudgetK() { return budgetK; }
    public void setBudgetK(double budgetK) { this.budgetK = budgetK; }
    public double getAllocatedK() { return allocatedK; }
    public void setAllocatedK(double allocatedK) { this.allocatedK = allocatedK; }
    public double getSpentK() { return spentK; }
    public void setSpentK(double spentK) { this.spentK = spentK; }
    public double getVarianceK() { return varianceK; }
    public void setVarianceK(double varianceK) { this.varianceK = varianceK; }
    public double getVariancePercent() { return variancePercent; }
    public void setVariancePercent(double variancePercent) { this.variancePercent = variancePercent; }
}