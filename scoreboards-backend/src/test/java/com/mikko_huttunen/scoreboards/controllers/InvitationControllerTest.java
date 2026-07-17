package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.CreateInvitationDTO;
import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.InvitationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link InvitationController}.
 */
@ExtendWith(MockitoExtension.class)
class InvitationControllerTest {

    @Mock
    private InvitationService invitationService;
    @Mock
    private CurrentUserContext currentUserContext;

    @InjectMocks
    private InvitationController invitationController;

    @Test
    void createInvitation_returnsCreated() {
        CreateInvitationDTO dto = new CreateInvitationDTO();
        dto.setReceiverEmail("r@e.com");
        dto.setScoreboardId("sb-1");
        dto.setPermissions(Set.of(Permission.SESSIONS));

        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        when(invitationService.createInvitation("r@e.com", "sb-1", Set.of(Permission.SESSIONS)))
                .thenReturn(invitation);

        ResponseEntity<Invitation> response = invitationController.createInvitation(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("inv-1", response.getBody().getId());
    }

    @Test
    void getInvitations_returnsOkForCurrentUser() {
        User user = new User();
        user.setId("user-1");
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(invitationService.getInvitationsByUserId("user-1")).thenReturn(List.of(new Invitation()));

        ResponseEntity<List<Invitation>> response = invitationController.getInvitations();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getInvitationById_returnsOk() {
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        when(invitationService.getInvitationById("inv-1")).thenReturn(invitation);

        ResponseEntity<Invitation> response = invitationController.getInvitationById("inv-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("inv-1", response.getBody().getId());
    }

    @Test
    void acceptInvitation_returnsOk() {
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        when(invitationService.acceptInvitation("inv-1")).thenReturn(invitation);

        ResponseEntity<Invitation> response = invitationController.acceptInvitation("inv-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("inv-1", response.getBody().getId());
    }

    @Test
    void deleteInvitation_returnsOkWithDeleted() {
        Invitation deleted = new Invitation();
        deleted.setId("inv-1");
        when(invitationService.deleteInvitations(Set.of("inv-1"))).thenReturn(List.of(deleted));

        ResponseEntity<Invitation> response = invitationController.deleteInvitation("inv-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("inv-1", response.getBody().getId());
    }
}
