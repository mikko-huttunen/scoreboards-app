import axios from 'axios';
import type { Invitation } from '../types/Invitation';
import apiClient from '../api/Interceptor';
import { PERMISSIONS } from '../constants.ts';

const API_BASE_URL = '/api/invitations';

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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create invitation: ${error.message}`);
      }
      throw new Error(`Failed to create invitation: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch pending invitations: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch pending invitations: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch invitation: ${error.message}`);
      }
      throw new Error(`Failed to fetch invitation: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }
      throw new Error(`Failed to accept invitation: ${error}`);
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
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw new Error(`Failed to delete invitation: ${error.message}`);
      }
      throw new Error(`Failed to delete invitation: ${error}`);
    }
  }
}
