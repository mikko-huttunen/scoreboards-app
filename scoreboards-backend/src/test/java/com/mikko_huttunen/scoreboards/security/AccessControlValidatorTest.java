package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AccessControlValidator}.
 */
@ExtendWith(MockitoExtension.class)
class AccessControlValidatorTest {

    @Mock
    private CurrentUserContext currentUserContext;

    @InjectMocks
    private AccessControlValidator validator;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId("user-1");
        // Member of sb-1 with SESSIONS permission (not OWNER)
        currentUser.setMemberships(Set.of(membership("sb-1", "user-1", Set.of(Permission.SESSIONS))));
    }

    private Membership membership(String scoreboardId, String userId, Set<Permission> perms) {
        Membership m = new Membership();
        m.setScoreboardId(scoreboardId);
        m.setUserId(userId);
        m.setPermissions(perms);
        return m;
    }

    private void loggedIn() {
        when(currentUserContext.requireCurrentUser()).thenReturn(currentUser);
    }

    // ---------------------------------------------------------------------
    // null / unsupported
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_throwsForNull() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validateReadAccess((Object) null));
        assertEquals("Document cannot be null", ex.getMessage());
    }

    @Test
    void validateReadAccess_throwsForUnsupportedType() {
        loggedIn();
        assertThrows(IllegalArgumentException.class,
                () -> validator.validateReadAccess("a plain string"));
    }

    // ---------------------------------------------------------------------
    // User
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_userSelfAllowed() {
        loggedIn();
        User self = new User();
        self.setId("user-1");

        assertDoesNotThrow(() -> validator.validateReadAccess(self));
    }

    @Test
    void validateReadAccess_userSharingScoreboardAllowed() {
        loggedIn();
        User other = new User();
        other.setId("user-2");
        other.setMemberships(Set.of(membership("sb-1", "user-2", Set.of())));

        assertDoesNotThrow(() -> validator.validateReadAccess(other));
    }

    @Test
    void validateReadAccess_userNoSharedScoreboardDenied() {
        loggedIn();
        User other = new User();
        other.setId("user-2");
        other.setMemberships(Set.of(membership("sb-99", "user-2", Set.of())));

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(other));
    }

    // ---------------------------------------------------------------------
    // Scoreboard
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_scoreboardMemberAllowed() {
        loggedIn();
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(sb));
    }

    @Test
    void validateReadAccess_scoreboardCreatorAllowed() {
        loggedIn();
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-99");
        sb.setCreatedBy("user-1");

        assertDoesNotThrow(() -> validator.validateReadAccess(sb));
    }

    @Test
    void validateReadAccess_scoreboardNonMemberDenied() {
        loggedIn();
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-99");
        sb.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(sb));
    }

    @Test
    void validateDeleteAccess_scoreboardRequiresCreator() {
        loggedIn();
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1"); // member but not creator
        sb.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateDeleteAccess(sb));
    }

    // ---------------------------------------------------------------------
    // Membership
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_membershipMemberAllowed() {
        loggedIn();
        Membership m = membership("sb-1", "user-2", Set.of());
        m.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(m));
    }

    @Test
    void validateReadAccess_membershipNonMemberDenied() {
        loggedIn();
        Membership m = membership("sb-99", "user-2", Set.of());
        m.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(m));
    }

    // ---------------------------------------------------------------------
    // PointCategory
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_pointCategoryMemberAllowed() {
        loggedIn();
        PointCategory pc = new PointCategory();
        pc.setScoreboardId("sb-1");
        pc.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(pc));
    }

    @Test
    void validateReadAccess_pointCategoryNonMemberDenied() {
        loggedIn();
        PointCategory pc = new PointCategory();
        pc.setScoreboardId("sb-99");
        pc.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(pc));
    }

    // ---------------------------------------------------------------------
    // Session
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_sessionWithPermissionAllowed() {
        loggedIn();
        Session session = new Session();
        session.setScoreboardId("sb-1"); // has SESSIONS permission
        session.setParticipants(Set.of());

        assertDoesNotThrow(() -> validator.validateReadAccess(session));
    }

    @Test
    void validateReadAccess_sessionMemberParticipantAllowed() {
        // current user is member of sb-3 without SESSIONS perm, but is a participant
        currentUser.setMemberships(Set.of(membership("sb-3", "user-1", Set.of())));
        loggedIn();

        Session session = new Session();
        session.setScoreboardId("sb-3");
        session.setParticipants(Set.of("user-1"));

        assertDoesNotThrow(() -> validator.validateReadAccess(session));
    }

    @Test
    void validateReadAccess_sessionNonMemberDenied() {
        currentUser.setMemberships(Set.of(membership("sb-3", "user-1", Set.of())));
        loggedIn();

        Session session = new Session();
        session.setScoreboardId("sb-99");
        session.setParticipants(Set.of());

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(session));
    }

    // ---------------------------------------------------------------------
    // SessionDTO
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_sessionDtoWithPermissionAllowed() {
        loggedIn();
        SessionDTO dto = new SessionDTO();
        dto.setScoreboardId("sb-1");
        dto.setParticipants(Set.of());

        assertDoesNotThrow(() -> validator.validateReadAccess(dto));
    }

    @Test
    void validateReadAccess_sessionDtoNonMemberDenied() {
        currentUser.setMemberships(Set.of(membership("sb-3", "user-1", Set.of())));
        loggedIn();
        SessionDTO dto = new SessionDTO();
        dto.setScoreboardId("sb-99");
        dto.setParticipants(Set.of());

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(dto));
    }

    // ---------------------------------------------------------------------
    // ResultEntry
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_resultEntryMemberAllowed() {
        loggedIn();
        ResultEntry re = new ResultEntry();
        re.setScoreboardId("sb-1");
        re.setUserId("user-2");
        re.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(re));
    }

    @Test
    void validateReadAccess_resultEntryOwnUserAllowed() {
        currentUser.setMemberships(Set.of(membership("sb-3", "user-1", Set.of())));
        loggedIn();
        ResultEntry re = new ResultEntry();
        re.setScoreboardId("sb-99");
        re.setUserId("user-1"); // is the user
        re.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(re));
    }

    @Test
    void validateReadAccess_resultEntryUnrelatedDenied() {
        currentUser.setMemberships(Set.of(membership("sb-3", "user-1", Set.of())));
        loggedIn();
        ResultEntry re = new ResultEntry();
        re.setScoreboardId("sb-99");
        re.setUserId("user-2");
        re.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(re));
    }

    // ---------------------------------------------------------------------
    // Invitation
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_invitationReceiverAllowed() {
        loggedIn();
        Invitation invitation = new Invitation();
        invitation.setScoreboardId("sb-99");
        invitation.setReceiverId("user-1"); // is receiver
        invitation.setCreatedBy("someone");

        assertDoesNotThrow(() -> validator.validateReadAccess(invitation));
    }

    @Test
    void validateReadAccess_invitationCreatorMemberAllowed() {
        loggedIn();
        Invitation invitation = new Invitation();
        invitation.setScoreboardId("sb-1"); // member
        invitation.setReceiverId("user-2");
        invitation.setCreatedBy("user-1"); // creator

        assertDoesNotThrow(() -> validator.validateReadAccess(invitation));
    }

    @Test
    void validateReadAccess_invitationUnrelatedDenied() {
        loggedIn();
        Invitation invitation = new Invitation();
        invitation.setScoreboardId("sb-99");
        invitation.setReceiverId("user-2");
        invitation.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class, () -> validator.validateReadAccess(invitation));
    }

    // ---------------------------------------------------------------------
    // Collection overload
    // ---------------------------------------------------------------------

    @Test
    void validateReadAccess_collectionValidatesEachElement() {
        loggedIn();
        PointCategory allowed = new PointCategory();
        allowed.setScoreboardId("sb-1");
        allowed.setCreatedBy("someone");
        PointCategory denied = new PointCategory();
        denied.setScoreboardId("sb-99");
        denied.setCreatedBy("someone");

        assertThrows(AccessDeniedException.class,
                () -> validator.validateReadAccess(List.of(allowed, denied)));
    }
}
