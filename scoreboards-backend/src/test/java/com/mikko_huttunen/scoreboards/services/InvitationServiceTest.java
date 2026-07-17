package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link InvitationService}.
 */
@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private QueryService queryService;
    @Mock
    private ScoreboardService scoreboardService;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InvitationService invitationService;

    private User inviter;
    private User receiver;

    @BeforeEach
    void setUp() {
        inviter = new User();
        inviter.setId("inviter-1");
        inviter.setName("Inviter");

        receiver = new User();
        receiver.setId("receiver-1");
        receiver.setName("Receiver");
        receiver.setEmail("receiver@example.com");
    }

    private Membership membership(String userId) {
        Membership m = new Membership();
        m.setScoreboardId("sb-1");
        m.setUserId(userId);
        m.setPermissions(Set.of(Permission.OWNER));
        return m;
    }

    private Scoreboard scoreboardWith(String createdBy, List<Membership> memberships) {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setName("Board");
        sb.setCreatedBy(createdBy);
        sb.setMemberships(memberships);
        return sb;
    }

    // ---------------------------------------------------------------------
    // createInvitation
    // ---------------------------------------------------------------------

    @Test
    void createInvitation_success() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("receiver@example.com"))
                .thenReturn(Optional.of(receiver));
        when(scoreboardService.getScoreboardById("sb-1"))
                .thenReturn(scoreboardWith("inviter-1", new java.util.ArrayList<>(List.of(membership("inviter-1")))));
        when(queryService.fetchInvitationsWithResolvedUsernamesByUserId("receiver-1"))
                .thenReturn(Optional.empty());
        when(queryService.create(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

        Invitation result = invitationService.createInvitation(
                "receiver@example.com", "sb-1", Set.of(Permission.SESSIONS));

        assertEquals("receiver-1", result.getReceiverId());
        assertEquals("sb-1", result.getScoreboardId());
        assertEquals("Board", result.getScoreboardName());
        assertEquals("Receiver", result.getReceiverName());
        assertEquals(Set.of(Permission.SESSIONS), result.getPermissions());
    }

    @Test
    void createInvitation_throwsWhenReceiverNotFound() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("missing@example.com"))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("missing@example.com", "sb-1", Set.of()));
        assertTrue(ex.getMessage().contains("not found"));
    }

    @Test
    void createInvitation_throwsWhenInvitingSelf() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("inviter@example.com"))
                .thenReturn(Optional.of(inviter));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("inviter@example.com", "sb-1", Set.of()));
        assertEquals("Cannot invite yourself", ex.getMessage());
    }

    @Test
    void createInvitation_throwsWhenScoreboardFull() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("receiver@example.com"))
                .thenReturn(Optional.of(receiver));

        java.util.List<Membership> memberships = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            memberships.add(membership("member-" + i));
        }
        when(scoreboardService.getScoreboardById("sb-1"))
                .thenReturn(scoreboardWith("inviter-1", memberships));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("receiver@example.com", "sb-1", Set.of()));
        assertEquals("Scoreboard has reached the maximum number of members", ex.getMessage());
    }

    @Test
    void createInvitation_throwsWhenInviterNotCreator() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("receiver@example.com"))
                .thenReturn(Optional.of(receiver));
        when(scoreboardService.getScoreboardById("sb-1"))
                .thenReturn(scoreboardWith("other-creator", new java.util.ArrayList<>(List.of(membership("inviter-1")))));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("receiver@example.com", "sb-1", Set.of()));
        assertEquals("You are not authorized to invite users to this scoreboard", ex.getMessage());
    }

    @Test
    void createInvitation_throwsWhenReceiverAlreadyMember() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("receiver@example.com"))
                .thenReturn(Optional.of(receiver));
        when(scoreboardService.getScoreboardById("sb-1"))
                .thenReturn(scoreboardWith("inviter-1",
                        new java.util.ArrayList<>(List.of(membership("inviter-1"), membership("receiver-1")))));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("receiver@example.com", "sb-1", Set.of()));
        assertEquals("User is already a member of this scoreboard", ex.getMessage());
    }

    @Test
    void createInvitation_throwsWhenPendingInvitationExists() {
        when(currentUserContext.requireCurrentUser()).thenReturn(inviter);
        when(userRepository.findByEmailAndIsActiveTrue("receiver@example.com"))
                .thenReturn(Optional.of(receiver));
        when(scoreboardService.getScoreboardById("sb-1"))
                .thenReturn(scoreboardWith("inviter-1", new java.util.ArrayList<>(List.of(membership("inviter-1")))));

        Invitation existing = new Invitation();
        existing.setScoreboardId("sb-1");
        when(queryService.fetchInvitationsWithResolvedUsernamesByUserId("receiver-1"))
                .thenReturn(Optional.of(List.of(existing)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.createInvitation("receiver@example.com", "sb-1", Set.of()));
        assertEquals("An invitation has already been sent to this user for this scoreboard", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // getInvitationsByUserId
    // ---------------------------------------------------------------------

    @Test
    void getInvitationsByUserId_returnsEmptyWhenNone() {
        when(queryService.fetchInvitationsWithResolvedUsernamesByUserId("user-1"))
                .thenReturn(Optional.empty());

        List<Invitation> result = invitationService.getInvitationsByUserId("user-1");

        assertTrue(result.isEmpty());
    }

    @Test
    void getInvitationsByUserId_returnsInvitations() {
        Invitation inv = new Invitation();
        inv.setId("inv-1");
        when(queryService.fetchInvitationsWithResolvedUsernamesByUserId("user-1"))
                .thenReturn(Optional.of(List.of(inv)));

        List<Invitation> result = invitationService.getInvitationsByUserId("user-1");

        assertEquals(1, result.size());
        assertEquals("inv-1", result.get(0).getId());
    }

    // ---------------------------------------------------------------------
    // getInvitationById
    // ---------------------------------------------------------------------

    @Test
    void getInvitationById_returnsInvitation() {
        Invitation inv = new Invitation();
        inv.setId("inv-1");
        when(queryService.fetchInvitationWithResolvedUsernamesByInvitationId("inv-1"))
                .thenReturn(Optional.of(inv));

        Invitation result = invitationService.getInvitationById("inv-1");

        assertEquals("inv-1", result.getId());
    }

    @Test
    void getInvitationById_throwsWhenMissing() {
        when(queryService.fetchInvitationWithResolvedUsernamesByInvitationId("missing"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> invitationService.getInvitationById("missing"));
    }

    // ---------------------------------------------------------------------
    // acceptInvitation
    // ---------------------------------------------------------------------

    @Test
    void acceptInvitation_createsMembershipAndDeletesInvitation() {
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        invitation.setScoreboardId("sb-1");
        invitation.setReceiverId("receiver-1");
        invitation.setPermissions(Set.of(Permission.SESSIONS));
        when(queryService.fetchInvitationWithResolvedUsernamesByInvitationId("inv-1"))
                .thenReturn(Optional.of(invitation));

        // scoreboard with no membership for this scoreboard yet
        Scoreboard sb = scoreboardWith("inviter-1", new java.util.ArrayList<>());
        when(scoreboardService.getScoreboardById("sb-1")).thenReturn(sb);

        when(queryService.create(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));
        when(queryService.deleteAll(Set.of("inv-1"), Invitation.class)).thenReturn(List.of(invitation));

        Invitation result = invitationService.acceptInvitation("inv-1");

        assertEquals("inv-1", result.getId());
        ArgumentCaptor<Membership> captor = ArgumentCaptor.forClass(Membership.class);
        verify(queryService).create(captor.capture());
        assertEquals("receiver-1", captor.getValue().getUserId());
        assertEquals("sb-1", captor.getValue().getScoreboardId());
        assertEquals(Set.of(Permission.SESSIONS), captor.getValue().getPermissions());
    }

    @Test
    void acceptInvitation_throwsAndDeletesWhenScoreboardFull() {
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        invitation.setScoreboardId("sb-1");
        invitation.setReceiverId("receiver-1");
        when(queryService.fetchInvitationWithResolvedUsernamesByInvitationId("inv-1"))
                .thenReturn(Optional.of(invitation));

        java.util.List<Membership> memberships = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            memberships.add(membership("member-" + i));
        }
        when(scoreboardService.getScoreboardById("sb-1")).thenReturn(scoreboardWith("inviter-1", memberships));
        when(queryService.deleteAll(Set.of("inv-1"), Invitation.class)).thenReturn(List.of(invitation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.acceptInvitation("inv-1"));
        assertEquals("Scoreboard has reached the maximum number of members", ex.getMessage());
        verify(queryService).deleteAll(Set.of("inv-1"), Invitation.class);
        verify(queryService, never()).create(any(Membership.class));
    }

    @Test
    void acceptInvitation_throwsAndDeletesWhenAlreadyMember() {
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        invitation.setScoreboardId("sb-1");
        invitation.setReceiverId("receiver-1");
        when(queryService.fetchInvitationWithResolvedUsernamesByInvitationId("inv-1"))
                .thenReturn(Optional.of(invitation));

        Scoreboard sb = scoreboardWith("inviter-1",
                new java.util.ArrayList<>(List.of(membership("receiver-1"))));
        when(scoreboardService.getScoreboardById("sb-1")).thenReturn(sb);
        when(queryService.deleteAll(Set.of("inv-1"), Invitation.class)).thenReturn(List.of(invitation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invitationService.acceptInvitation("inv-1"));
        assertEquals("User is already a member of this scoreboard", ex.getMessage());
        verify(queryService).deleteAll(Set.of("inv-1"), Invitation.class);
    }

    // ---------------------------------------------------------------------
    // deleteInvitations
    // ---------------------------------------------------------------------

    @Test
    void deleteInvitations_delegatesToQueryService() {
        Invitation inv = new Invitation();
        inv.setId("inv-1");
        when(queryService.deleteAll(Set.of("inv-1"), Invitation.class)).thenReturn(List.of(inv));

        List<Invitation> result = invitationService.deleteInvitations(Set.of("inv-1"));

        assertEquals(1, result.size());
        assertEquals("inv-1", result.get(0).getId());
    }
}
