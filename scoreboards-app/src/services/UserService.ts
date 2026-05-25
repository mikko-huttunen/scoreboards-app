import axios from 'axios';
import type { User } from '../types/User';

const API_BASE_URL = '/api/users';

/**
 * Service for interacting with the Users API.
 * All methods require an authentication token.
 */
export class UserService {
  /**
   * Get the current authenticated user.
   * @param token Authentication token
   * @returns Promise resolving to user
   */
  static async getCurrentUser(token: string): Promise<User> {
    try {
      const response = await axios.get<User>(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch current user: ${error.message}`);
      }
      throw new Error(`Failed to fetch current user: ${error}`);
    }
  }

  static async getUserById(id: string, token: string): Promise<User | null> {
    const encodedId = encodeURIComponent(id);
    try {
      const response = await axios.get<User>(`${API_BASE_URL}/${encodedId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch user by ID: ${error.message}`);
      }
      throw new Error(`Failed to fetch user by ID: ${error}`);
    }
  }

  static async updateCurrentUser(
    name?: string,
    avatarFile?: File,
    token?: string
  ): Promise<User> {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const formData = new FormData();
    if (name !== undefined) {
      formData.append('name', name);
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const response = await axios.put<User>(`${API_BASE_URL}/user`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  static async deleteCurrentUser(token: string): Promise<boolean> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  static async getUsersForScoreboard(
    scoreboardId: string,
    token: string
  ): Promise<User[]> {
    try {
      const response = await axios.get<User[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`,
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
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }
}
