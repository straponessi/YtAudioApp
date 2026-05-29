import React, { useState, useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PlayerProvider } from './src/context/PlayerContext';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { AddTrackScreen } from './src/screens/AddTrackScreen';

type Screen = 'library' | 'player' | 'add'; 

export default function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [libraryKey, setLibraryKey] = useState(0);

  const handleDownloadComplete = useCallback(() => {
    setLibraryKey(k => k + 1);
  }, []);

  return (
      <SafeAreaProvider>
        <PlayerProvider>
          <StatusBar style="light" />

          {/* Основной экран — библиотека */}
          <LibraryScreen
              key={libraryKey}
              onOpenPlayer={() => setScreen('player')}
              onOpenAdd={() => setScreen('add')}
          />

          {/* Плеер — модальное окно */}
          <Modal
              visible={screen === 'player'}
              animationType="slide"
              onRequestClose={() => setScreen('library')}
          >
            <PlayerScreen onClose={() => setScreen('library')} />
          </Modal>

          {/* Добавить трек — модальное окно */}
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