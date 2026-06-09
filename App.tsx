import React, { useState, useCallback, useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library';
import { PlayerProvider } from './src/context/PlayerContext';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { AddTrackScreen } from './src/screens/AddTrackScreen';

type Screen = 'library' | 'player' | 'add';

export default function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [libraryKey, setLibraryKey] = useState(0);

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync(false).catch(() => {
    });
  }, []);

  const handleDownloadComplete = useCallback(() => {
    setLibraryKey(k => k + 1);
  }, []);

  return (
      <SafeAreaProvider>
        <PlayerProvider>
          <StatusBar style="light" />

          <LibraryScreen
              key={libraryKey}
              onOpenPlayer={() => setScreen('player')}
              onOpenAdd={() => setScreen('add')}
          />

          <Modal
              visible={screen === 'player'}
              animationType="slide"
              onRequestClose={() => setScreen('library')}
          >
            <PlayerScreen onClose={() => setScreen('library')} />
          </Modal>

          <Modal
              visible={screen === 'add'}
              animationType="slide"
              onRequestClose={() => setScreen('library')}
          >
            <AddTrackScreen
                onClose={() => setScreen('library')}
                onDownloadComplete={handleDownloadComplete}
            />
          </Modal>
        </PlayerProvider>
      </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
});