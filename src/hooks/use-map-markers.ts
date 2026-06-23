import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TripMapMarker } from '@/types/map-marker';

const STORAGE_KEY = 'trip-map.markers.v1';

function isStoredMarker(value: unknown): value is TripMapMarker {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const marker = value as Partial<TripMapMarker>;
  return (
    typeof marker.id === 'string' &&
    typeof marker.title === 'string' &&
    typeof marker.createdAt === 'string' &&
    typeof marker.latitude === 'number' &&
    typeof marker.longitude === 'number'
  );
}

function createMarkerTitle(markers: TripMapMarker[]) {
  return `마커 ${markers.length + 1}`;
}

function createMarkerId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useMapMarkers() {
  const [markers, setMarkers] = useState<TripMapMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId]
  );

  const saveMarkers = useCallback(async (nextMarkers: TripMapMarker[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMarkers));
      setErrorMessage(null);
    } catch (error) {
      console.warn('Failed to save map markers.', error);
      setErrorMessage('마커를 저장하지 못했어요.');
    }
  }, []);

  const loadMarkers = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (!storedValue) {
        setMarkers([]);
        setErrorMessage(null);
        return;
      }

      const parsedValue: unknown = JSON.parse(storedValue);
      const nextMarkers = Array.isArray(parsedValue) ? parsedValue.filter(isStoredMarker) : [];
      setMarkers(nextMarkers);
      setErrorMessage(null);
    } catch (error) {
      console.warn('Failed to load map markers.', error);
      setErrorMessage('저장된 마커를 불러오지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadMarkers();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadMarkers]);

  const addMarker = useCallback(
    async (coordinate: Pick<TripMapMarker, 'latitude' | 'longitude'>) => {
      const nextMarker: TripMapMarker = {
        id: createMarkerId(),
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        createdAt: new Date().toISOString(),
        title: createMarkerTitle(markers),
      };
      const nextMarkers = [...markers, nextMarker];
      setMarkers(nextMarkers);
      setSelectedMarkerId(nextMarker.id);
      await saveMarkers(nextMarkers);
      return nextMarker;
    },
    [markers, saveMarkers]
  );

  const deleteSelectedMarker = useCallback(async () => {
    if (!selectedMarkerId) {
      return;
    }

    const nextMarkers = markers.filter((marker) => marker.id !== selectedMarkerId);
    setMarkers(nextMarkers);
    setSelectedMarkerId(null);
    await saveMarkers(nextMarkers);
  }, [markers, saveMarkers, selectedMarkerId]);

  return {
    markers,
    selectedMarker,
    selectedMarkerId,
    isLoading,
    errorMessage,
    addMarker,
    deleteSelectedMarker,
    reloadMarkers: loadMarkers,
    selectMarker: setSelectedMarkerId,
  };
}
