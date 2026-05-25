import axios from 'axios';
import type { Scoreboard } from '../types/Scoreboard';

const API_BASE_URL = '/api/scoreboards';

/**
 * Service for interacting with the Scoreboards API.
 * All methods require an authentication token.
 */
export class ScoreboardsService {
  /**
   * Get all active scoreboards of a user.
   * @param token Authentication token
   * @returns Promise resolving to array of scoreboards
   */
  static async getScoreboardsByUser(token: string): Promise<Scoreboard[]> {
    try {
      const response = await axios.get<Scoreboard[]>(API_BASE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
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
   * @param token Authentication token
   * @returns Promise resolving to scoreboard or null if not found
   */
  static async getScoreboardById(
    id: string,
    token: string
  ): Promise<Scoreboard | null> {
    try {
      const response = await axios.get<Scoreboard>(`${API_BASE_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch scoreboard by ID: ${error.message}`);
      }
      throw new Error(`Failed to fetch scoreboard by ID: ${error}`);
    }
  }

  /**
   * Create a new scoreboard.
   * @param name Scoreboard name
   * @param pointCategories Array of point categories with name and color
   * @param token Authentication token
   * @returns Promise resolving to created scoreboard
   */
  static async createScoreboard(
    name: string,
    pointCategories: Array<{ name: string; color: string }>,
    token: string
  ): Promise<Scoreboard> {
    try {
      const response = await axios.post<Scoreboard>(
        API_BASE_URL,
        {
          name,
          pointCategories,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
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
   * Update an existing scoreboard.
   * @param id Scoreboard ID
   * @param scoreboard Updated scoreboard data
   * @param token Authentication token
   * @returns Promise resolving to updated scoreboard or null if not found
   */
  static async updateScoreboard(
    id: string,
    scoreboard: Partial<
      Omit<Scoreboard, 'id' | 'created' | 'lastModified' | 'createdBy'>
    >,
    token: string
  ): Promise<Scoreboard | null> {
    try {
      const response = await axios.put<Scoreboard>(
        `${API_BASE_URL}/${id}`,
        scoreboard,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
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
   * @param token Authentication token
   * @returns Promise resolving to true if deleted, false if not found
   */
  static async deleteScoreboard(id: string, token: string): Promise<boolean> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
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
   * @param token Authentication token
   * @returns Promise resolving to true if left successfully
   */
  static async leaveScoreboard(id: string, token: string): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${id}/leave`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
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
   * @param token Authentication token
   * @returns Promise resolving to true if removed successfully
   */
  static async removeUserFromScoreboard(
    scoreboardId: string,
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      // URL-encode the user ID to handle special characters like '|' in Auth0 user IDs
      const encodedUserId = encodeURIComponent(userId);
      const response = await axios.post(
        `${API_BASE_URL}/${scoreboardId}/remove/${encodedUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
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
