package com.pod.repository;

import com.pod.entity.FilterConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FilterConfigRepository extends JpaRepository<FilterConfig, Long> {
    List<FilterConfig> findByCategoryOrderByDisplayOrderAsc(String category);
    List<FilterConfig> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(String category);
    List<FilterConfig> findByIsActiveTrueOrderByCategoryAscDisplayOrderAsc();
}