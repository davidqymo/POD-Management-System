package com.pod.service;

import com.pod.dto.request.ScrollNoticeRequest;
import com.pod.entity.ScrollNotice;
import com.pod.exception.ResourceNotFoundException;
import com.pod.repository.ScrollNoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrollNoticeService {

    private final ScrollNoticeRepository scrollNoticeRepository;

    @Transactional(readOnly = true)
    public Page<ScrollNotice> getAll(String keyword, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            return scrollNoticeRepository.findByContentContainingIgnoreCase(keyword, pageable);
        }
        return scrollNoticeRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<ScrollNotice> getAllEnabled() {
        return scrollNoticeRepository.findAllEnabled();
    }

    @Transactional(readOnly = true)
    public Optional<ScrollNotice> getById(Long id) {
        return scrollNoticeRepository.findById(id);
    }

    @Transactional
    public ScrollNotice create(ScrollNoticeRequest request) {
        ScrollNotice notice = ScrollNotice.builder()
                .content(request.content())
                .speed(request.speed())
                .direction(request.direction() != null ? request.direction() : 1)
                .status(request.status() != null ? request.status() : 1)
                .link(request.link())
                .remark(request.remark())
                .build();
        return scrollNoticeRepository.save(notice);
    }

    @Transactional
    public ScrollNotice update(Long id, ScrollNoticeRequest request) {
        ScrollNotice existing = scrollNoticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScrollNotice not found: " + id));

        existing.setContent(request.content());
        existing.setSpeed(request.speed());
        existing.setDirection(request.direction() != null ? request.direction() : existing.getDirection());
        existing.setStatus(request.status() != null ? request.status() : existing.getStatus());
        existing.setLink(request.link());
        existing.setRemark(request.remark());

        return scrollNoticeRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!scrollNoticeRepository.existsById(id)) {
            throw new ResourceNotFoundException("ScrollNotice not found: " + id);
        }
        scrollNoticeRepository.deleteById(id);
    }

    @Transactional
    public void batchDelete(List<Long> ids) {
        // Check if all IDs exist before deleting
        for (Long id : ids) {
            if (!scrollNoticeRepository.existsById(id)) {
                throw new ResourceNotFoundException("ScrollNotice not found: " + id);
            }
        }
        scrollNoticeRepository.deleteAllById(ids);
    }

    @Transactional
    public ScrollNotice updateStatus(Long id, Integer status) {
        if (status < 0 || status > 1) {
            throw new IllegalArgumentException("Status must be 0 (Disabled) or 1 (Enabled)");
        }
        ScrollNotice existing = scrollNoticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScrollNotice not found: " + id));
        existing.setStatus(status);
        return scrollNoticeRepository.save(existing);
    }
}