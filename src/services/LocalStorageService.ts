import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TRACK_LIST_KEY    = 'track_list_cache';   
const DEVICE_DL_KEY     = 'downloaded_tracks';  
const TEMP_DIR          = FileSystem.cacheDirectory + 'ytaudio-temp/';


interface CachedTrack {
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

interface DownloadEntry {
    trackId: string;
    assetId: string;
    filename: string;
    downloadedAt: number;
}


export async function saveTrackList(tracks: CachedTrack[]): Promise<void> {
    await AsyncStorage.setItem(TRACK_LIST_KEY, JSON.stringify(tracks));
}

export async function getTrackList(): Promise<CachedTrack[]> {
    try {
        const raw = await AsyncStorage.getItem(TRACK_LIST_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}


async function _getRegistry(): Promise<DownloadEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(DEVICE_DL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function _saveRegistry(entries: DownloadEntry[]): Promise<void> {
    await AsyncStorage.setItem(DEVICE_DL_KEY, JSON.stringify(entries));
}

export async function downloadTrack(
    track: { id: string; title: string; fileExtension: string },
    downloadUrl: string,
    onProgress?: (progress: number) => void,
): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync(false);
    if (status !== 'granted') {
        throw new Error('Нет разрешения на доступ к медиатеке устройства');
    }

    await FileSystem.makeDirectoryAsync(TEMP_DIR, { intermediates: true });

    const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'track';
    const filename  = `${safeTitle}.${track.fileExtension}`;
    const tempPath  = TEMP_DIR + filename;

    const dl = FileSystem.createDownloadResumable(
        downloadUrl,
        tempPath,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
            if (totalBytesExpectedToWrite > 0)
                onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
        },
    );

    const result = await dl.downloadAsync();
    if (!result?.uri) throw new Error('Загрузка не удалась');

    const asset = await MediaLibrary.createAssetAsync(result.uri);
    await FileSystem.deleteAsync(result.uri, { idempotent: true });

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

    const registry = await _getRegistry();
    const filtered = registry.filter(e => e.trackId !== track.id);
    filtered.push({ trackId: track.id, assetId: asset.id, filename, downloadedAt: Date.now() });
    await _saveRegistry(filtered);
}

export async function isDownloaded(trackId: string): Promise<boolean> {
    try {
        const entry = (await _getRegistry()).find(e => e.trackId === trackId);
        if (!entry) return false;
        const info = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return !!info;
    } catch {
        return false;
    }
}

export async function getLocalPath(trackId: string): Promise<string | null> {
    try {
        const entry = (await _getRegistry()).find(e => e.trackId === trackId);
        if (!entry) return null;
        const info = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return info?.localUri ?? null;
    } catch {
        return null;
    }
}

export async function removeDownload(trackId: string): Promise<void> {
    const registry = await _getRegistry();
    const entry = registry.find(e => e.trackId === trackId);
    if (!entry) return;
    try { await MediaLibrary.deleteAssetsAsync([entry.assetId]); } catch {}
    await _saveRegistry(registry.filter(e => e.trackId !== trackId));
}