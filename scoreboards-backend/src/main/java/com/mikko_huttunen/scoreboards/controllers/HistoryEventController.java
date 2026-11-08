package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.HistoryEvent;
import com.mikko_huttunen.scoreboards.services.HistoryEventService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/history")
public class HistoryEventController {

    private static final Logger logger = LoggerFactory.getLogger(HistoryEventController.class);

    private final HistoryEventService historyService;

    @Autowired
    public HistoryEventController(HistoryEventService historyEventService) {
        this.historyService = historyEventService;
    }

    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<Page<HistoryEvent>> getHistoryEvents(
            @PathVariable String scoreboardId,
            @RequestParam(value = "page", defaultValue = "0") int page) {
        logger.info("GET /api/history/scoreboard/{} - Fetching history events, page: {}", scoreboardId, page);

        Page<HistoryEvent> events = historyService.getHistoryEvents(scoreboardId, page);

        return ResponseEntity.status(HttpStatus.OK).body(events);
    }
}