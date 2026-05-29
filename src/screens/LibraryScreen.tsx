import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Track, TracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { DownloadButton } from '../components/DownloadButton';
import { cacheTrackList, getCachedTrackList } from '../services/LocalStorageService';


type SortBy = 'title' | 'artist' | 'date';

interface Props {
    onOpenPlayer: () => void;
    onOpenAdd: () => void;
}

export function LibraryScreen({ onOpenPlayer, onOpenAdd }: Props) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { play, currentTrack } = usePlayer();

    const fetchTracks = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);

        // Показать кеш сразу — не ждать сервер
        if (!isRefresh) {
            const cached = await getCachedTrackList();
            if (cached.length > 0) {
                setTracks(cached);
                
                setLoading(false);
            }
        }

        try {
            const res = await TracksApi.getAll(search || undefined, sortBy);
            setTracks(res.data);
            await cacheTrackList(res.data);
        } catch (e) {
            // Кеш уже показан — просто молча игнорируем
            // Показать ошибку только если кеша не было
            const cached = await getCachedTrackList();
            if (cached.length === 0) {
                Alert.alert('Нет подключения', 'Не удалось загрузить треки и кеш пуст.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, sortBy]);

    useEffect(() => { fetchTracks(); }, [fetchTracks]);

    const handleDelete = (track: Track) => {
        Alert.alert('Удалить трек с сервера?', track.title, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить', style: 'destructive',
                onPress: async () => {
                    await TracksApi.delete(track.id);
                    setTracks(t => t.filter(x => x.id !== track.id));
                }
            }
        ]);
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const renderTrack = ({ item }: { item: Track }) => {
        const isActive = currentTrack?.id === item.id;
        return (
            <TouchableOpacity
                style={[styles.trackItem, isActive && styles.trackItemActive]}
                onPress={() => play(item)}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.7}
            >
                <View style={styles.trackInfo}>
                    <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
                        {isActive ? '♪ ' : ''}{item.title}
                    </Text>
                    <Text style={styles.trackMeta}>
                        {item.artist ?? 'Unknown'} · {formatDuration(item.durationSeconds)}
                    </Text>
                    {/* Кнопка скачать/удалить локальную копию */}
                    <View style={styles.trackActions}>
                        <DownloadButton track={item} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6c63ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Библиотека</Text>
                <TouchableOpacity style={styles.addButton} onPress={onOpenAdd}>
                    <Text style={styles.addButtonText}>+ Добавить</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.search}
                placeholder="Поиск треков..."
                placeholderTextColor="#666"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={() => fetchTracks()}
            />

            <View style={styles.sortRow}>
                {(['date', 'title', 'artist'] as SortBy[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
                        onPress={() => setSortBy(s)}
                    >
                        <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
                            {s === 'date' ? 'По дате' : s === 'title' ? 'По названию' : 'По артисту'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={tracks}
                keyExtractor={t => t.id}
                renderItem={renderTrack}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchTracks(true)} tintColor="#6c63ff" />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Треков пока нет</Text>
                        <Text style={styles.emptySubtext}>Нажми «+ Добавить» чтобы скачать первый трек</Text>
                    </View>
                }
            />

            <MiniPlayer onPress={onOpenPlayer} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    addButton: { backgroundColor: '#6c63ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { color: '#fff', fontWeight: '600' },
    search: { margin: 16, marginTop: 0, backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 10, padding: 12, fontSize: 15 },
    sortRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1a1a2e' },
    sortBtnActive: { backgroundColor: '#6c63ff' },
    sortBtnText: { color: '#aaa', fontSize: 12 },
    sortBtnTextActive: { color: '#fff' },
    trackItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
    trackItemActive: { backgroundColor: '#1a1a2e' },
    trackInfo: { flex: 1 },
    trackTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
    trackTitleActive: { color: '#6c63ff' },
    trackMeta: { color: '#666', fontSize: 12, marginTop: 3 },
    trackActions: { marginTop: 8 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
});