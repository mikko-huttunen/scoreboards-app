import type { User } from '../types/User';
import apiClient from '../api/Interceptor';
import { getErrorMessage } from '../utils/Utils.ts';

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
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch current user: ${errorMessage}`);
    }
  }

  static async getScoreboardUsers(scoreboardId: string): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>(
        `${API_BASE_URL}/${scoreboardId}/users`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch users: ${errorMessage}`);
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
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to update user: ${errorMessage}`);
    }
  }

  static async deleteCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/user`);
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to delete user: ${errorMessage}`);
    }
  }
}
