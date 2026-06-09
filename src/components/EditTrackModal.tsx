import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, Alert, ScrollView,
} from 'react-native';
import { Track, TracksApi } from '../api/client';

interface Props {
    track: Track | null;
    onClose: () => void;
    onSaved: (updated: Track) => void;
}

export function EditTrackModal({ track, onClose, onSaved }: Props) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (track) {
            setTitle(track.title);
            setArtist(track.artist ?? '');
            setAlbum(track.album ?? '');
        }
    }, [track?.id]);

    const handleSave = async () => {
        if (!track) return;
        if (!title.trim()) {
            Alert.alert('Ошибка', 'Название не может быть пустым');
            return;
        }
        setSaving(true);
        try {
            const res = await TracksApi.patch(track.id, {
                title: title.trim(),
                artist: artist.trim(),   // '' = очистить на сервере
                album: album.trim(),
            });
            onSaved(res.data);
            onClose();
        } catch {
            Alert.alert('Ошибка', 'Не удалось сохранить изменения');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        title !== (track?.title ?? '') ||
        artist !== (track?.artist ?? '') ||
        album !== (track?.album ?? '');

    return (
        <Modal
            visible={!!track}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <Text style={styles.sheetTitle}>Редактировать трек</Text>

                    <ScrollView keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Название</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Название трека"
                            placeholderTextColor="#3a3a5a"
                            selectionColor="#6c63ff"
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Исполнитель</Text>
                        <TextInput
                            style={styles.input}
                            value={artist}
                            onChangeText={setArtist}
                            placeholder="Исполнитель"
                            placeholderTextColor="#3a3a5a"
                            selectionColor="#6c63ff"
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Альбом</Text>
                        <TextInput
                            style={styles.input}
                            value={album}
                            onChangeText={setAlbum}
                            placeholder="Альбом (необязательно)"
                            placeholderTextColor="#3a3a5a"
                            selectionColor="#6c63ff"
                            returnKeyType="done"
                            onSubmitEditing={handleSave}
                        />

                        <Text style={styles.hint}>
                            Оставь поле пустым чтобы очистить его
                        </Text>

                        <View style={styles.buttons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    (!hasChanges || saving) && styles.saveBtnDisabled,
                                ]}
                                onPress={handleSave}
                                disabled={!hasChanges || saving}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.saveText}>Сохранить</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
        backgroundColor: '#12121f',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
        borderColor: '#1e1e35',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#2a2a45',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    label: {
        color: '#555',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1a1a2e',
        color: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#2a2a45',
    },
    hint: {
        color: '#3a3a5a',
        fontSize: 12,
        marginBottom: 24,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2a45',
    },
    cancelText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 15,
    },
    saveBtn: {
        flex: 2,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#6c63ff',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.4,
    },
    saveText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});