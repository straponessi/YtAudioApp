import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Track, TracksApi, API_KEY } from '../api/client';
import { getLocalPath } from '../services/LocalStorageService';

interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    isLoading: boolean;
    isLocal: boolean;
    position: number;
    duration: number;
}

interface PlayerContextValue extends PlayerState {
    play: (track: Track) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    stop: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const soundRef = useRef<Audio.Sound | null>(null);
    const playIdRef = useRef(0); // инкрементируется при каждом вызове play()

    const [state, setState] = useState<PlayerState>({
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        isLocal: false,
        position: 0,
        duration: 0,
    });

    const unloadCurrent = async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
    };

    const play = useCallback(async (track: Track) => {
        const myId = ++playIdRef.current;

        setState(s => ({ ...s, isLoading: true, currentTrack: track }));

        await unloadCurrent();

        await Audio.setAudioModeAsync({
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
        });

        const localPath = await getLocalPath(track.id);

        // Пока мы ждали — мог прийти новый вызов play(). Выходим.
        if (myId !== playIdRef.current) return;

        const isLocal = !!localPath;
        const uri = isLocal ? localPath! : TracksApi.getStreamUrl(track.id);

        const { sound } = await Audio.Sound.createAsync(
            {
                uri,
                headers: isLocal ? undefined : { 'X-Api-Key': API_KEY },
                overrideFileExtensionAndroid: 'opus',
            },
            { shouldPlay: true },
            (status) => {
                if (!status.isLoaded) return;
                setState(s => ({
                    ...s,
                    isPlaying: status.isPlaying,
                    position: (status.positionMillis ?? 0) / 1000,
                    duration: (status.durationMillis ?? 0) / 1000,
                    isLoading: false,
                }));
            }
        );

        if (myId !== playIdRef.current) {
            await sound.unloadAsync();
            return;
        }

        soundRef.current = sound;
        setState(s => ({ ...s, isLoading: false, isPlaying: true, isLocal }));
    }, []);

    const togglePlayPause = useCallback(async () => {
        if (!soundRef.current) return;
        if (state.isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            await soundRef.current.playAsync();
        }
    }, [state.isPlaying]);

    const seekTo = useCallback(async (seconds: number) => {
        if (!soundRef.current) return;
        await soundRef.current.setPositionAsync(seconds * 1000);
    }, []);

    const stop = useCallback(async () => {
        playIdRef.current++; 
        await unloadCurrent();
        setState({
            currentTrack: null,
            isPlaying: false,
            isLoading: false,
            isLocal: false,
            position: 0,
            duration: 0,
        });
    }, []);

    return (
        <PlayerContext.Provider value={{ ...state, play, togglePlayPause, seekTo, stop }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
    return ctx;
}