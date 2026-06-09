import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DOWNLOAD_METADATA_KEY = 'downloaded_tracks';
const TEMP_DIR = FileSystem.cacheDirectory + 'ytaudio-temp/';

interface DownloadEntry {
    trackId: string;
    assetId: string;
    filename: string;
    downloadedAt: number;
}

async function getDownloadRegistry(): Promise<DownloadEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function saveDownloadRegistry(entries: DownloadEntry[]): Promise<void> {
    await AsyncStorage.setItem(DOWNLOAD_METADATA_KEY, JSON.stringify(entries));
}

export async function downloadTrack(
    track: { id: string; title: string; fileExtension: string },
    downloadUrl: string
): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync(false);
    if (status !== 'granted') {
        throw new Error('Нет разрешения на доступ к медиатеке устройства');
    }

    await FileSystem.makeDirectoryAsync(TEMP_DIR, { intermediates: true });

    const safeTitle = track.title.replace(/[^\w\s-]/g, '').trim() || 'track';
    const filename = `${safeTitle}.${track.fileExtension}`;
    const tempPath = TEMP_DIR + filename;

    const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        tempPath
    );

    const result = await downloadResumable.downloadAsync();
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

    const registry = await getDownloadRegistry();
    const filtered = registry.filter(e => e.trackId !== track.id);
    filtered.push({
        trackId: track.id,
        assetId: asset.id,
        filename,
        downloadedAt: Date.now(),
    });
    await saveDownloadRegistry(filtered);
}

export async function isDownloaded(trackId: string): Promise<boolean> {
    try {
        const registry = await getDownloadRegistry();
        const entry = registry.find(e => e.trackId === trackId);
        if (!entry) return false;
        const info = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return !!info;
    } catch {
        return false;
    }
}

export async function getLocalPath(trackId: string): Promise<string | null> {
    try {
        const registry = await getDownloadRegistry();
        const entry = registry.find(e => e.trackId === trackId);
        if (!entry) return null;
        const assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        return assetInfo?.localUri ?? null;
    } catch {
        return null;
    }
}

export async function removeDownload(trackId: string): Promise<void> {
    const registry = await getDownloadRegistry();
    const entry = registry.find(e => e.trackId === trackId);
    if (!entry) return;

    try {
        await MediaLibrary.deleteAssetsAsync([entry.assetId]);
    } catch {
    }

    const updated = registry.filter(e => e.trackId !== trackId);
    await saveDownloadRegistry(updated);
}