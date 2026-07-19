import type { Invitation } from '../types/Invitation';
import apiClient from '../api/Interceptor';
import { PERMISSIONS } from '../constants.ts';
import { getErrorMessage } from '../utils/Utils.ts';

const API_BASE_URL = '/invitations';

/**
 * Service for interacting with the Invitations API.
 */
export class InvitationService {
  /**
   * Create a new invitation.
   * @param receiverEmail Email of the user to invite
   * @param scoreboardId ID of the scoreboard
   * @param permissions Permissions assigned for the user to invite
   * @returns Promise resolving to the created invitation
   */
  static async createInvitation(
    receiverEmail: string,
    scoreboardId: string,
    permissions: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][]
  ): Promise<Invitation> {
    try {
      const response = await apiClient.post<Invitation>(API_BASE_URL, {
        receiverEmail,
        scoreboardId,
        permissions,
      });
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all pending invitations for the current user.
   * @returns Promise resolving to an array of pending invitations
   */
  static async getInvitations(): Promise<Invitation[]> {
    try {
      const response = await apiClient.get<Invitation[]>(API_BASE_URL);
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch pending invitations: ${errorMessage}`);
    }
  }

  /**
   * Get invitation by ID.
   * @param invitationId ID of the invitation
   * @returns Promise resolving to the invitation
   */
  static async getInvitationById(invitationId: string): Promise<Invitation> {
    try {
      const response = await apiClient.get<Invitation>(
        `${API_BASE_URL}/${invitationId}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch invitation: ${errorMessage}`);
    }
  }

  /**
   * Accept an invitation.
   * @param invitationId ID of the invitation
   * @returns Promise resolving to the updated invitation
   */
  static async acceptInvitation(invitationId: string): Promise<Invitation> {
    try {
      const response = await apiClient.post<Invitation>(
        `${API_BASE_URL}/${invitationId}/accept`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to accept invitation: ${errorMessage}`);
    }
  }

  /**
   * Delete an invitation.
   * @param invitationId ID of the invitation
   * @returns Promise resolving to the deleted invitation or null if not found
   */
  static async deleteInvitation(
    invitationId: string
  ): Promise<Invitation | null> {
    try {
      const response = await apiClient.delete<Invitation>(
        `${API_BASE_URL}/${invitationId}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to delete invitation: ${errorMessage}`);
    }
  }
}
