import axios from 'axios';

export const BASE_URL = 'http://YOURURL:5000';
export const API_KEY = 'YOUR_API_KEY_HERE';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

export interface Track {
    id: string;
    youtubeId: string;
    title: string;
    artist: string | null;
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
        api.get<Track[]>('/api/tracks', { params: { search, sortBy } }),

    // Ключ в заголовке через axios — для списка треков
    // Для стриминга через expo-av — ключ передаётся напрямую в headers объекте
    getStreamUrl: (id: string) => `${BASE_URL}/api/tracks/${id}/stream`,

    delete: (id: string) => api.delete(`/api/tracks/${id}`),
};

export const DownloadsApi = {
    submit: (url: string) =>
        api.post<DownloadTask>('/api/downloads', { url }),

    getStatus: (taskId: string) =>
        api.get<DownloadTask>(`/api/downloads/${taskId}`),
};