import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMapMarkers } from '@/hooks/use-map-markers';
import type { TripMapMarker } from '@/types/map-marker';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export default function MarkerListScreen() {
  const { markers, isLoading, errorMessage, reloadMarkers } = useMapMarkers();

  const renderItem = useCallback(
    ({ item }: { item: TripMapMarker }) => (
      <ThemedView type="backgroundElement" style={styles.markerCard}>
        <View style={styles.markerHeader}>
          <ThemedText type="smallBold">{item.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="code" themeColor="textSecondary">
          {formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}
        </ThemedText>
      </ThemedView>
    ),
    []
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="subtitle">마커</ThemedText>
            <ThemedText themeColor="textSecondary">
              길게 눌러 저장한 여행 후보지를 여기서 확인합니다.
            </ThemedText>
          </View>
          <Pressable style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]} onPress={reloadMarkers}>
            <ThemedText type="smallBold" style={styles.refreshText}>
              새로고침
            </ThemedText>
          </Pressable>
        </View>

        {errorMessage && <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>}

        <FlatList
          data={markers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <ThemedText type="smallBold">
                {isLoading ? '마커를 불러오는 중이에요.' : '아직 저장된 마커가 없어요.'}
              </ThemedText>
              {!isLoading && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDescription}>
                  지도 탭에서 원하는 위치를 길게 눌러 첫 마커를 남겨보세요.
                </ThemedText>
              )}
            </ThemedView>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  refreshButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0F766E',
    paddingHorizontal: Spacing.three,
  },
  refreshText: {
    color: '#FFFFFF',
  },
  errorText: {
    marginBottom: Spacing.two,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  markerCard: {
    gap: Spacing.two,
    borderRadius: 8,
    padding: Spacing.three,
  },
  markerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    padding: Spacing.four,
  },
  emptyDescription: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
  },
});

