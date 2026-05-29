import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Track, TracksApi, API_KEY } from '../api/client';
import { isDownloaded, downloadTrack, deleteLocalTrack } from '../services/LocalStorageService';

interface Props {
    track: Track;
    onStatusChange?: (downloaded: boolean) => void;
}

export function DownloadButton({ track, onStatusChange }: Props) {
    const [downloaded, setDownloaded] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        isDownloaded(track.id).then(setDownloaded);
    }, [track.id]);

    const handleDownload = async () => {
        setDownloading(true);
        setProgress(0);
        try {
            await downloadTrack(
                track.id,
                TracksApi.getStreamUrl(track.id),
                track.fileExtension,
                API_KEY,
                setProgress
            );
            setDownloaded(true);
            onStatusChange?.(true);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось скачать трек');
        } finally {
            setDownloading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Удалить локальную копию?', 'Трек останется на сервере, но будет стримиться.', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить', style: 'destructive',
                onPress: async () => {
                    await deleteLocalTrack(track.id);
                    setDownloaded(false);
                    onStatusChange?.(false);
                }
            }
        ]);
    };

    if (downloading) {
        return (
            <TouchableOpacity style={styles.btn} disabled>
                <ActivityIndicator size="small" color="#6c63ff" />
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            </TouchableOpacity>
        );
    }

    if (downloaded) {
        return (
            <TouchableOpacity style={[styles.btn, styles.downloaded]} onPress={handleDelete}>
                <Text style={styles.downloadedText}>✓ На устройстве</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.btn} onPress={handleDownload}>
            <Text style={styles.btnText}>⬇ Скачать</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#1a1a2e',
    },
    btnText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
    downloaded: { backgroundColor: '#1a2e1a' },
    downloadedText: { color: '#4caf50', fontSize: 13, fontWeight: '600' },
    progressText: { color: '#6c63ff', fontSize: 13, marginLeft: 4 },
});