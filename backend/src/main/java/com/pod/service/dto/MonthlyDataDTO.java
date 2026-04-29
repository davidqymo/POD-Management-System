package com.pod.service.dto;

public class MonthlyDataDTO {
    private String month;
    private double value;

    public MonthlyDataDTO() {}

    public MonthlyDataDTO(String month, double value) {
        this.month = month;
        this.value = value;
    }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
}