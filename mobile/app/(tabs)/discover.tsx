import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import {
  searchNearbyPlaces,
  likeLocation,
  passLocation,
  getPlaceLikesCount,
  LocationWithStats
} from '../../src/services/locationService';
import { getUserLocation, UserLocation } from '../../src/services/geolocationService';
import { PlaceCard, SwipeableCard } from '../../src/components/cards';
import { ActionButtons, PlaceCardSkeleton } from '../../src/components/ui';
import { PlaceDetailModal } from '../../src/components/PlaceDetailModal';
import { StackedCards } from '../../src/components/cards/StackedCards';

export default function DiscoverScreen() {
  const { user, profile } = useAuthStore();
  const [places, setPlaces] = useState<LocationWithStats[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentLikesCount, setCurrentLikesCount] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const loadPlaces = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const location = await getUserLocation(
        profile?.location,
        profile?.latitude,
        profile?.longitude,
        profile?.state_province,
        profile?.country
      );
      setUserLocation(location);

      const locations = await searchNearbyPlaces(location.latitude, location.longitude, 10000, undefined, user.id);
      setPlaces(locations);
      setCurrentIndex(0);

      const sourceLabel = location.source === 'gps' ? 'GPS' :
        location.source === 'profile' ? 'perfil' :
          location.source === 'geocoded' ? 'cidade do cadastro' : 'padrão';
      console.log(`✅ ${locations.length} lugares encontrados via ${sourceLabel} `);
    } catch (err: any) {
      console.error('Erro ao carregar lugares:', err);
      setError('Não foi possível carregar os lugares. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, profile?.location, profile?.latitude, profile?.longitude]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const currentPlace = places[currentIndex];
  const nextPlace = places[currentIndex + 1];

  const goToNext = useCallback(() => {
    if (currentIndex < places.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      loadPlaces();
    }
  }, [currentIndex, places.length, loadPlaces]);

  const handleLike = useCallback(async () => {
    if (!currentPlace || !user?.id || actionLoading) return;

    setActionLoading(true);
    try {
      const placeData = (currentPlace as any)._googlePlaceData;
      await likeLocation(user.id, currentPlace.id, placeData);
      goToNext();
    } catch (err) {
      console.error('Erro ao curtir:', err);
    } finally {
      setActionLoading(false);
    }
  }, [currentPlace, user?.id, actionLoading, goToNext]);

  const handlePass = useCallback(async () => {
    if (!currentPlace || !user?.id || actionLoading) return;

    setActionLoading(true);
    try {
      const placeData = (currentPlace as any)._googlePlaceData;
      await passLocation(user.id, currentPlace.id, placeData);
      goToNext();
    } catch (err) {
      console.error('Erro ao passar:', err);
    } finally {
      setActionLoading(false);
    }
  }, [currentPlace, user?.id, actionLoading, goToNext]);

  const openDetails = useCallback(async () => {
    if (!currentPlace) return;
    const likesCount = await getPlaceLikesCount(currentPlace.id);
    setCurrentLikesCount(likesCount);
    setDetailsModalVisible(true);
  }, [currentPlace]);

  const closeDetails = () => {
    setDetailsModalVisible(false);
  };

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Descobrir</Text>
          <Text style={styles.subtitle}>Buscando lugares incríveis...</Text>
        </View>
        <View style={styles.cardContainer}>
          <PlaceCardSkeleton />
        </View>
      </View>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Descobrir</Text>
          <Text style={styles.subtitle}>Lugares perto de você</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.emptyText}>Ops! Algo deu errado</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaces}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- EMPTY STATE ---
  if (!currentPlace) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Descobrir</Text>
          <Text style={styles.subtitle}>Lugares perto de você</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.emptyText}>Você viu todos os lugares!</Text>
          <Text style={styles.emptySubtext}>Volte mais tarde para descobrir novos spots</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaces}>
            <Text style={styles.retryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- MAIN UI ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Descobrir</Text>
        <Text style={styles.subtitle}>
          {currentIndex + 1} de {places.length} lugares
          {userLocation?.cityName ? ` • ${userLocation.cityName} ` : ''}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <StackedCards
          data={places}
          currentIndex={currentIndex}
          onLike={handleLike}
          onPass={handlePass}
          onTap={openDetails}
          actionLoading={actionLoading}
          renderTopCard={(item) => <PlaceCard place={item} showFullDetails={true} />}
          renderBackgroundCard={(item) => <PlaceCard place={item} showFullDetails={false} />}
          stackDepth={2}
        />
      </View>

      {/* Botões de ação animados */}
      <View style={styles.actionsContainer}>
        <ActionButtons
          onPass={handlePass}
          onLike={handleLike}
          onDetails={openDetails}
          disabled={actionLoading}
        />
        <Text style={styles.swipeHint}>
          ← Deslize para passar • Toque para detalhes • Deslize para curtir →
        </Text>
      </View>

      {/* Modal de detalhes */}
      <PlaceDetailModal
        visible={detailsModalVisible}
        place={currentPlace}
        onClose={closeDetails}
        likesCount={currentLikesCount}
        isLiked={false}
        showActions={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + 20,
    backgroundColor: colors.yellow,
    borderBottomWidth: 3,
    borderBottomColor: colors.black,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: 'bold',
    color: colors.black,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray700,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionsContainer: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  swipeHint: {
    fontSize: 11,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.black,
  },
  retryButtonText: {
    fontWeight: 'bold',
    color: colors.black,
    fontSize: 16,
  },
});
