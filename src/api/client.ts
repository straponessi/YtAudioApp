import axios from 'axios';
import { Config } from '../config';

export const BASE_URL = Config.BASE_URL;
export const API_KEY  = Config.API_KEY;  

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'X-Api-Key': API_KEY },
    timeout: 30_000,
});

export interface Track {
    id: string;
    youtubeId: string;
    title: string;
    artist: string | null;
    album: string | null;
    thumbnailUrl: string | null;
    durationSeconds: number;
    fileExtension: string;
    fileSizeBytes: number;
    createdAt: string;
}

export interface DownloadTask {
    id: string;
    youtubeUrl: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    track: { id: string; title: string; artist: string | null } | null;
}

export const TracksApi = {
    getAll: (search?: string, sortBy?: string) =>
        apiClient.get<Track[]>('/api/tracks', { params: { search, sortBy } }),

    getStreamUrl: (id: string) =>
        `${BASE_URL}/api/tracks/${id}/stream`,

    getDownloadUrl: (id: string) =>
        `${BASE_URL}/api/tracks/${id}/download?apiKey=${encodeURIComponent(API_KEY)}`,

    patch: (id: string, data: { title?: string; artist?: string; album?: string }) =>
        apiClient.patch<Track>(`/api/tracks/${id}`, data),

    delete: (id: string) => apiClient.delete(`/api/tracks/${id}`),
};

export const DownloadsApi = {
    submit: (url: string) =>
        apiClient.post<DownloadTask>('/api/downloads', { url }),

    getStatus: (taskId: string) =>
        apiClient.get<DownloadTask>(`/api/downloads/${taskId}`),
};