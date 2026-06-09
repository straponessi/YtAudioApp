import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, RefreshControl, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Track, TracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { EditTrackModal } from '../components/EditTrackModal';
import { cacheTrackList, getCachedTrackList } from '../services/LocalStorageService';

type SortBy = 'title' | 'artist' | 'date' | 'size';

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
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const { play, currentTrack } = usePlayer();

    const fetchTracks = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);

        if (!isRefresh) {
            try {
                const cached = await getCachedTrackList();
                if (cached.length > 0) {
                    setTracks(cached);
                    setLoading(false);
                }
            } catch {
            }
        }

        try {
            const res = await TracksApi.getAll(search || undefined, sortBy);
            setTracks(res.data);
            await cacheTrackList(res.data).catch(() => {});
        } catch {
            try {
                const cached = await getCachedTrackList();
                if (cached.length === 0) {
                    Alert.alert('Нет подключения', 'Не удалось загрузить треки и кеш пуст.');
                }
            } catch {
                Alert.alert('Нет подключения', 'Не удалось загрузить треки.');
            }
        } finally {
            setLoading(false);   
            setRefreshing(false);
        }
    }, [search, sortBy]);

    useEffect(() => { fetchTracks(); }, [fetchTracks]);

    const handleDelete = (track: Track) => {
        Alert.alert(
            'Удалить трек?',
            `"${track.title}" будет удалён с сервера.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить', style: 'destructive',
                    onPress: async () => {
                        try {
                            await TracksApi.delete(track.id);
                            setTracks(ts => ts.filter(t => t.id !== track.id));
                        } catch {
                            Alert.alert('Ошибка', 'Не удалось удалить трек');
                        }
                    },
                },
            ],
        );
    };

    const handleSaved = (updated: Track) => {
        setTracks(ts => ts.map(t => t.id === updated.id ? updated : t));
    };

    const fmtDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const fmtSize = (b: number) => {
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
        return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    };

    const SORT_OPTIONS: { key: SortBy; label: string }[] = [
        { key: 'date', label: 'По дате' },
        { key: 'title', label: 'По названию' },
        { key: 'artist', label: 'По артисту' },
        { key: 'size', label: 'По размеру' },
    ];

    const renderTrack = ({ item }: { item: Track }) => {
        const isActive = currentTrack?.id === item.id;

        return (
            <TouchableOpacity
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => play(item)}
                activeOpacity={0.75}
            >
                {/* Обложка */}
                <View style={styles.thumb}>
                    {item.thumbnailUrl ? (
                        <Image
                            source={{ uri: item.thumbnailUrl }}
                            style={styles.thumbImg}
                        />
                    ) : (
                        <View style={styles.thumbPlaceholder}>
                            <Text style={styles.thumbEmoji}>♪</Text>
                        </View>
                    )}
                    {isActive && (
                        <View style={styles.thumbOverlay}>
                            <Text style={styles.thumbOverlayIcon}>▶</Text>
                        </View>
                    )}
                </View>

                {/* Инфо */}
                <View style={styles.info}>
                    <Text
                        style={[styles.title, isActive && styles.titleActive]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {item.artist ?? 'Unknown Artist'}
                        {item.album ? <Text style={styles.album}> · {item.album}</Text> : null}
                    </Text>
                    <Text style={styles.meta}>
                        {fmtDuration(item.durationSeconds)} · {fmtSize(item.fileSizeBytes)}
                        {' · '}{item.fileExtension.toUpperCase()}
                    </Text>
                </View>

                {/* Кнопки */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEditingTrack(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                    >
                        <Text style={styles.editIcon}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                    >
                        <Text style={styles.deleteIcon}>✕</Text>
                    </TouchableOpacity>
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
            {/* Заголовок */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Библиотека</Text>
                    <Text style={styles.headerSub}>
                        {tracks.length} {pluralTracks(tracks.length)}
                    </Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={onOpenAdd}>
                    <Text style={styles.addBtnText}>+ Добавить</Text>
                </TouchableOpacity>
            </View>

            {/* Поиск */}
            <TextInput
                style={styles.search}
                placeholder="Поиск треков..."
                placeholderTextColor="#3a3a5a"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={() => fetchTracks()}
                clearButtonMode="while-editing"
            />

            {/* Сортировка */}
            <FlatList
                horizontal
                data={SORT_OPTIONS}
                keyExtractor={o => o.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortRow}
                renderItem={({ item: o }) => (
                    <TouchableOpacity
                        style={[styles.sortBtn, sortBy === o.key && styles.sortBtnActive]}
                        onPress={() => setSortBy(o.key)}
                    >
                        <Text style={[styles.sortBtnText, sortBy === o.key && styles.sortBtnTextActive]}>
                            {o.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Список */}
            <FlatList
                data={tracks}
                keyExtractor={t => t.id}
                renderItem={renderTrack}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchTracks(true)}
                        tintColor="#6c63ff"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>🎵</Text>
                        <Text style={styles.emptyTitle}>Треков пока нет</Text>
                        <Text style={styles.emptySubtitle}>
                            Нажми «+ Добавить» чтобы скачать первый трек
                        </Text>
                    </View>
                }
            />

            <MiniPlayer onPress={onOpenPlayer} />

            <EditTrackModal
                track={editingTrack}
                onClose={() => setEditingTrack(null)}
                onSaved={handleSaved}
            />
        </View>
    );
}

function pluralTracks(n: number) {
    if (n % 10 === 1 && n % 100 !== 11) return 'трек';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'трека';
    return 'треков';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 16,
    },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', letterSpacing: -0.5 },
    headerSub: { color: '#444', fontSize: 12, marginTop: 3 },
    addBtn: {
        backgroundColor: '#6c63ff',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
    },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    search: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#1a1a2e',
        color: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#1e1e35',
    },

    sortRow: { paddingHorizontal: 16, gap: 8, marginBottom: 14 },
    sortBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#1e1e35',
    },
    sortBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
    sortBtnText: { color: '#555', fontSize: 12, fontWeight: '500' },
    sortBtnTextActive: { color: '#fff' },

    list: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#13131f',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: '#1e1e35',
    },
    cardActive: {
        borderColor: '#6c63ff55',
        backgroundColor: '#16152b',
    },

    thumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        flexShrink: 0,
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1e35',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbEmoji: { fontSize: 22 },
    thumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(108, 99, 255, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbOverlayIcon: { color: '#fff', fontSize: 16 },

    info: { flex: 1, marginRight: 6 },
    title: { color: '#e8e8f0', fontSize: 14, fontWeight: '600' },
    titleActive: { color: '#a09aff' },
    artist: { color: '#555', fontSize: 12, marginTop: 2 },
    album: { color: '#444' },
    meta: { color: '#383848', fontSize: 11, marginTop: 4 },

    actions: { gap: 10, alignItems: 'center' },
    actionBtn: { padding: 2 },
    editIcon: { color: '#6c63ff', fontSize: 17 },
    deleteIcon: { color: '#3a3a5a', fontSize: 13 },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
    emptyEmoji: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    emptySubtitle: {
        color: '#444',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
});