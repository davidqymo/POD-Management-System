package com.pod.controller;

import com.pod.entity.Rate;
import com.pod.service.RateService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * RateController — REST API for Rate CRUD operations.
 *
 * T1.5: Endpoints:
 *   - GET /api/v1/rates — list all rates
 *   - GET /api/v1/rates/active — get active rate for cost center + team
 *   - POST /api/v1/rates — create new rate with contiguity validation
 *   - GET /api/v1/rates/{id} — get by ID
 */
@RestController
@RequestMapping("/api/v1/rates")
public class RateController {

    private final RateService rateService;

    public RateController(RateService rateService) {
        this.rateService = rateService;
    }

    @GetMapping
    public List<Rate> getAll() {
        return rateService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Rate> getById(@PathVariable Long id) {
        return rateService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<Rate> getActiveRate(
            @RequestParam String costCenterId,
            @RequestParam String billableTeamCode) {
        return rateService.findActiveRate(costCenterId, billableTeamCode)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody RateService.CreateRateRequest request) {
        try {
            Rate saved = rateService.createRate(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "RATE_VALIDATION_ERROR",
                "message", e.getMessage()
            ));
        }
    }
}