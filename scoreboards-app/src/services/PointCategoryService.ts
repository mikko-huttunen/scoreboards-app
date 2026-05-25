import type { PointCategory } from '../types/PointCategory';

const API_BASE_URL = '/api/point-categories';

/**
 * Service for interacting with the Point Categories API.
 * All methods require an authentication token.
 */
export class PointCategoryService {
  /**
   * Get all active point categories for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @param token Authentication token
   * @returns Promise resolving to array of point categories
   */
  static async getPointCategoriesByScoreboard(
    scoreboardId: string,
    token: string
  ): Promise<PointCategory[]> {
    const response = await fetch(`${API_BASE_URL}/scoreboard/${scoreboardId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch point categories: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get a point category by ID.
   * @param id Point category ID
   * @param token Authentication token
   * @returns Promise resolving to point category or null if not found
   */
  static async getPointCategoryById(
    id: string,
    token: string
  ): Promise<PointCategory | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch point category: ${response.statusText}`);
    }

    return response.json();
  }
}
