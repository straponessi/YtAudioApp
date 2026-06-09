import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { DownloadsApi, DownloadTask } from '../api/client';

interface Props {
    onClose: () => void;
    onDownloadComplete: () => void;
}

export function AddTrackScreen({ onClose, onDownloadComplete }: Props) {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [task, setTask] = useState<DownloadTask | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!task || task.status === 'Completed' || task.status === 'Failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (task?.status === 'Completed') {
                setTimeout(() => {
                    onDownloadComplete();
                    onClose();
                }, 1500);
            }
            return;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await DownloadsApi.getStatus(task.id);
                setTask(res.data);
            } catch {}
        }, 2000);

        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [task?.status]);

    const handleSubmit = async () => {
        if (!url.trim()) return;
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            Alert.alert('Ошибка', 'Вставь ссылку с YouTube');
            return;
        }

        setSubmitting(true);
        try {
            const res = await DownloadsApi.submit(url.trim());
            setTask(res.data);
            setUrl('');
        } catch (e: any) {
            Alert.alert('Ошибка', e.response?.data?.error ?? 'Не удалось отправить задачу');
        } finally {
            setSubmitting(false);
        }
    };

    const statusLabel = {
        Pending: '⏳ В очереди...',
        Processing: '⬇ Скачивается...',
        Completed: '✅ Готово!',
        Failed: '❌ Ошибка',
    };

    const statusColor = {
        Pending: '#aaa',
        Processing: '#6c63ff',
        Completed: '#4caf50',
        Failed: '#f44336',
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Добавить трек</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.label}>Ссылка на YouTube</Text>
                <TextInput
                    style={styles.input}
                    placeholder="https://youtube.com/watch?v=..."
                    placeholderTextColor="#444"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    multiline
                />

                <TouchableOpacity
                    style={[styles.submitBtn, (!url.trim() || submitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!url.trim() || submitting}
                >
                    {submitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitBtnText}>Скачать аудио</Text>
                    }
                </TouchableOpacity>

                {/* Статус задачи */}
                {task && (
                    <View style={styles.taskCard}>
                        <Text style={[styles.taskStatus, { color: statusColor[task.status] }]}>
                            {statusLabel[task.status]}
                        </Text>
                        {task.track && (
                            <Text style={styles.taskTitle} numberOfLines={2}>{task.track.title}</Text>
                        )}
                        {task.errorMessage && (
                            <Text style={styles.taskError}>{task.errorMessage}</Text>
                        )}
                        {(task.status === 'Pending' || task.status === 'Processing') && (
                            <ActivityIndicator color="#6c63ff" style={{ marginTop: 12 }} />
                        )}
                    </View>
                )}

                <Text style={styles.hint}>
                    💡 Трек скачается в лучшем доступном качестве.{'\n'}
                    Обычно это формат opus или m4a.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#1a1a2e'
    },
    title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    closeText: { color: '#aaa', fontSize: 20 },
    content: { padding: 24 },
    label: { color: '#aaa', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: {
        backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 12,
        padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top'
    },
    submitBtn: {
        backgroundColor: '#6c63ff', borderRadius: 12,
        padding: 16, alignItems: 'center', marginTop: 16
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    taskCard: {
        backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginTop: 24
    },
    taskStatus: { fontSize: 16, fontWeight: '600' },
    taskTitle: { color: '#fff', fontSize: 14, marginTop: 8 },
    taskError: { color: '#f44336', fontSize: 13, marginTop: 8 },
    hint: { color: '#444', fontSize: 13, marginTop: 32, lineHeight: 20 },
});
