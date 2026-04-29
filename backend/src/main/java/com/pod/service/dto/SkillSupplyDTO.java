package com.pod.service.dto;

public class SkillSupplyDTO {
    private String skill;
    private long count;

    public SkillSupplyDTO() {}

    public SkillSupplyDTO(String skill, long count) {
        this.skill = skill;
        this.count = count;
    }

    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }
    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}