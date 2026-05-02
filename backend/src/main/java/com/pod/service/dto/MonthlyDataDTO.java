package com.pod.service.dto;

public class MonthlyDataDTO {
    private String month;
    private double supply;
    private double demand;

    public MonthlyDataDTO() {}

    public MonthlyDataDTO(String month, double supply, double demand) {
        this.month = month;
        this.supply = supply;
        this.demand = demand;
    }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public double getSupply() { return supply; }
    public void setSupply(double supply) { this.supply = supply; }
    public double getDemand() { return demand; }
    public void setDemand(double demand) { this.demand = demand; }
}