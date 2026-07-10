package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class AccessControlValidator {

    private final CurrentUserContext currentUserContext;
    private User currentUser;

    public AccessControlValidator(CurrentUserContext currentUserContext) {
        this.currentUserContext = currentUserContext;
    }

    public void validateReadAccess(Object document) {
        validateAccess(document, false);
    }

    public void validateWriteAccess(Object document) {
        validateAccess(document, false);
    }

    public void validateDeleteAccess(Object document) {
        validateAccess(document, true);
    }

    public <T> void validateReadAccess(Collection<T> documents) {
        documents.forEach(this::validateReadAccess);
    }

    private void validateAccess(Object document, boolean requireCreator) {
        if (document == null) {
            throw new IllegalArgumentException("Document cannot be null");
        }

        currentUser = currentUserContext.requireCurrentUser();

        if (document instanceof User requestedUser) {
            validateUserAccess(requestedUser, requireCreator);
            return;
        }

        if (document instanceof Scoreboard scoreboard) {
            validateScoreboardAccess(scoreboard, requireCreator);
            return;
        }

        if (document instanceof Membership membership) {
            validateMembershipAccess(membership);
            return;
        }

        if (document instanceof PointCategory pointCategory) {
            validatePointCategoryAccess(pointCategory);
            return;
        }

        if (document instanceof Session session) {
            validateSessionAccess(session, requireCreator);
            return;
        }

        if (document instanceof SessionDTO sessionDTO) {
            validateSessionDTOAccess(sessionDTO);
            return;
        }

        if (document instanceof ResultEntry resultEntry) {
            validateResultEntryAccess(resultEntry, requireCreator);
            return;
        }

        if (document instanceof Invitation invitation) {
            validateInvitationAccess(invitation);
            return;
        }

        throw new IllegalArgumentException("Unsupported MongoDB document type: " + document.getClass().getSimpleName());
    }

    private void validateUserAccess(User requestedUser, boolean requireCreator) {
        boolean isCurrentUser = Objects.equals(currentUser.getId(), requestedUser.getId());
        if (requireCreator) {
            if (isCurrentUser) return;
            throw new AccessDeniedException("User is not authorized to access this user");
        }

        if (isCurrentUser) return;

        Set<String> currentUserScoreboardIds = currentUser.getMemberships().stream()
                .map(Membership::getScoreboardId).collect(Collectors.toSet());
        Set<String> requestedUserScoreboardIds = requestedUser.getMemberships().stream()
                .map(Membership::getScoreboardId).collect(Collectors.toSet());

        boolean shareAnyScoreboards = currentUserScoreboardIds.stream().anyMatch(requestedUserScoreboardIds::contains);

        if (shareAnyScoreboards) return;
        throw new AccessDeniedException("User is not authorized to access this user");
    }

    private void validateScoreboardAccess(Scoreboard scoreboard, boolean requireCreator) {
        boolean isCreator = isCreator(scoreboard.getCreatedBy());
        if (requireCreator) {
            if (isCreator) return;
            throw new AccessDeniedException("User is not authorized to access this scoreboard");
        }

        if (isCreator) return;
        if (hasMembership(scoreboard.getId())) return;
        throw new AccessDeniedException("User is not authorized to access this scoreboard");
    }

    private void validateMembershipAccess(Membership membership) {
        boolean isCreator = isCreator(membership.getCreatedBy());
        if (isCreator) return;
        boolean hasPermission = hasPermission(membership.getScoreboardId(), Permission.OWNER);
        if (hasPermission) return;
        if (hasMembership(membership.getScoreboardId())) return;
        throw new AccessDeniedException("User is not authorized to access this scoreboard");
    }

    private void validatePointCategoryAccess(PointCategory pointCategory) {
        if (isCreator(pointCategory.getCreatedBy())) return;
        if (hasMembership(pointCategory.getScoreboardId())) return;
        throw new AccessDeniedException("User is not authorized to access this point category");
    }

    private void validateSessionAccess(Session session, boolean requireCreator) {
        boolean hasPermission = hasPermission(session.getScoreboardId(), Permission.SESSIONS);
        if (requireCreator) {
            if (isCreator(session.getCreatedBy())) return;
            if (hasPermission) return;
            throw new AccessDeniedException("User is not authorized to access this session");
        }

        if (hasPermission) return;
        if (hasMembership(session.getScoreboardId())) {
            boolean isParticipant = session.getParticipants().contains(currentUser.getId());
            if (isParticipant) return;
        }

        throw new AccessDeniedException("User is not authorized to access this session");
    }

    private void validateSessionDTOAccess(SessionDTO session) {
        boolean hasPermission = hasPermission(session.getScoreboardId(), Permission.SESSIONS);
        if (hasPermission) return;

        if (hasMembership(session.getScoreboardId())) {
            boolean isParticipant = session.getParticipants().contains(currentUser.getId());
            if (isParticipant) return;
        }

        throw new AccessDeniedException("User is not authorized to access this session");
    }

    private void validateResultEntryAccess(ResultEntry resultEntry, boolean requireCreator) {
        boolean isCreator = isCreator(resultEntry.getCreatedBy());
        boolean hasPermission = hasPermission(resultEntry.getScoreboardId(), Permission.SESSIONS);
        boolean isUser = Objects.equals(resultEntry.getUserId(), currentUser.getId());
        if (requireCreator) {
            if (isCreator) return;
            if (hasPermission) return;
            if (isUser) return;
            throw new AccessDeniedException("User is not authorized to access this result entry");
        }

        boolean isMember = hasMembership(resultEntry.getScoreboardId());

        if (isMember || isUser || hasPermission || isCreator) return;

        throw new AccessDeniedException("User is not authorized to access this result entry");
    }

    private void validateInvitationAccess(Invitation invitation) {
        if (isCreator(invitation.getCreatedBy()) && hasMembership(invitation.getScoreboardId())) return;

        boolean isReceiver = Objects.equals(invitation.getReceiverId(), currentUser.getId());
        if (isReceiver) return;

        throw new AccessDeniedException("User is not authorized to access this invitation");
    }

    private boolean hasMembership(String scoreboardId) {
        return currentUser.getMemberships().stream().anyMatch(ms ->
                Objects.equals(ms.getScoreboardId(), scoreboardId));
    }

    private boolean hasPermission(String scoreboardId, Permission permission) {
        return currentUser.getMemberships().stream().anyMatch(ms ->
                Objects.equals(ms.getScoreboardId(), scoreboardId) &&
                        (ms.getPermissions().contains(permission)) || ms.getPermissions().contains(Permission.OWNER));
    }

    private boolean isCreator(String createdById) {
        return Objects.equals(createdById, currentUser.getId());
    }
}