import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { NeoButton } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { PreferencesModal } from '../../src/components/PreferencesModal';

interface ProfileStats {
  matches: number;
  likedPlaces: number;
  likesReceived: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, fetchProfile } = useAuthStore();
  const [stats, setStats] = useState<ProfileStats>({ matches: 0, likedPlaces: 0, likesReceived: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);

  const loadStats = useCallback(async () => {
    if (!profile?.id) return;

    try {
      // Buscar lugares curtidos
      const { count: likedCount } = await supabase
        .from('user_locations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'liked');

      // Buscar matches (chats existentes)
      const { count: matchCount } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);

      // Buscar likes recebidos (outros usuários que curtiram mesmos lugares)
      const { data: myLocations } = await supabase
        .from('user_locations')
        .select('google_place_id')
        .eq('user_id', profile.id)
        .eq('status', 'liked');

      let likesReceived = 0;
      if (myLocations && myLocations.length > 0) {
        const myPlaceIds = myLocations.map(l => l.google_place_id).filter(Boolean);
        if (myPlaceIds.length > 0) {
          const { count } = await supabase
            .from('user_locations')
            .select('*', { count: 'exact', head: true })
            .in('google_place_id', myPlaceIds)
            .eq('status', 'liked')
            .neq('user_id', profile.id);
          likesReceived = count || 0;
        }
      }

      setStats({
        matches: matchCount || 0,
        likedPlaces: likedCount || 0,
        likesReceived,
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchProfile();
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfile();
    await loadStats();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  const handleVerification = () => {
    router.push('/(auth)/verify-identity');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.green}
          colors={[colors.green]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Meu Perfil</Text>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setEditProfileVisible(true)}
          activeOpacity={0.8}
        >
          {profile?.photos?.[0] ? (
            <Image source={{ uri: profile.photos[0] }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarPlaceholder}>👤</Text>
          )}
          <View style={styles.editAvatarBadge}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{profile?.name || 'Usuário'}, {profile?.age || '--'}</Text>

        {profile?.occupation && (
          <Text style={styles.occupation}>{profile.occupation}</Text>
        )}

        {profile?.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        {/* Interesses/Vibes */}
        {profile?.vibes && profile.vibes.length > 0 && (
          <View style={styles.vibesContainer}>
            {profile.vibes.slice(0, 4).map((vibe, i) => (
              <View key={i} style={styles.vibeBadge}>
                <Text style={styles.vibeText}>{vibe}</Text>
              </View>
            ))}
            {profile.vibes.length > 4 && (
              <View style={[styles.vibeBadge, styles.vibeMoreBadge]}>
                <Text style={styles.vibeText}>+{profile.vibes.length - 4}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.matches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.likesReceived}</Text>
          <Text style={styles.statLabel}>Curtidas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.likedPlaces}</Text>
          <Text style={styles.statLabel}>Lugares</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setEditProfileVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: colors.green + '30' }]}>
              <Ionicons name="person-outline" size={18} color={colors.green} />
            </View>
            <Text style={styles.menuText}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setPreferencesVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: colors.yellow + '30' }]}>
              <Ionicons name="options-outline" size={18} color={colors.orange} />
            </View>
            <Text style={styles.menuText}>Preferências</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleVerification}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: colors.blue + '30' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
            </View>
            <Text style={styles.menuText}>Verificação de Identidade</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      <View style={styles.logoutSection}>
        <NeoButton
          title="Sair da Conta"
          onPress={handleSignOut}
          variant="outline"
          color="red"
        />
      </View>

      {/* Modais */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => {
          setEditProfileVisible(false);
          onRefresh();
        }}
      />
      <PreferencesModal
        visible={preferencesVisible}
        onClose={() => {
          setPreferencesVisible(false);
          onRefresh();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + 20,
    backgroundColor: colors.green,
    borderBottomWidth: 3,
    borderBottomColor: colors.black,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: 'bold',
    color: colors.black,
  },
  profileSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.black,
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarPlaceholder: {
    fontSize: 60,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
  },
  occupation: {
    fontSize: 16,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  bio: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 300,
  },
  vibesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  vibeBadge: {
    backgroundColor: colors.blue + '20',
    borderColor: colors.blue,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vibeMoreBadge: {
    backgroundColor: colors.gray200,
    borderColor: colors.gray400,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.black,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
  },
  statLabel: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  menuSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  logoutSection: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
});
