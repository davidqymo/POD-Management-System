package com.pod.service.dto;

public class StatusCountDTO {
    private String status;
    private long count;

    public StatusCountDTO() {}

    public StatusCountDTO(String status, long count) {
        this.status = status;
        this.count = count;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}