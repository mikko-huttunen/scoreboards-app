import axios from 'axios';
import type { User } from '../types/User';
import apiClient from '../api/Interceptor';

const API_BASE_URL = '/api/users';

/**
 * Service for interacting with the Users API.
 */
export class UserService {
  /**
   * Get the current authenticated user.
   * @returns Promise resolving to user
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>(`${API_BASE_URL}/user`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch current user: ${error.message}`);
      }
      throw new Error(`Failed to fetch current user: ${error}`);
    }
  }

  static async updateCurrentUser(name?: string): Promise<User> {
    const formData = new FormData();
    if (name !== undefined) {
      formData.append('name', name);
    }

    try {
      const response = await apiClient.put<User>(
        `${API_BASE_URL}/user`,
        formData
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorText =
          error.response?.data instanceof Blob
            ? await error.response?.data.text()
            : String(error.response?.data);
        throw new Error(
          `Failed to update user: ${error.message} - ${errorText}`
        );
      }
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  static async deleteCurrentUser(): Promise<boolean> {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/user`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  static async getUsersForScoreboard(scoreboardId: string): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }
}
