import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useMapMarkers } from '@/hooks/use-map-markers';

export function TripMap() {
  const { markers, errorMessage, isLoading, reloadMarkers } = useMapMarkers();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.panel}>
        <ThemedText type="subtitle" style={styles.title}>
          모바일에서 지도를 확인하세요
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          지도 마킹 MVP는 Expo Go의 Android/iOS 환경을 우선 지원합니다. 웹에서는 저장된 마커
          상태만 확인할 수 있어요.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.statusBox}>
          <ThemedText type="smallBold">저장된 마커</ThemedText>
          <ThemedText type="title" style={styles.count}>
            {isLoading ? '-' : markers.length}
          </ThemedText>
          {errorMessage && <ThemedText type="small">{errorMessage}</ThemedText>}
        </ThemedView>

        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={reloadMarkers}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            새로고침
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  statusBox: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    padding: Spacing.four,
  },
  count: {
    fontSize: 56,
    lineHeight: 60,
  },
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0F766E',
    paddingHorizontal: Spacing.three,
  },
  buttonText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.76,
  },
});

