import axios from 'axios';
import type { Scoreboard } from '../types/Scoreboard';
import apiClient from '../api/Interceptor';
import type { User } from '../types/User';

const API_BASE_URL = '/api/scoreboards';

export type ScoreboardData = {
  name: string;
  pointCategories: PointCategoriesData[];
};

export type PointCategoriesData = {
  id?: string;
  name: string;
  color: string;
};

/**
 * Service for interacting with the Scoreboards API.
 */
export class ScoreboardsService {
  /**
   * Create a new scoreboard.
   * @returns Promise resolving to created scoreboard
   * @param scoreboard
   */
  static async createScoreboard(
    scoreboard: ScoreboardData
  ): Promise<Scoreboard> {
    try {
      const response = await apiClient.post<Scoreboard>(
        API_BASE_URL,
        scoreboard
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create scoreboard: ${error.message}`);
      }
      throw new Error(`Failed to create scoreboard: ${error}`);
    }
  }

  /**
   * Get all active scoreboards of the current user.
   * @returns Promise resolving to array of scoreboards
   */
  static async getScoreboardsByCurrentUser(): Promise<Scoreboard[]> {
    try {
      const response = await apiClient.get<Scoreboard[]>(API_BASE_URL);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch scoreboards by user: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch scoreboards by user: ${error}`);
    }
  }

  /**
   * Get a scoreboard by ID.
   * @param id Scoreboard ID
   * @returns Promise resolving to scoreboard or null if not found
   */
  static async getScoreboardById(id: string): Promise<Scoreboard | null> {
    try {
      const response = await apiClient.get<Scoreboard>(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch scoreboard by ID: ${error.message}`);
      }
      throw new Error(`Failed to fetch scoreboard by ID: ${error}`);
    }
  }

  static async getScoreboardUsers(scoreboardId: string): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>(
        `${API_BASE_URL}/${scoreboardId}/users`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  /**
   * Update an existing scoreboard.
   * @param id Scoreboard ID
   * @param scoreboard Updated scoreboard data
   * @returns Promise resolving to updated scoreboard or null if not found
   */
  static async updateScoreboard(
    id: string,
    scoreboard: ScoreboardData
  ): Promise<Scoreboard | null> {
    console.log('Updating scoreboard:', id, scoreboard);
    try {
      const response = await apiClient.put<Scoreboard>(
        `${API_BASE_URL}/${id}`,
        scoreboard
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update scoreboard: ${error.message}`);
      }
      throw new Error(`Failed to update scoreboard: ${error}`);
    }
  }

  /**
   * Delete a scoreboard (soft delete).
   * @param id Scoreboard ID
   * @returns Promise resolving to the deleted scoreboard
   */
  static async deleteScoreboard(id: string): Promise<Scoreboard> {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete scoreboard: ${error.message}`);
      }
      throw new Error(`Failed to delete scoreboard: ${error}`);
    }
  }

  /**
   * Leave a scoreboard (remove user from joined scoreboards).
   * @param id Scoreboard ID
   * @returns Promise resolving to true if left successfully
   */
  static async leaveScoreboard(id: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/${id}/leave`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to leave scoreboard: ${error.message}`);
      }
      throw new Error(`Failed to leave scoreboard: ${error}`);
    }
  }

  /**
   * Remove user from a scoreboard (only creator can remove users).
   * @param scoreboardId Scoreboard ID
   * @param userId User ID to remove
   * @returns Promise resolving to true if removed successfully
   */
  static async removeUserFromScoreboard(
    scoreboardId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // URL-encode the user ID to handle special characters like '|' in Auth0 user IDs
      const encodedUserId = encodeURIComponent(userId);
      const response = await apiClient.post(
        `${API_BASE_URL}/${scoreboardId}/remove/${encodedUserId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to remove user from scoreboard: ${error.message}`
        );
      }
      throw new Error(`Failed to remove user from scoreboard: ${error}`);
    }
  }
}
