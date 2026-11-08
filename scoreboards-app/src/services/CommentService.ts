import apiClient from '../api/Interceptor';
import { getErrorMessage } from '../utils/Utils.ts';
import type { Comment } from '../types/Comment.ts';

const API_BASE_URL = '/api/comments';

export type CreateCommentData = {
    scoreboardId: string;
    sessionId?: string;
    comment: string;
};

export class CommentService {
    static async getCommentsByScoreboardId(
        scoreboardId: string
    ): Promise<Comment[]> {
        try {
            const response = await apiClient.get<Comment[]>(
                `${API_BASE_URL}/scoreboard/${scoreboardId}`
            );
            return response.data;
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new Error(`Failed to fetch comments: ${errorMessage}`);
        }
    }

    static async createComment(data: CreateCommentData): Promise<Comment> {
        try {
            const response = await apiClient.post<Comment>(API_BASE_URL, data);
            return response.data;
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new Error(`Failed to create comment: ${errorMessage}`);
        }
    }

    static async deleteComment(commentId: string): Promise<boolean> {
        try {
            const response = await apiClient.delete<boolean>(
                `${API_BASE_URL}/${commentId}`
            );
            return response.data;
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new Error(`Failed to delete comment: ${errorMessage}`);
        }
    }
}