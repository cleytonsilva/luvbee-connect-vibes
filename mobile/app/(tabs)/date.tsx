import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { SkeletonBox } from '../../src/components/ui';
import {
  getCompatiblePeople,
  getCompatibilityStats,
  CompatiblePerson
} from '../../src/services/compatibilityService';
import { TiltCarousel } from '../../src/components/cards';

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
    // TODO: Navegar para perfil
  };

  const handleLike = (person: CompatiblePerson) => {
    console.log('Curtiu:', person.name);
    // TODO: Registrar preference logic
  };

  const handlePass = (person: CompatiblePerson) => {
    console.log('Passou:', person.name);
    // TODO: Registrar preference logic
  };

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
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TiltCarousel
            data={people}
            onLike={handleLike}
            onPass={handlePass}
            onPressItem={handlePersonPress}
          />
        </View>
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
    width: (Dimensions.get('window').width - 48) / 2,
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
