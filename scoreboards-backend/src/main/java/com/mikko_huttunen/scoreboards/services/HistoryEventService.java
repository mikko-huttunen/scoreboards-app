package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.Constants;
import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.enums.HistoryAction;
import com.mikko_huttunen.scoreboards.enums.StatType;
import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class HistoryEventService {

    private static final Logger logger = LoggerFactory.getLogger(HistoryEventService.class);
    private static final int PAGE_SIZE = 10;

    private final QueryService queryService;
    private final CurrentUserContext currentUserContext;
    private final UserRepository userRepository;

    @Autowired
    public HistoryEventService(
            QueryService queryService,
            CurrentUserContext currentUserContext,
            UserRepository userRepository) {
        this.queryService = queryService;
        this.currentUserContext = currentUserContext;
        this.userRepository = userRepository;
    }

    public Page<HistoryEvent> getHistoryEvents(String scoreboardId, int page) {
        logger.info("Fetching history events for scoreboard: {}, page: {}", scoreboardId, page);

        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(
                safePage,
                PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, "created")
        );

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));

        List<HistoryEvent> events = queryService.findPage(query, HistoryEvent.class, false, pageable);
        long total = queryService.count(
                new Query(Criteria.where("scoreboardId").is(scoreboardId)),
                HistoryEvent.class,
                false
        );

        resolveCreatedByNames(events);

        logger.info("Found {} history events for scoreboard: {}, page: {}", events.size(), scoreboardId, safePage);
        return new PageImpl<>(events, pageable, total);
    }

    /**
     * Scoreboard edit details (diffs), similar style to session update:
     * details will contain only changed fields.
     * Included:
     * - name: [oldName, newName]
     * - pointCategories: per point category id: { name: [old,new], color: [old,new] }
     * - settings: diffs for defaultStatType and statTypes
     */
    @Transactional
    public HistoryEvent createScoreboardEditEvent(
            String scoreboardId,
            String entityName,
            Scoreboard existingScoreboard,
            ScoreboardDTO updatedScoreboardDTO,
            List<PointCategory> existingPointCategories,
            List<PointCategory> createdPointCategories
    ) {
        if (existingScoreboard == null || updatedScoreboardDTO == null) {
            throw new IllegalArgumentException("existingScoreboard and updatedScoreboardDTO cannot be null");
        }

        Map<String, Object> details = new LinkedHashMap<>();

        String oldName = existingScoreboard.getName();
        String newName = updatedScoreboardDTO.getName() == null ? null : updatedScoreboardDTO.getName().trim();
        if (newName != null && !Objects.equals(oldName, newName)) {
            details.put("name", List.of(String.valueOf(oldName), String.valueOf(newName)));
        }

        Map<String, Object> pcDetails = buildPointCategoriesEditDetails(
                existingPointCategories,
                updatedScoreboardDTO.getPointCategories(),
                createdPointCategories
        );
        if (!pcDetails.isEmpty()) {
            details.put("pointCategories", pcDetails);
        }

        ScoreboardSettings oldSettings = existingScoreboard.getSettings();
        ScoreboardSettings newSettings = updatedScoreboardDTO.getSettings();
        Map<String, Object> settingsDetails = buildChangedScoreboardSettingsDetails(oldSettings, newSettings);
        if (!settingsDetails.isEmpty()) {
            details.put("settings", settingsDetails);
        }

        return createHistoryEvent(
                scoreboardId,
                HistoryAction.EDIT,
                Constants.Types.SCOREBOARD,
                scoreboardId,
                entityName,
                details
        );
    }

    /**
     * Session edit details are built here (history service), from old vs new values.
     *
     * @param scoreboardId scoreboard ID
     * @param entityId session ID
     * @param entityName session name
     * @param existingSessionData old session data
     * @param updatedSessionData new session data
     */
    @Transactional
    public HistoryEvent createSessionEditEvent(
            String scoreboardId,
            String entityId,
            String entityName,
            SessionDTO existingSessionData,
            SessionDTO updatedSessionData
    ) {
        if (existingSessionData == null || updatedSessionData == null) {
            throw new IllegalArgumentException("existingSessionData and updatedSessionData cannot be null");
        }

        Map<String, Object> details = new LinkedHashMap<>();

        // name
        String oldName = existingSessionData.getName();
        String newName = updatedSessionData.getName();
        if (newName != null && !Objects.equals(oldName, newName)) {
            details.put("name", List.of(String.valueOf(oldName), String.valueOf(newName)));
        }

        // description
        String oldDescription = existingSessionData.getDescription();
        String newDescription = updatedSessionData.getDescription();
        if (newDescription != null && !Objects.equals(oldDescription, newDescription)) {
            details.put("description", List.of(String.valueOf(oldDescription), String.valueOf(newDescription)));
        }

        // tie breaker winner, recorded as usernames rather than raw user IDs
        String oldTieWinner = existingSessionData.getTieWinner();
        String newTieWinner = updatedSessionData.getTieWinner();
        if (!Objects.equals(oldTieWinner, newTieWinner)) {
            Set<String> tieWinnerIds = new HashSet<>();
            if (oldTieWinner != null) tieWinnerIds.add(oldTieWinner);
            if (newTieWinner != null) tieWinnerIds.add(newTieWinner);

            Map<String, String> tieWinnerUsernames = resolveUsernames(tieWinnerIds);

            details.put("tieWinner", List.of(
                    oldTieWinner == null ? "None" : tieWinnerUsernames.getOrDefault(oldTieWinner, oldTieWinner),
                    newTieWinner == null ? "None" : tieWinnerUsernames.getOrDefault(newTieWinner, newTieWinner)
            ));
        }

        // scores (changed only), computed using DTO snapshots (usernames + point category names, no ids)
        Map<String, Object> scoresDetails = buildChangedScoresFromSessionDTO(
                existingSessionData,
                updatedSessionData
        );
        if (!scoresDetails.isEmpty()) {
            details.put("scores", scoresDetails);
        }

        return createHistoryEvent(
                scoreboardId,
                HistoryAction.EDIT,
                Constants.Types.SESSION,
                entityId,
                entityName,
                details
        );
    }

    @Transactional
    public HistoryEvent createResultEntryHistoryEvent(
            HistoryAction action,
            ResultEntry resultEntry,
            Map<String, Object> scoreDetails
    ) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put(
                "resultEntry",
                "Result entry of user: " + resultEntry.getUserId()
                        + " to session: " + resultEntry.getSessionId()
        );

        if (scoreDetails != null && !scoreDetails.isEmpty()) {
            details.putAll(scoreDetails);
        }

        return createHistoryEvent(
                resultEntry.getScoreboardId(),
                action,
                Constants.Types.RESULT_ENTRY,
                resultEntry.getId(),
                null,
                details
        );
    }

    @Transactional
    public HistoryEvent createCommentHistoryEvent(HistoryAction action, Comment comment) {
        if (comment == null) {
            throw new IllegalArgumentException("comment cannot be null");
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("comment", comment.getComment());

        if (comment.getSessionId() != null) {
            details.put("sessionId", comment.getSessionId());
        }

        return createHistoryEvent(
                comment.getScoreboardId(),
                action,
                Constants.Types.COMMENT,
                comment.getId(),
                null,
                details
        );
    }

    public Map<String, Object> buildResultEntryDetails(Set<Result> results, Double totalPoints) {
        Map<String, Object> details = new LinkedHashMap<>();

        Set<String> pointCategoryIds = results == null
                ? Collections.emptySet()
                : results.stream()
                  .filter(Objects::nonNull)
                  .map(Result::getPointCategoryId)
                  .filter(Objects::nonNull)
                  .collect(Collectors.toSet());

        Map<String, String> pointCategoryNames = resolvePointCategoryNames(pointCategoryIds);

        if (results != null && !results.isEmpty()) {
            Map<String, Object> scores = new LinkedHashMap<>();

            results.stream()
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(Result::getPointCategoryId))
                    .forEach(result -> {
                        String pointCategoryId = result.getPointCategoryId();
                        String pointCategoryName = pointCategoryNames.getOrDefault(pointCategoryId, pointCategoryId);
                        scores.put(
                                pointCategoryName + " (" + pointCategoryId + ")",
                                result.getPoints() == null ? 0.0 : result.getPoints()
                        );
                    });

            details.put("scores", scores);
        }

        details.put("totalPoints", totalPoints == null ? 0.0 : totalPoints);
        return details;
    }

    private Map<String, Object> buildPointCategoriesEditDetails(
            List<PointCategory> existingPointCategories,
            List<PointCategoryDTO> updatedPointCategories,
            List<PointCategory> createdPointCategories
    ) {
        if (updatedPointCategories == null) return Collections.emptyMap();

        Map<String, Object> result = new LinkedHashMap<>();

        Map<String, PointCategory> oldById = new HashMap<>();
        if (existingPointCategories != null) {
            for (PointCategory pc : existingPointCategories) {
                if (pc == null || pc.getId() == null) continue;
                oldById.put(pc.getId(), pc);
            }
        }

        List<PointCategoryDTO> createdDtos = updatedPointCategories.stream()
                .filter(Objects::nonNull)
                .filter(dto -> dto.getId() == null || dto.getId().trim().isEmpty())
                .toList();

        for (int i = 0; i < createdDtos.size(); i++) {
            PointCategoryDTO dto = createdDtos.get(i);
            PointCategory createdPc = createdPointCategories != null && createdPointCategories.size() > i
                    ? createdPointCategories.get(i)
                    : null;

            String createdId = createdPc != null && createdPc.getId() != null
                    ? createdPc.getId()
                    : UUID.randomUUID().toString();

            Map<String, Object> createdDetails = new LinkedHashMap<>();
            createdDetails.put("changeType", "created");
            createdDetails.put("displayName", dto.getName() + " (" + createdId + ")");
            createdDetails.put("name", dto.getName());
            createdDetails.put("color", dto.getColor());

            result.put(createdId, createdDetails);
        }

        Set<String> updatedIds = updatedPointCategories.stream()
                .filter(Objects::nonNull)
                .map(PointCategoryDTO::getId)
                .filter(id -> id != null && !id.trim().isEmpty())
                .collect(Collectors.toSet());

        for (PointCategoryDTO dto : updatedPointCategories) {
            if (dto == null) continue;

            String id = dto.getId();
            if (id == null || id.trim().isEmpty()) continue;

            PointCategory oldPc = oldById.get(id);
            if (oldPc == null) continue;

            String oldPcName = oldPc.getName();
            String newPcName = dto.getName();

            String oldPcColor = oldPc.getColor();
            String newPcColor = dto.getColor();

            boolean nameChanged = newPcName != null && !Objects.equals(oldPcName, newPcName);
            boolean colorChanged = newPcColor != null && !Objects.equals(oldPcColor, newPcColor);

            if (!nameChanged && !colorChanged) continue;

            Map<String, Object> perPc = new LinkedHashMap<>();
            perPc.put("changeType", "edited");
            perPc.put("displayName", (nameChanged ? newPcName : oldPcName) + " (" + id + ")");

            if (nameChanged) {
                perPc.put("name", Arrays.asList(oldPcName, newPcName));
            } else {
                perPc.put("name", oldPcName);
            }

            if (colorChanged) {
                perPc.put("color", Arrays.asList(oldPcColor, newPcColor));
            }

            result.put(id, perPc);
        }

        if (existingPointCategories != null) {
            for (PointCategory oldPc : existingPointCategories) {
                if (oldPc == null || oldPc.getId() == null) continue;
                if (updatedIds.contains(oldPc.getId())) continue;

                Map<String, Object> deletedPc = new LinkedHashMap<>();
                deletedPc.put("changeType", "deleted");
                deletedPc.put("displayName", oldPc.getName() + " (" + oldPc.getId() + ")");
                deletedPc.put("name", oldPc.getName());
                deletedPc.put("color", oldPc.getColor());

                result.put(oldPc.getId(), deletedPc);
            }
        }

        return result;
    }

    private Map<String, Object> buildChangedScoreboardSettingsDetails(
            ScoreboardSettings oldSettings,
            ScoreboardSettings newSettings
    ) {
        if (oldSettings == null && newSettings == null) return Collections.emptyMap();
        if (newSettings == null) return Collections.emptyMap();

        Map<String, Object> details = new LinkedHashMap<>();

        StatType oldDefault = oldSettings == null ? null : oldSettings.getDefaultStatType();
        StatType newDefault = newSettings.getDefaultStatType();
        if (newDefault != null && !Objects.equals(oldDefault, newDefault)) {
            details.put("defaultStatType", Arrays.asList(
                    oldDefault == null ? null : formatStatType(oldDefault),
                    formatStatType(newDefault)
            ));
        }

        List<StatType> oldStatTypes = oldSettings == null ? null : oldSettings.getStatTypes();
        List<StatType> newStatTypes = newSettings.getStatTypes();

        if (newStatTypes != null && !Objects.equals(oldStatTypes, newStatTypes)) {
            List<String> oldNames = oldStatTypes == null
                    ? Collections.emptyList()
                    : oldStatTypes.stream().map(this::formatStatType).toList();

            List<String> newNames = newStatTypes.stream().map(this::formatStatType).toList();

            details.put("statTypes", Arrays.asList(oldNames, newNames));
        }

        return details;
    }

    private String formatStatType(StatType statType) {
        if (statType == null) return null;

        return Arrays.stream(statType.name().toLowerCase().split("_"))
                .map(part -> part.isEmpty()
                        ? part
                        : Character.toUpperCase(part.charAt(0)) + part.substring(1))
                .collect(Collectors.joining(" "));
    }

    private Map<String, Object> buildChangedScoresFromSessionDTO(
            SessionDTO existingSessionData,
            SessionDTO updatedSessionData
    ) {
        Map<String, Double> oldPointsByUserAndCategory = extractPoints(existingSessionData);
        Map<String, Double> newPointsByUserAndCategory = extractPoints(updatedSessionData);

        Set<String> allKeys = new HashSet<>();
        allKeys.addAll(oldPointsByUserAndCategory.keySet());
        allKeys.addAll(newPointsByUserAndCategory.keySet());

        Map<String, double[]> changedPairs = new LinkedHashMap<>();
        Set<String> userIds = new HashSet<>();
        Set<String> pcIds = new HashSet<>();

        for (String key : allKeys) {
            String[] parts = key.split("\\|", -1);
            if (parts.length != 2) continue;

            double oldVal = oldPointsByUserAndCategory.getOrDefault(key, 0.0);
            double newVal = newPointsByUserAndCategory.getOrDefault(key, 0.0);

            if (Double.compare(oldVal, newVal) == 0) continue;

            String userId = parts[0];
            String pcId = parts[1];

            changedPairs.put(key, new double[]{oldVal, newVal});
            userIds.add(userId);
            pcIds.add(pcId);
        }

        Map<String, Double> oldTotalsByUser = extractTotalsByUser(existingSessionData);
        Map<String, Double> newTotalsByUser = extractTotalsByUser(updatedSessionData);

        Set<String> allUserIds = new HashSet<>();
        allUserIds.addAll(oldTotalsByUser.keySet());
        allUserIds.addAll(newTotalsByUser.keySet());
        userIds.addAll(allUserIds);

        if (changedPairs.isEmpty() && allUserIds.stream().noneMatch(userId ->
                Double.compare(
                        oldTotalsByUser.getOrDefault(userId, 0.0),
                        newTotalsByUser.getOrDefault(userId, 0.0)
                ) != 0)) {
            return Collections.emptyMap();
        }

        Map<String, String> userIdToUsername = resolveUsernames(userIds);
        Map<String, String> pcIdToCategoryName = resolvePointCategoryNames(pcIds);

        Map<String, Object> scores = new LinkedHashMap<>();

        for (Map.Entry<String, double[]> e : changedPairs.entrySet()) {
            String[] parts = e.getKey().split("\\|", -1);
            String userId = parts[0];
            String pcId = parts[1];

            String username = userIdToUsername.getOrDefault(userId, userId);
            String pointCategoryName = pcIdToCategoryName.getOrDefault(pcId, pcId);

            @SuppressWarnings("unchecked")
            Map<String, Object> userScores = (Map<String, Object>) scores.computeIfAbsent(
                    username,
                    k -> new LinkedHashMap<String, Object>()
            );

            double oldScore = e.getValue()[0];
            double newScore = e.getValue()[1];

            userScores.put(pointCategoryName, Arrays.asList(oldScore, newScore));
        }

        for (String userId : allUserIds) {
            double oldTotal = oldTotalsByUser.getOrDefault(userId, 0.0);
            double newTotal = newTotalsByUser.getOrDefault(userId, 0.0);

            if (Double.compare(oldTotal, newTotal) == 0) continue;

            String username = userIdToUsername.getOrDefault(userId, userId);

            @SuppressWarnings("unchecked")
            Map<String, Object> userScores = (Map<String, Object>) scores.computeIfAbsent(
                    username,
                    k -> new LinkedHashMap<String, Object>()
            );

            userScores.put("Total score", Arrays.asList(oldTotal, newTotal));
        }

        return scores;
    }

    public Map<String, Object> buildSessionDetails(
            String sessionName,
            String description,
            Set<String> participantIds,
            Set<String> pointCategoryIds
    ) {
        Map<String, Object> details = new LinkedHashMap<>();

        if (sessionName != null && !sessionName.trim().isEmpty()) {
            details.put("name", sessionName);
        }

        if (description != null && !description.trim().isEmpty()) {
            details.put("description", description);
        }

        if (participantIds != null && !participantIds.isEmpty()) {
            Map<String, String> usernames = resolveUsernames(participantIds);
            Map<String, Object> participants = new LinkedHashMap<>();

            participantIds.stream()
                    .sorted()
                    .forEach(userId -> participants.put(
                            usernames.getOrDefault(userId, userId) + " (" + userId + ")",
                            true
                    ));

            details.put("participants", participants);
        }

        if (pointCategoryIds != null && !pointCategoryIds.isEmpty()) {
            Map<String, String> pointCategoryNames = resolvePointCategoryNames(pointCategoryIds);
            Map<String, Object> pointCategories = new LinkedHashMap<>();

            pointCategoryIds.stream()
                    .sorted()
                    .forEach(pointCategoryId -> pointCategories.put(
                            pointCategoryNames.getOrDefault(pointCategoryId, pointCategoryId)
                                    + " (" + pointCategoryId + ")",
                            true
                    ));

            details.put("pointCategories", pointCategories);
        }

        return details;
    }

    private Map<String, Double> extractPoints(SessionDTO sessionData) {
        if (sessionData == null || sessionData.getResultEntryDetails() == null) {
            return Collections.emptyMap();
        }

        Map<String, Double> pointsByUserAndCategory = new HashMap<>();

        for (ResultEntry entry : sessionData.getResultEntryDetails()) {
            if (entry == null || entry.getResults() == null) continue;

            String userId = entry.getUserId();
            for (Result r : entry.getResults()) {
                if (r == null) continue;

                String pcId = r.getPointCategoryId();
                double points = r.getPoints() == null ? 0.0 : r.getPoints();

                pointsByUserAndCategory.put(userId + "|" + pcId, points);
            }
        }

        return pointsByUserAndCategory;
    }

    private Map<String, Double> extractTotalsByUser(SessionDTO sessionData) {
        if (sessionData == null || sessionData.getResultEntryDetails() == null) {
            return Collections.emptyMap();
        }

        Map<String, Double> totalsByUser = new HashMap<>();

        for (ResultEntry entry : sessionData.getResultEntryDetails()) {
            if (entry == null || entry.getUserId() == null) continue;
            totalsByUser.put(entry.getUserId(), entry.getTotalPoints() == null ? 0.0 : entry.getTotalPoints());
        }

        return totalsByUser;
    }

    private Map<String, String> resolveUsernames(Set<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return Collections.emptyMap();

        List<User> users = userRepository.findByIdIn(userIds);

        return users.stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));
    }

    private void resolveCreatedByNames(List<HistoryEvent> events) {
        Set<String> userIds = events.stream()
                .map(HistoryEvent::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) {
            return;
        }

        List<User> users = userRepository.findByIdIn(userIds);

        Map<String, String> usernameById = users.stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));

        events.forEach(event -> event.setCreatedByName(usernameById.get(event.getCreatedBy())));
    }

    private Map<String, String> resolvePointCategoryNames(Set<String> pcIds) {
        if (pcIds == null || pcIds.isEmpty()) return Collections.emptyMap();

        Query pcsQuery = new Query(Criteria.where("_id").in(pcIds));
        List<PointCategory> pcs = queryService.find(pcsQuery, PointCategory.class, false);

        return pcs.stream().collect(Collectors.toMap(PointCategory::getId, PointCategory::getName, (a, b) -> a));
    }

    @Transactional
    public HistoryEvent createSubmitResultEvent(
            String scoreboardId,
            String sessionId,
            String sessionName,
            Map<String, List<String>> submittedScores) {
        return createHistoryEvent(
                scoreboardId,
                HistoryAction.CREATE,
                Constants.Types.SESSION,
                sessionId,
                sessionName,
                sanitizeDetails(submittedScores)
        );
    }

    @Transactional
    public void deleteHistoryEventsByScoreboardId(String scoreboardId) {
        logger.info("Deleting all history events for scoreboard: {}", scoreboardId);

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        queryService.delete(query, HistoryEvent.class);

        logger.info("Deleted all history events for scoreboard: {}", scoreboardId);
    }

    public HistoryEvent createHistoryEvent(
            String scoreboardId,
            HistoryAction action,
            String entity,
            String entityId,
            String entityName,
            Map<String, Object> details) {

        User currentUser = currentUserContext.requireCurrentUser();

        HistoryEvent event = new HistoryEvent();
        event.setScoreboardId(scoreboardId);
        event.setAction(action);
        event.setEntity(entity);
        event.setEntityId(entityId);
        event.setEntityName(entityName);
        event.setDetails(details == null ? Collections.emptyMap() : details);

        HistoryEvent created = queryService.create(event);
        created.setCreatedByName(currentUser.getName());

        logger.info("Created history event: {} for scoreboard: {}", created.getId(), scoreboardId);
        return created;
    }

    private Map<String, Object> sanitizeDetails(Map<String, List<String>> details) {
        if (details == null || details.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();

        details.forEach((key, value) -> {
            if (key == null || value == null) {
                return;
            }

            String normalizedKey = key.trim();
            if (normalizedKey.isEmpty()) {
                return;
            }

            if (normalizedKey.equalsIgnoreCase("id")
                    || normalizedKey.equalsIgnoreCase("created")
                    || normalizedKey.equalsIgnoreCase("lastmodified")
                    || normalizedKey.equalsIgnoreCase("createdby")
                    || normalizedKey.equalsIgnoreCase("isactive")
                    || normalizedKey.equalsIgnoreCase("type")) {
                return;
            }

            sanitized.put(normalizedKey, value);
        });

        return sanitized;
    }
}