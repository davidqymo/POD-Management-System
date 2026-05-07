package com.pod.service.dto;

public class BudgetTrendDTO {
    private String month;
    private double totalBudgetK;
    private double allocatedK;
    private double remainingK;

    public BudgetTrendDTO() {}

    public BudgetTrendDTO(String month, double totalBudgetK, double allocatedK, double remainingK) {
        this.month = month;
        this.totalBudgetK = totalBudgetK;
        this.allocatedK = allocatedK;
        this.remainingK = remainingK;
    }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public double getTotalBudgetK() { return totalBudgetK; }
    public void setTotalBudgetK(double totalBudgetK) { this.totalBudgetK = totalBudgetK; }
    public double getAllocatedK() { return allocatedK; }
    public void setAllocatedK(double allocatedK) { this.allocatedK = allocatedK; }
    public double getRemainingK() { return remainingK; }
    public void setRemainingK(double remainingK) { this.remainingK = remainingK; }
}