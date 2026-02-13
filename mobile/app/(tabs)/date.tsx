import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { SkeletonBox } from '../../src/components/ui';
import {
  getCompatiblePeople,
  getCompatibilityStats,
  CompatiblePerson
} from '../../src/services/compatibilityService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function getCompatibilityColor(compatibility: number) {
  if (compatibility >= 80) return colors.green;
  if (compatibility >= 60) return colors.yellow;
  return colors.orange;
}

export default function DateScreen() {
  const { user } = useAuthStore();
  const [people, setPeople] = useState<CompatiblePerson[]>([]);
  const [stats, setStats] = useState({ totalCompatible: 0, totalCommonPlaces: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompatiblePeople = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [compatiblePeople, compatibilityStats] = await Promise.all([
        getCompatiblePeople(user.id),
        getCompatibilityStats(user.id),
      ]);

      setPeople(compatiblePeople);
      setStats(compatibilityStats);
    } catch (err: any) {
      console.error('Erro ao carregar pessoas compatíveis:', err);
      setError('Não foi possível carregar pessoas compatíveis.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCompatiblePeople();
  }, [loadCompatiblePeople]);

  const onRefresh = () => loadCompatiblePeople(true);

  const handlePersonPress = (person: CompatiblePerson) => {
    console.log('Clicou em:', person.name);
    // TODO: Navegar para perfil ou iniciar chat
  };

  const renderPerson = ({ item, index }: { item: CompatiblePerson; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 70).springify()}>
      <TouchableOpacity
        style={styles.personCard}
        activeOpacity={0.8}
        onPress={() => handlePersonPress(item)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.photo }}
            style={styles.personImage}
            contentFit="cover"
            transition={200}
          />

          <View style={[styles.compatibilityBadge, { backgroundColor: getCompatibilityColor(item.compatibility) }]}>
            <Text style={styles.compatibilityText}>{item.compatibility}%</Text>
          </View>

          {item.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{item.name}</Text>

          <View style={styles.commonPlacesInfo}>
            <Ionicons name="location" size={12} color={colors.pink} />
            <Text style={styles.commonPlacesText}>
              {item.commonPlacesCount} lugar{item.commonPlacesCount > 1 ? 'es' : ''} em comum
            </Text>
          </View>

          {item.commonPlaces.length > 0 && (
            <Text style={styles.commonPlacesList} numberOfLines={1}>
              {item.commonPlaces.slice(0, 2).join(', ')}
            </Text>
          )}

          <View style={styles.vibesContainer}>
            {item.vibes.slice(0, 2).map((vibe, idx) => (
              <View key={idx} style={styles.vibeBadge}>
                <Text style={styles.vibeText}>{vibe}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.lastActive}>{item.lastActive}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Loading state com skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Date 💕</Text>
          <Text style={styles.subtitle}>Buscando conexões...</Text>
        </View>
        <View style={styles.skeletonStats}>
          <SkeletonBox width={80} height={32} borderRadius={8} />
          <SkeletonBox width={80} height={32} borderRadius={8} />
        </View>
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonBox width="100%" height={CARD_WIDTH * 1.2} borderRadius={0} />
              <View style={{ padding: 8, gap: 6 }}>
                <SkeletonBox width="60%" height={16} borderRadius={4} />
                <SkeletonBox width="80%" height={12} borderRadius={4} />
                <SkeletonBox width="40%" height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Date 💕</Text>
          <Text style={styles.subtitle}>Erro</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.emptyText}>Ops! Algo deu errado</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadCompatiblePeople()}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Date 💕</Text>
        <Text style={styles.subtitle}>Pessoas que curtem os mesmos lugares</Text>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalCompatible}</Text>
          <Text style={styles.statLabel}>Compatíveis</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalCommonPlaces}</Text>
          <Text style={styles.statLabel}>Lugares em comum</Text>
        </View>
      </View>

      {people.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>💝</Text>
          <Text style={styles.emptyText}>Nenhuma pessoa compatível ainda</Text>
          <Text style={styles.emptySubtext}>
            Curta mais lugares na aba Descobrir para encontrar pessoas com gostos parecidos!
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadCompatiblePeople()}>
            <Text style={styles.retryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={people}
          renderItem={renderPerson}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
              colors={[colors.pink]}
            />
          }
        />
      )}
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
    backgroundColor: colors.pink,
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.pink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray500,
  },
  statDivider: {
    width: 2,
    height: 30,
    backgroundColor: colors.gray200,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  personCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  personImage: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
  },
  compatibilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.black,
  },
  compatibilityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.black,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
  },
  personInfo: {
    padding: spacing.sm,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 4,
  },
  commonPlacesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  commonPlacesText: {
    fontSize: 11,
    color: colors.pink,
    fontWeight: '500',
  },
  commonPlacesList: {
    fontSize: 10,
    color: colors.gray500,
    marginBottom: 6,
  },
  vibesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  vibeBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  vibeText: {
    fontSize: 10,
    color: colors.gray600,
  },
  lastActive: {
    fontSize: 10,
    color: colors.gray400,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray200,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gray200,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.pink,
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
