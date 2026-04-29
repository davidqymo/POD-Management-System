package com.pod.service.dto;

public class DashboardSummaryDTO {
    private long totalSupply;
    private double totalDemand;
    private double totalBudgetK;
    private double totalSpentK;
    private long overplanCount;
    private double utilizationRate;
    private long pendingAllocationCount;
    private long approvedAllocationCount;

    public DashboardSummaryDTO() {}

    public DashboardSummaryDTO(long totalSupply, double totalDemand, double totalBudgetK,
                               double totalSpentK, long overplanCount, double utilizationRate,
                               long pendingAllocationCount, long approvedAllocationCount) {
        this.totalSupply = totalSupply;
        this.totalDemand = totalDemand;
        this.totalBudgetK = totalBudgetK;
        this.totalSpentK = totalSpentK;
        this.overplanCount = overplanCount;
        this.utilizationRate = utilizationRate;
        this.pendingAllocationCount = pendingAllocationCount;
        this.approvedAllocationCount = approvedAllocationCount;
    }

    public long getTotalSupply() { return totalSupply; }
    public void setTotalSupply(long totalSupply) { this.totalSupply = totalSupply; }
    public double getTotalDemand() { return totalDemand; }
    public void setTotalDemand(double totalDemand) { this.totalDemand = totalDemand; }
    public double getTotalBudgetK() { return totalBudgetK; }
    public void setTotalBudgetK(double totalBudgetK) { this.totalBudgetK = totalBudgetK; }
    public double getTotalSpentK() { return totalSpentK; }
    public void setTotalSpentK(double totalSpentK) { this.totalSpentK = totalSpentK; }
    public long getOverplanCount() { return overplanCount; }
    public void setOverplanCount(long overplanCount) { this.overplanCount = overplanCount; }
    public double getUtilizationRate() { return utilizationRate; }
    public void setUtilizationRate(double utilizationRate) { this.utilizationRate = utilizationRate; }
    public long getPendingAllocationCount() { return pendingAllocationCount; }
    public void setPendingAllocationCount(long pendingAllocationCount) { this.pendingAllocationCount = pendingAllocationCount; }
    public long getApprovedAllocationCount() { return approvedAllocationCount; }
    public void setApprovedAllocationCount(long approvedAllocationCount) { this.approvedAllocationCount = approvedAllocationCount; }
}