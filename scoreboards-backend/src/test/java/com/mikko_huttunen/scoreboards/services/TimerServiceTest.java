package com.mikko_huttunen.scoreboards.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link TimerService}.
 */
class TimerServiceTest {

    private TimerService timerService;

    @BeforeEach
    void setUp() {
        timerService = new TimerService();
    }

    @Test
    void getRemainingTime_returnsZeroForUnknownUser() {
        Duration remaining = timerService.getRemainingTime("unknown-user");

        assertEquals(Duration.ZERO, remaining);
    }

    @Test
    void startTimer_thenGetRemainingTime_returnsPositiveDurationWithinBound() {
        timerService.startTimer("user-1", 60);

        Duration remaining = timerService.getRemainingTime("user-1");

        assertFalse(remaining.isNegative());
        assertFalse(remaining.isZero());
        assertTrue(remaining.getSeconds() <= 60);
    }

    @Test
    void getRemainingTime_returnsZeroAndRemovesExpiredTimer() {
        timerService.startTimer("user-2", -10); // already in the past

        Duration first = timerService.getRemainingTime("user-2");
        assertEquals(Duration.ZERO, first);

        // Subsequent call still returns zero (timer removed internally)
        Duration second = timerService.getRemainingTime("user-2");
        assertEquals(Duration.ZERO, second);
    }

    @Test
    void startTimer_resetsExistingTimer() {
        timerService.startTimer("user-3", 10);
        timerService.startTimer("user-3", 120);

        Duration remaining = timerService.getRemainingTime("user-3");

        assertTrue(remaining.getSeconds() > 60);
    }

    @Test
    void cancelTimer_removesTimer() {
        timerService.startTimer("user-4", 60);
        timerService.cancelTimer("user-4");

        assertEquals(Duration.ZERO, timerService.getRemainingTime("user-4"));
    }

    @Test
    void cancelTimer_onUnknownUser_doesNotThrow() {
        assertDoesNotThrow(() -> timerService.cancelTimer("no-such-user"));
    }
}
