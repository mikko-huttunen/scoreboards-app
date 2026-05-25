import type { Invitation } from '../types/Invitation';

const API_BASE_URL = '/api/invitations';

/**
 * Service for interacting with the Invitations API.
 * All methods require an authentication token.
 */
export class InvitationService {
  /**
   * Create a new invitation.
   * @param receiverEmail Email of the user to invite
   * @param scoreboardId ID of the scoreboard
   * @param token Authentication token
   * @returns Promise resolving to the created invitation
   */
  static async createInvitation(
    receiverEmail: string,
    scoreboardId: string,
    token: string
  ): Promise<Invitation> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverEmail,
        scoreboardId,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `Failed to create invitation: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get all pending invitations for the current user.
   * @param token Authentication token
   * @returns Promise resolving to array of pending invitations
   */
  static async getPendingInvitations(token: string): Promise<Invitation[]> {
    const response = await fetch(`${API_BASE_URL}/pending`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pending invitations: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get all invitations for the current user.
   * @param token Authentication token
   * @returns Promise resolving to array of invitations
   */
  static async getMyInvitations(token: string): Promise<Invitation[]> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all invitations for a scoreboard.
   * @param scoreboardId ID of the scoreboard
   * @param token Authentication token
   * @returns Promise resolving to array of invitations
   */
  static async getInvitationsByScoreboard(
    scoreboardId: string,
    token: string
  ): Promise<Invitation[]> {
    const response = await fetch(`${API_BASE_URL}/scoreboard/${scoreboardId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get invitation by ID.
   * @param invitationId ID of the invitation
   * @param token Authentication token
   * @returns Promise resolving to the invitation
   */
  static async getInvitationById(
    invitationId: string,
    token: string
  ): Promise<Invitation> {
    const response = await fetch(`${API_BASE_URL}/${invitationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Accept an invitation.
   * @param invitationId ID of the invitation
   * @param token Authentication token
   * @returns Promise resolving to the updated invitation
   */
  static async acceptInvitation(
    invitationId: string,
    token: string
  ): Promise<Invitation> {
    const response = await fetch(`${API_BASE_URL}/${invitationId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `Failed to accept invitation: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Decline an invitation.
   * @param invitationId ID of the invitation
   * @param token Authentication token
   * @returns Promise resolving to the updated invitation
   */
  static async declineInvitation(
    invitationId: string,
    token: string
  ): Promise<Invitation> {
    const response = await fetch(`${API_BASE_URL}/${invitationId}/decline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error ||
          `Failed to decline invitation: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Delete an invitation.
   * @param invitationId ID of the invitation
   * @param token Authentication token
   * @returns Promise resolving to true if deleted successfully
   */
  static async deleteInvitation(
    invitationId: string,
    token: string
  ): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${invitationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `Failed to delete invitation: ${response.statusText}`
      );
    }

    return true;
  }
}
