package com.pod.controller;

import com.pod.dto.request.ScrollNoticeRequest;
import com.pod.entity.ScrollNotice;
import com.pod.service.ScrollNoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/scroll-notices")
@RequiredArgsConstructor
public class ScrollNoticeController {

    private final ScrollNoticeService scrollNoticeService;

    @GetMapping
    public ResponseEntity<Page<ScrollNotice>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ScrollNotice> result = scrollNoticeService.getAll(keyword, pageRequest);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/enabled")
    public ResponseEntity<List<ScrollNotice>> getEnabled() {
        List<ScrollNotice> result = scrollNoticeService.getAllEnabled();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScrollNotice> getById(@PathVariable Long id) {
        return scrollNoticeService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ScrollNotice> create(@Valid @RequestBody ScrollNoticeRequest request) {
        ScrollNotice created = scrollNoticeService.create(request);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScrollNotice> update(@PathVariable Long id, @Valid @RequestBody ScrollNoticeRequest request) {
        ScrollNotice updated = scrollNoticeService.update(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        scrollNoticeService.delete(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> batchDelete(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids != null && !ids.isEmpty()) {
            scrollNoticeService.batchDelete(ids);
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ScrollNotice> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer status = body.get("status");
        ScrollNotice updated = scrollNoticeService.updateStatus(id, status);
        return ResponseEntity.ok(updated);
    }
}