import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { usePlayer } from '../context/PlayerContext';

interface Props {
    onPress: () => void;
}

export function MiniPlayer({ onPress }: Props) {
    const { currentTrack, isPlaying, isLoading, togglePlayPause } = usePlayer();

    if (!currentTrack) return null;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {currentTrack.artist ?? 'Unknown Artist'}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
            >
                {isLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.buttonText}>{isPlaying ? '⏸' : '▶'}</Text>
                }
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    info: { flex: 1, marginRight: 12 },
    title: { color: '#fff', fontSize: 14, fontWeight: '600' },
    artist: { color: '#aaa', fontSize: 12, marginTop: 2 },
    button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    buttonText: { fontSize: 20 },
});
