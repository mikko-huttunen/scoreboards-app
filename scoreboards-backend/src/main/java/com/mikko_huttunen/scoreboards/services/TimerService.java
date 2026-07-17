package com.mikko_huttunen.scoreboards.services;

import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TimerService {

    private final Map<String, Instant> userTimers = new ConcurrentHashMap<>();

    /**
     * Starts or resets a timer for a specific user.
     * @param userId The unique user identifier.
     * @param durationSeconds How long the timer should last in seconds.
     */
    public void startTimer(String userId, long durationSeconds) {
        Instant targetTime = Instant.now().plusSeconds(durationSeconds);
        userTimers.put(userId, targetTime);
    }

    /**
     * Checks the remaining time for a user.
     * @param userId The unique user identifier.
     * @return Duration remaining. Returns zero or negative if the timer expired.
     */
    public Duration getRemainingTime(String userId) {
        Instant targetTime = userTimers.get(userId);

        if (targetTime == null) {
            return Duration.ZERO;
        }

        Instant now = Instant.now();
        Duration remaining = Duration.between(now, targetTime);

        if (remaining.isNegative() || remaining.isZero()) {
            userTimers.remove(userId);
            return Duration.ZERO;
        }

        return remaining;
    }

    /**
     * Optionally stops/cancels the timer manually.
     */
    public void cancelTimer(String userId) {
        userTimers.remove(userId);
    }
}
