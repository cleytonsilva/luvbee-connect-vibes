import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { getLikedLocations, unlikeLocation, getPlaceLikesCount, LocationWithStats } from '../../src/services/locationService';
import { PlaceListCard } from '../../src/components/cards';
import { SkeletonList } from '../../src/components/ui';
import { PlaceDetailModal } from '../../src/components/PlaceDetailModal';

export default function PlacesScreen() {
  const { user } = useAuthStore();
  const [likedPlaces, setLikedPlaces] = useState<LocationWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado do modal
  const [selectedPlace, setSelectedPlace] = useState<LocationWithStats | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentLikesCount, setCurrentLikesCount] = useState(0);

  const loadLikedPlaces = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const places = await getLikedLocations(user.id);
      setLikedPlaces(places);
    } catch (err: any) {
      console.error('Erro ao carregar lugares curtidos:', err);
      setError('Não foi possível carregar seus lugares.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLikedPlaces();
  }, [loadLikedPlaces]);

  const onRefresh = () => loadLikedPlaces(true);

  const openDetails = async (place: LocationWithStats) => {
    setSelectedPlace(place);
    const likesCount = await getPlaceLikesCount(place.id);
    setCurrentLikesCount(likesCount);
    setDetailsModalVisible(true);
  };

  const closeDetails = () => {
    setDetailsModalVisible(false);
    setSelectedPlace(null);
  };

  const handleUnlike = () => {
    if (!selectedPlace || !user?.id) return;

    Alert.alert(
      'Descurtir lugar',
      `Tem certeza que deseja remover "${selectedPlace.name}" dos seus lugares?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descurtir',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlikeLocation(user.id, selectedPlace.id);
              setLikedPlaces(prev => prev.filter(p => p.id !== selectedPlace.id));
              closeDetails();
            } catch (err) {
              console.error('Erro ao descurtir:', err);
              Alert.alert('Erro', 'Não foi possível descurtir o lugar. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const handleQuickUnlike = (place: LocationWithStats) => {
    if (!user?.id) return;
    Alert.alert(
      'Descurtir lugar',
      `Remover "${place.name}" dos seus lugares?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descurtir',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlikeLocation(user.id, place.id);
              setLikedPlaces(prev => prev.filter(p => p.id !== place.id));
            } catch (err) {
              console.error('Erro ao descurtir:', err);
              Alert.alert('Erro', 'Não foi possível descurtir o lugar.');
            }
          },
        },
      ]
    );
  };

  const renderPlace = ({ item, index }: { item: LocationWithStats; index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <PlaceListCard
          place={item}
          onPress={() => openDetails(item)}
          onLongPress={() => handleQuickUnlike(item)}
        />
      </Animated.View>
    );
  };

  // --- LOADING com Skeleton ---
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Lugares</Text>
          <Text style={styles.subtitle}>Carregando...</Text>
        </View>
        <SkeletonList count={6} type="list" />
      </View>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Lugares</Text>
          <Text style={styles.subtitle}>Erro</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.emptyText}>Ops! Algo deu errado</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadLikedPlaces()}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus Lugares</Text>
        <Text style={styles.subtitle}>
          {likedPlaces.length} lugar{likedPlaces.length !== 1 ? 'es' : ''} curtido{likedPlaces.length !== 1 ? 's' : ''}
        </Text>
        {likedPlaces.length > 0 && (
          <Text style={styles.hintText}>Toque para detalhes · Segure para remover</Text>
        )}
      </View>

      {likedPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.emptyText}>Nenhum lugar salvo</Text>
          <Text style={styles.emptySubtext}>
            Curta lugares na aba Descobrir para salvá-los aqui!
          </Text>
        </View>
      ) : (
        <FlatList
          data={likedPlaces}
          renderItem={renderPlace}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.blue}
              colors={[colors.blue]}
            />
          }
        />
      )}

      {/* Modal de detalhes */}
      <PlaceDetailModal
        visible={detailsModalVisible}
        place={selectedPlace}
        onClose={closeDetails}
        onUnlike={handleUnlike}
        likesCount={currentLikesCount}
        isLiked={true}
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
    backgroundColor: colors.blue,
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
  hintText: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 4,
    fontStyle: 'italic',
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    maxWidth: 280,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.black,
  },
  retryButtonText: {
    fontWeight: 'bold',
    color: colors.white,
    fontSize: 16,
  },
});
