import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKS_DIR = (FileSystem as any).documentDirectory
    ? `${(FileSystem as any).documentDirectory}tracks/`
    : `${(FileSystem as any).cacheDirectory}tracks/`;

const STORAGE_KEY = 'downloaded_tracks';

export interface LocalTrack {
    trackId: string;
    localPath: string;
    downloadedAt: string;
}

const TRACKS_CACHE_KEY = 'tracks_cache';

export async function cacheTrackList(tracks: any[]): Promise<void> {
    await AsyncStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(tracks));
}

export async function getCachedTrackList(): Promise<any[]> {
    const raw = await AsyncStorage.getItem(TRACKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
}

// Убедиться что папка существует
async function ensureDir() {
    const dir = await FileSystem.getInfoAsync(TRACKS_DIR);
    if (!dir.exists) {
        await FileSystem.makeDirectoryAsync(TRACKS_DIR, { intermediates: true });
    }
}

// Получить все скачанные треки
export async function getLocalTracks(): Promise<LocalTrack[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

// Проверить скачан ли трек
export async function isDownloaded(trackId: string): Promise<boolean> {
    const tracks = await getLocalTracks();
    const entry = tracks.find(t => t.trackId === trackId);
    if (!entry) return false;

    // Проверить что файл реально существует на диске
    const info = await FileSystem.getInfoAsync(entry.localPath);
    return info.exists;
}

// Получить локальный путь если скачан
export async function getLocalPath(trackId: string): Promise<string | null> {
    const tracks = await getLocalTracks();
    const entry = tracks.find(t => t.trackId === trackId);
    if (!entry) return null;

    const info = await FileSystem.getInfoAsync(entry.localPath);
    return info.exists ? entry.localPath : null;
}

// Скачать трек на устройство
export async function downloadTrack(
    trackId: string,
    streamUrl: string,
    fileExtension: string,
    apiKey: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    await ensureDir();

    const localPath = `${TRACKS_DIR}${trackId}.${fileExtension}`;

    const downloadResumable = FileSystem.createDownloadResumable(
        streamUrl,
        localPath,
        { headers: { 'X-Api-Key': apiKey } },
        (downloadProgress) => {
            const progress =
                downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite;
            onProgress?.(progress);
        }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('Download failed');

    // Сохранить запись в AsyncStorage
    const tracks = await getLocalTracks();
    const filtered = tracks.filter(t => t.trackId !== trackId); // убрать если был
    filtered.push({ trackId, localPath: result.uri, downloadedAt: new Date().toISOString() });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    return result.uri;
}

// Удалить локальный файл
export async function deleteLocalTrack(trackId: string): Promise<void> {
    const localPath = await getLocalPath(trackId);
    if (localPath) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    const tracks = await getLocalTracks();
    const filtered = tracks.filter(t => t.trackId !== trackId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Размер всех скачанных файлов
export async function getStorageUsed(): Promise<number> {
    const tracks = await getLocalTracks();
    let total = 0;
    for (const t of tracks) {
        const info = await FileSystem.getInfoAsync(t.localPath);
        if (info.exists) {
            // @ts-ignore — size есть в рантайме но не в типах этой версии
            total += (info as any).size ?? 0;
        }
    }
    return total;
}