package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private Auth0ManagementService auth0ManagementService;
    @Mock
    private AuthProvider authProvider;
    @Mock
    private QueryService queryService;
    @Mock
    private ScoreboardService scoreboardService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private TimerService timerService;
    @Mock
    private S3Service s3Service;

    @InjectMocks
    private UserService userService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setName("Alice");
        user.setAuth0Id("auth0|123");
    }

    private MultipartFile avatarFile(String filename) {
        return new MockMultipartFile("avatar", filename, "image/png", new byte[]{1, 2, 3});
    }

    private JsonNode auth0UserNode(String email, boolean verified, String name, String picture) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("email", email);
        node.put("email_verified", verified);
        node.put("name", name);
        node.put("picture", picture);
        return node;
    }

    // ---------------------------------------------------------------------
    // createUser
    // ---------------------------------------------------------------------

    @Test
    void createUser_mapsAuth0FieldsAndSaves() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("Test@Example.com", true, "Bob", "http://avatar"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.createUser();

        assertEquals("auth0|123", result.getAuth0Id());
        assertEquals("test@example.com", result.getEmail());
        assertTrue(result.getEmailVerified());
        assertEquals("Bob", result.getName());
        assertEquals("http://avatar", result.getAvatar());
        assertNotNull(result.getId());
    }

    @Test
    void createUser_truncatesLongNameTo15Chars() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("a@b.com", false, "ThisNameIsWayTooLong", "pic"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.createUser();

        assertEquals("ThisNameIsWayTo", result.getName());
        assertEquals(15, result.getName().length());
    }

    // ---------------------------------------------------------------------
    // getCurrentUser
    // ---------------------------------------------------------------------

    @Test
    void getCurrentUser_returnsExistingUserWithResolvedAvatarUrl() {
        user.setAvatar("s3://bucket/avatars/user-1/pic.png");
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(queryService.find(any(Query.class), eq(User.class), eq(false)))
                .thenReturn(List.of(user));
        when(s3Service.resolveUrl("s3://bucket/avatars/user-1/pic.png"))
                .thenReturn("https://signed/pic.png");

        User result = userService.getCurrentUser();

        assertEquals("user-1", result.getId());
        assertEquals("https://signed/pic.png", result.getAvatar());
        verify(userRepository, never()).save(any());
    }

    @Test
    void getCurrentUser_createsUserWhenNotFound() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(queryService.find(any(Query.class), eq(User.class), eq(false)))
                .thenReturn(List.of());
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("new@user.com", true, "New", "pic"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.getCurrentUser();

        assertEquals("new@user.com", result.getEmail());
        verify(userRepository).save(any(User.class));
    }

    // ---------------------------------------------------------------------
    // getScoreboardUsers
    // ---------------------------------------------------------------------

    @Test
    void getScoreboardUsers_returnsUsersWithResolvedAvatarUrls() {
        user.setAvatar("s3://bucket/avatars/user-1/pic.png");
        when(queryService.fetchUsersWithMembershipsByScoreboardId("sb-1"))
                .thenReturn(Optional.of(List.of(user)));
        when(s3Service.resolveUrl("s3://bucket/avatars/user-1/pic.png"))
                .thenReturn("https://signed/pic.png");

        List<User> result = userService.getScoreboardUsers("sb-1");

        assertEquals(1, result.size());
        assertEquals("https://signed/pic.png", result.get(0).getAvatar());
    }

    @Test
    void getScoreboardUsers_throwsWhenEmpty() {
        when(queryService.fetchUsersWithMembershipsByScoreboardId("sb-1"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> userService.getScoreboardUsers("sb-1"));
    }

    // ---------------------------------------------------------------------
    // updateUser
    // ---------------------------------------------------------------------

    /**
     * Stubs {@code queryService.updateById} so the service's updater callback is applied
     * to {@code target}, mimicking a successful persistence round-trip.
     */
    private void stubUpdateByIdApplyingUpdaterTo(User target) {
        when(queryService.updateById(eq("user-1"), eq(User.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<User> updater = inv.getArgument(2);
                    updater.update(target);
                    return Optional.of(target);
                });
    }

    @Test
    void updateUser_updatesName() throws IOException {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);

        User result = userService.updateUser("NewName", null);

        assertEquals("NewName", result.getName());
        verify(s3Service, never()).uploadFile(anyString(), any());
        verify(s3Service, never()).deleteFile(anyString());
    }

    @Test
    void updateUser_trimsName() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);

        User result = userService.updateUser("  NewName  ", null);

        assertEquals("NewName", result.getName());
    }

    @Test
    void updateUser_throwsWhenNameBlank() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.updateUser("   ", null));
        assertEquals("User name cannot be empty", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), any(), any());
    }

    @Test
    void updateUser_throwsWhenNameTooLong() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.updateUser("ThisNameIsWayTooLong", null));
        assertEquals("User name cannot be longer than 15 characters", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), any(), any());
    }

    @Test
    void updateUser_throwsWhenUpdateFails() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.updateById(eq("user-1"), eq(User.class), any())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> userService.updateUser("Ok", null));
    }

    @Test
    void updateUser_uploadsAvatarUnderUserScopedKeyKeepingExtension() throws IOException {
        user.setAvatar(null);
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);
        when(s3Service.uploadFile(anyString(), any())).thenReturn("s3://bucket/avatars/user-1/new.png");
        when(s3Service.resolveUrl("s3://bucket/avatars/user-1/new.png")).thenReturn("https://signed/new.png");

        User result = userService.updateUser(null, avatarFile("avatar.png"));

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(s3Service).uploadFile(keyCaptor.capture(), any());
        assertTrue(keyCaptor.getValue().startsWith("avatars/user-1/"),
                "Avatar key should be scoped to the user: " + keyCaptor.getValue());
        assertTrue(keyCaptor.getValue().endsWith(".png"),
                "Avatar key should keep the original extension: " + keyCaptor.getValue());
        assertEquals("https://signed/new.png", result.getAvatar());
        // No previous avatar to clean up
        verify(s3Service, never()).deleteFile(anyString());
    }

    @Test
    void updateUser_deletesPreviousAvatarAfterSuccessfulUpload() throws IOException {
        user.setAvatar("s3://bucket/avatars/user-1/old.png");
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);
        when(s3Service.uploadFile(anyString(), any())).thenReturn("s3://bucket/avatars/user-1/new.png");

        userService.updateUser(null, avatarFile("avatar.png"));

        verify(s3Service).deleteFile("s3://bucket/avatars/user-1/old.png");
    }

    @Test
    void updateUser_succeedsWhenPreviousAvatarDeletionFails() throws IOException {
        user.setAvatar("s3://bucket/avatars/user-1/old.png");
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);
        when(s3Service.uploadFile(anyString(), any())).thenReturn("s3://bucket/avatars/user-1/new.png");
        doThrow(new RuntimeException("S3 down")).when(s3Service).deleteFile(anyString());

        User result = userService.updateUser(null, avatarFile("avatar.png"));

        assertNotNull(result);
    }

    @Test
    void updateUser_wrapsAvatarUploadFailure() throws IOException {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(s3Service.uploadFile(anyString(), any())).thenThrow(new IOException("stream closed"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.updateUser(null, avatarFile("avatar.png")));
        assertEquals("Failed to upload avatar image", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), any(), any());
    }

    @Test
    void updateUser_ignoresEmptyAvatarFile() throws IOException {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        stubUpdateByIdApplyingUpdaterTo(updated);

        MultipartFile empty = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[0]);

        userService.updateUser("NewName", empty);

        verify(s3Service, never()).uploadFile(anyString(), any());
    }

    // ---------------------------------------------------------------------
    // deleteUser
    // ---------------------------------------------------------------------

    @Test
    void deleteUser_deletesAuth0OwnedScoreboardsAndUser() {
        user.setAvatar("s3://bucket/avatars/user-1/pic.png");
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        Scoreboard owned = new Scoreboard();
        owned.setId("sb-owned");
        owned.setCreatedBy("user-1");
        Scoreboard joined = new Scoreboard();
        joined.setId("sb-joined");
        joined.setCreatedBy("other");
        when(scoreboardService.getScoreboardsByUser()).thenReturn(List.of(owned, joined));

        when(queryService.deleteById("user-1", User.class)).thenReturn(user);

        User result = userService.deleteUser();

        assertEquals("user-1", result.getId());
        verify(auth0ManagementService).deleteUser("auth0|123");
        verify(scoreboardService).deleteScoreboards(Set.of("sb-owned"));
        verify(s3Service).deleteFile("s3://bucket/avatars/user-1/pic.png");
        verify(queryService).deleteById("user-1", User.class);
    }

    // ---------------------------------------------------------------------
    // resendEmailVerification
    // ---------------------------------------------------------------------

    @Test
    void resendEmailVerification_sendsAndStartsTimer() {
        when(timerService.getRemainingTime("auth0|123")).thenReturn(Duration.ZERO);

        userService.resendEmailVerification("auth0|123");

        verify(auth0ManagementService).resendEmailVerification("auth0|123");
        verify(timerService).startTimer("auth0|123", 60);
    }

    @Test
    void resendEmailVerification_throwsWhenTimerActive() {
        when(timerService.getRemainingTime("auth0|123")).thenReturn(Duration.ofSeconds(30));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.resendEmailVerification("auth0|123"));
        assertEquals("User has already been sent a verification email", ex.getMessage());
        verify(auth0ManagementService, never()).resendEmailVerification(anyString());
    }

    // ---------------------------------------------------------------------
    // getResendTimer
    // ---------------------------------------------------------------------

    @Test
    void getResendTimer_returnsRemainingSeconds() {
        when(timerService.getRemainingTime("user-1")).thenReturn(Duration.ofSeconds(42));

        Long result = userService.getResendTimer("user-1");

        assertEquals(42L, result);
    }
}
