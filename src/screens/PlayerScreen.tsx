import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlayer } from '../context/PlayerContext';
import { DownloadButton } from '../components/DownloadButton';

interface Props {
    onClose: () => void;
}

export function PlayerScreen({ onClose }: Props) {
    const { currentTrack, isPlaying, isLoading, isLocal, position, duration, togglePlayPause, seekTo } = usePlayer();

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!currentTrack) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.centered}>
                    <Text style={styles.noTrack}>Ничего не играет</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Artwork */}
            <View style={styles.artworkContainer}>
                {currentTrack.thumbnailUrl
                    ? <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.artwork} />
                    : <View style={styles.artworkPlaceholder}>
                        <Text style={styles.artworkEmoji}>♪</Text>
                    </View>
                }
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text>
                <Text style={styles.artist}>{currentTrack.artist ?? 'Unknown Artist'}</Text>

                {/* Локальный или стрим + кнопка скачать */}
                <View style={styles.statusRow}>
                    <Text style={[styles.sourceTag, isLocal ? styles.sourceLocal : styles.sourceStream]}>
                        {isLocal ? '📱 На устройстве' : '☁️ Стриминг'}
                    </Text>
                    {!isLocal && <DownloadButton track={currentTrack} />}
                </View>
            </View>

            {/* Slider */}
            <View style={styles.sliderContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={position}
                    onSlidingComplete={seekTo}
                    minimumTrackTintColor="#6c63ff"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#6c63ff"
                />
                <View style={styles.timeRow}>
                    <Text style={styles.time}>{fmt(position)}</Text>
                    <Text style={styles.time}>{fmt(duration)}</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.seekBtn}
                    onPress={() => seekTo(Math.max(0, position - 15))}
                >
                    <Text style={styles.seekBtnText}>↺ 15</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
                    {isLoading
                        ? <ActivityIndicator color="#fff" size="large" />
                        : <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.seekBtn}
                    onPress={() => seekTo(Math.min(duration, position + 15))}
                >
                    <Text style={styles.seekBtnText}>15 ↻</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', paddingHorizontal: 24 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noTrack: { color: '#666', fontSize: 16 },
    closeBtn: { marginTop: 48, alignSelf: 'flex-start' },
    closeBtnText: { color: '#aaa', fontSize: 20 },
    artworkContainer: { alignItems: 'center', marginTop: 32 },
    artwork: { width: 260, height: 260, borderRadius: 16 },
    artworkPlaceholder: {
        width: 260, height: 260, borderRadius: 16,
        backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center'
    },
    artworkEmoji: { fontSize: 80 },
    info: { marginTop: 24, alignItems: 'center' },
    title: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    artist: { color: '#aaa', fontSize: 15, marginTop: 6 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    sourceTag: { fontSize: 12, fontWeight: '600' },
    sourceLocal: { color: '#4caf50' },
    sourceStream: { color: '#6c63ff' },
    sliderContainer: { marginTop: 28 },
    slider: { width: '100%', height: 40 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
    time: { color: '#666', fontSize: 12 },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, gap: 32 },
    seekBtn: { padding: 12 },
    seekBtnText: { color: '#aaa', fontSize: 16 },
    playBtn: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center'
    },
    playBtnText: { fontSize: 28 },
});