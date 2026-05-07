package com.pod.repository;

import com.pod.entity.ScrollNotice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScrollNoticeRepository extends JpaRepository<ScrollNotice, Long> {

    Page<ScrollNotice> findByContentContainingIgnoreCase(String keyword, Pageable pageable);

    List<ScrollNotice> findByStatusOrderByCreatedAtDesc(Integer status);

    @Query("SELECT s FROM ScrollNotice s WHERE s.status = 1 ORDER BY s.createdAt DESC")
    List<ScrollNotice> findAllEnabled();
}