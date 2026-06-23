import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, type LongPressEvent } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useMapMarkers } from '@/hooks/use-map-markers';

const KOREA_REGION = {
  latitude: 36.5,
  longitude: 127.8,
  latitudeDelta: 7.2,
  longitudeDelta: 6.5,
};

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function TripMap() {
  const {
    markers,
    selectedMarker,
    selectedMarkerId,
    isLoading,
    errorMessage,
    addMarker,
    deleteSelectedMarker,
    selectMarker,
  } = useMapMarkers();

  const handleLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void addMarker({ latitude, longitude });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={KOREA_REGION}
        onLongPress={handleLongPress}
        onPress={() => selectMarker(null)}>
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            pinColor={marker.id === selectedMarkerId ? '#0F766E' : '#E11D48'}
            title={marker.title}
            onPress={() => selectMarker(marker.id)}>
            <Callout>
              <View style={styles.callout}>
                <ThemedText type="smallBold">{marker.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatCoordinate(marker.latitude)}, {formatCoordinate(marker.longitude)}
                </ThemedText>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topPanel}>
          <ThemedText type="smallBold" style={styles.panelTitle}>
            국내여행 지도
          </ThemedText>
          <ThemedText type="small" style={styles.panelDescription}>
            지도를 길게 눌러 위치를 마킹하세요.
          </ThemedText>
        </View>

        <View style={styles.bottomPanel}>
          {errorMessage && (
            <ThemedText type="small" style={styles.panelTitle}>
              {errorMessage}
            </ThemedText>
          )}
          <ThemedText type="small" style={styles.panelDescription}>
            {isLoading ? '마커를 불러오는 중' : `저장된 마커 ${markers.length}개`}
          </ThemedText>
          <Pressable
            disabled={!selectedMarker}
            onPress={() => void deleteSelectedMarker()}
            style={({ pressed }) => [
              styles.deleteButton,
              !selectedMarker && styles.deleteButtonDisabled,
              pressed && selectedMarker && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.deleteButtonText}>
              선택 마커 삭제
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  topPanel: {
    alignSelf: 'flex-start',
    maxWidth: 280,
    gap: Spacing.one,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bottomPanel: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: Spacing.three,
  },
  panelTitle: {
    color: '#111827',
  },
  panelDescription: {
    color: '#4B5563',
  },
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#BE123C',
  },
  deleteButtonDisabled: {
    backgroundColor: '#A1A1AA',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.76,
  },
  callout: {
    minWidth: 160,
    gap: Spacing.one,
  },
});
