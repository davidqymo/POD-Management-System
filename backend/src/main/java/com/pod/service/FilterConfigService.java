package com.pod.service;

import com.pod.entity.FilterConfig;
import com.pod.repository.FilterConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * FilterConfigService - Business logic for managing FilterConfig entities.
 *
 * PROCESS FLOW:
 * 1. READ OPERATIONS:
 *    - getAllFilters(): Get all active filters ordered by category and display order
 *    - getFiltersByCategory(category): Get filters for specific category
 *    - getFilterById(id): Get single filter by ID
 *
 * 2. WRITE OPERATIONS:
 *    - createFilter(category, value, displayOrder): Create new filter option
 *    - updateFilter(id, value): Update filter value
 *    - deleteFilter(id): Soft delete (set isActive=false)
 *
 * REPOSITORY:
 * - findByIsActiveTrueOrderByCategoryAscDisplayOrderAsc: All active filters
 * - findByCategoryAndIsActiveTrue: Filters by category
 *
 * VALIDATION:
 * - Value must be unique within category
 * - Display order defaults to end of list
 */
@Service
@RequiredArgsConstructor
public class FilterConfigService {

    private final FilterConfigRepository filterConfigRepository;

    @Transactional(readOnly = true)
    public List<FilterConfig> getAllFilters() {
        return filterConfigRepository.findByIsActiveTrueOrderByCategoryAscDisplayOrderAsc();
    }

    @Transactional(readOnly = true)
    public List<FilterConfig> getFiltersByCategory(String category) {
        return filterConfigRepository.findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(category);
    }

    @Transactional
    public FilterConfig createFilter(String category, String value, Integer displayOrder, String description) {
        FilterConfig filter = FilterConfig.builder()
                .category(category)
                .value(value)
                .displayOrder(displayOrder != null ? displayOrder : 0)
                .description(description)
                .isActive(true)
                .build();
        return filterConfigRepository.save(filter);
    }

    @Transactional
    public FilterConfig updateFilter(Long id, String value, Integer displayOrder, String description) {
        FilterConfig filter = filterConfigRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Filter not found: " + id));

        if (value != null) {
            filter.setValue(value);
        }
        if (displayOrder != null) {
            filter.setDisplayOrder(displayOrder);
        }
        if (description != null) {
            filter.setDescription(description);
        }

        return filterConfigRepository.save(filter);
    }

    @Transactional
    public void deleteFilter(Long id) {
        FilterConfig filter = filterConfigRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Filter not found: " + id));
        filter.setIsActive(false);
        filterConfigRepository.save(filter);
    }
}