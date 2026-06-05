import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TEMP_DIR = `${(FileSystem as any).cacheDirectory ?? ''}ytaudio-temp/`;

const STORAGE_KEY = 'downloaded_tracks_v2';
const TRACKS_CACHE_KEY = 'tracks_cache';

export interface LocalTrack {
    trackId: string;
    assetId: string;    
    downloadedAt: string;
}

export async function cacheTrackList(tracks: any[]): Promise<void> {
    await AsyncStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(tracks));
}

export async function getCachedTrackList(): Promise<any[]> {
    const raw = await AsyncStorage.getItem(TRACKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function ensureTempDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(TEMP_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(TEMP_DIR, { intermediates: true });
    }
}

export async function getLocalTracks(): Promise<LocalTrack[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function removeFromStorage(trackId: string): Promise<void> {
    const tracks = await getLocalTracks();
    const filtered = tracks.filter(t => t.trackId !== trackId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function isDownloaded(trackId: string): Promise<boolean> {
    const tracks = await getLocalTracks();
    const entry = tracks.find(t => t.trackId === trackId);
    if (!entry) return false;

    try {
        const asset = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return !!asset;
    } catch {
        await removeFromStorage(trackId);
        return false;
    }
}

export async function getLocalPath(trackId: string): Promise<string | null> {
    const tracks = await getLocalTracks();
    const entry = tracks.find(t => t.trackId === trackId);
    if (!entry) return null;

    try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return assetInfo.localUri ?? null;
    } catch {
        await removeFromStorage(trackId);
        return null;
    }
}

export async function downloadTrack(
    trackId: string,
    title: string,
    streamUrl: string,
    fileExtension: string,
    apiKey: string,
    onProgress?: (progress: number) => void,
): Promise<string> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Нет разрешения на доступ к медиатеке устройства');
    }

    await ensureTempDir();
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_');
    const tempPath = `${TEMP_DIR}${safeTitle}.${fileExtension}`;

    const downloadResumable = FileSystem.createDownloadResumable(
        streamUrl,
        tempPath,
        { headers: { 'X-Api-Key': apiKey } },
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
            if (totalBytesExpectedToWrite > 0) {
                onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
            }
        },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('Загрузка не удалась');

    const asset = await MediaLibrary.createAssetAsync(result.uri);

    if (Platform.OS === 'android') {
        try {
            const album = await MediaLibrary.getAlbumAsync('YtAudio');
            if (album) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            } else {
                await MediaLibrary.createAlbumAsync('YtAudio', asset, false);
            }
        } catch {
            
        }
    }

    await FileSystem.deleteAsync(result.uri, { idempotent: true });

    const tracks = await getLocalTracks();
    const filtered = tracks.filter(t => t.trackId !== trackId);
    filtered.push({
        trackId,
        assetId: asset.id,
        downloadedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    return assetInfo.localUri ?? asset.uri;
}

export async function deleteLocalTrack(trackId: string): Promise<void> {
    const tracks = await getLocalTracks();
    const entry = tracks.find(t => t.trackId === trackId);

    if (entry) {
        try {
            await MediaLibrary.deleteAssetsAsync([entry.assetId]);
        } catch {
            
        }
    }

    await removeFromStorage(trackId);
}

export async function getStorageUsed(): Promise<number> {
    const tracks = await getLocalTracks();
    let total = 0;
    for (const t of tracks) {
        try {
            const info = await MediaLibrary.getAssetInfoAsync(t.assetId);
            if (info.localUri) {
                const fileInfo = await FileSystem.getInfoAsync(info.localUri);
                if (fileInfo.exists) {
                    total += (fileInfo as any).size ?? 0;
                }
            }
        } catch { 
            
        }
    }
    return total;
}