package com.pod.controller;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import com.pod.service.ResourceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping("/{id}")
    public Resource getById(@PathVariable Long id) {
        return resourceService.findById(id).orElseThrow(() -> new IllegalArgumentException("Resource not found: " + id));
    }

    @GetMapping
    public Page<Resource> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String costCenter,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return resourceService.findAllWithFilters(search, skill, costCenter, status, PageRequest.of(page, size, Sort.by("name")));
    }

    @PostMapping
    public Resource create(@RequestBody Resource resource) {
        return resourceService.create(resource);
    }

    @PatchMapping("/{id}/status")
    public Resource changeStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ResourceStatus status = ResourceStatus.valueOf(body.get("status"));
        String reason = body.get("reason");
        resourceService.changeStatus(id, status, reason);
        return resourceService.findById(id).orElseThrow();
    }

    @PatchMapping("/{id}/deactivate")
    public void deactivate(@PathVariable Long id) {
        resourceService.deactivate(id);
    }

    @PostMapping("/{id}/update")
    public Resource update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return resourceService.updateFields(id, body);
    }
}
