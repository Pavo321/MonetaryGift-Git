package com.mysteriousmonkeys.chanlo.dashboard;

import com.mysteriousmonkeys.chanlo.dto.DashboardResponse;
import com.mysteriousmonkeys.chanlo.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardResource {

    private final DashboardService dashboardService;

    public DashboardResource(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(@RequestParam String token) {
        try {
            DashboardResponse response = dashboardService.getDashboardByToken(token);
            return ResponseEntity.ok(response);
        } catch (DashboardService.InvalidTokenException e) {
            return ResponseEntity.status(401).build();
        }
    }
}
