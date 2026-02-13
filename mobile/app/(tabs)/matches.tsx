import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, shadows } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { useMatchStore } from '../../src/stores/matchStore';
import { ChatItemSkeleton, AvatarSkeleton } from '../../src/components/ui';

export default function MatchesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { chats, loadChats, isLoading: chatsLoading } = useChatStore();
  const { matches, loadMatches, isLoading: matchesLoading } = useMatchStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = chatsLoading || matchesLoading;

  const loadData = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) {
      setIsRefreshing(true);
    }

    try {
      await Promise.all([
        loadChats(user.id),
        loadMatches(user.id),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, loadChats, loadMatches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => loadData(true);

  const handleChatPress = (chatId: string, matchId: string) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: matchId },
    });
  };

  const getOtherUserName = (chat: any) => {
    return chat.otherUser?.name || 'Usuário';
  };

  const getOtherUserPhoto = (chat: any) => {
    return chat.otherUser?.photos?.[0] || `https://i.pravatar.cc/200?u=${chat.id}`;
  };

  const getUnreadCount = (chat: any) => {
    if (!user?.id) return 0;
    return chat.user_id_1 === user.id ? chat.unread_count_1 : chat.unread_count_2;
  };

  const formatLastActivity = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    return `${diffDays}d`;
  };

  const renderChat = ({ item, index }: { item: any; index: number }) => {
    const unreadCount = getUnreadCount(item);
    const hasUnread = unreadCount > 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <TouchableOpacity
          style={styles.chatItem}
          activeOpacity={0.7}
          onPress={() => handleChatPress(item.id, item.match_id)}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: getOtherUserPhoto(item) }}
              style={styles.avatar}
              contentFit="cover"
            />
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>
                {getOtherUserName(item)}
              </Text>
              <Text style={styles.chatTime}>
                {formatLastActivity(item.updated_at)}
              </Text>
            </View>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.last_message?.content || 'Diga oi! 👋'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // --- LOADING STATE com Skeleton ---
  if (isLoading && !isRefreshing && chats.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>Carregando...</Text>
        </View>
        {/* Skeleton dos novos matches */}
        <View style={styles.newMatchesSkeletonSection}>
          <View style={styles.skeletonRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.newMatchSkeletonItem}>
                <AvatarSkeleton size={60} />
              </View>
            ))}
          </View>
        </View>
        {/* Skeleton das conversas */}
        <View style={styles.chatsSkeleton}>
          {[1, 2, 3, 4, 5].map(i => (
            <ChatItemSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>
          {chats.length} conversa{chats.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* New Matches Section */}
      {matches.length > 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.newMatchesSection}>
          <Text style={styles.sectionTitle}>Novos Matches 💕</Text>
          <FlatList
            data={matches.slice(0, 10)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newMatchesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const otherUser = item.user_id_1 === user?.id ? item.user_2 : item.user_1;
              return (
                <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                  <TouchableOpacity style={styles.newMatchItem} activeOpacity={0.8}>
                    <View style={styles.newMatchAvatarWrapper}>
                      <Image
                        source={{ uri: otherUser?.photos?.[0] || `https://i.pravatar.cc/100?u=${item.id}` }}
                        style={styles.newMatchAvatar}
                        contentFit="cover"
                      />
                    </View>
                    <Text style={styles.newMatchName} numberOfLines={1}>
                      {otherUser?.name?.split(' ')[0] || 'Novo'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />
        </Animated.View>
      )}

      {/* Chats List */}
      {chats.length === 0 ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.emptyMessage}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptySubtitle}>
            Quando você der match com alguém, a conversa aparecerá aqui!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatsList}
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
    backgroundColor: colors.white,
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
  // Skeleton loading
  newMatchesSkeletonSection: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  newMatchSkeletonItem: {
    alignItems: 'center',
    width: 70,
  },
  chatsSkeleton: {
    paddingTop: spacing.sm,
  },
  // New matches
  newMatchesSection: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  newMatchesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  newMatchItem: {
    alignItems: 'center',
    width: 70,
  },
  newMatchAvatarWrapper: {
    borderRadius: 33,
    borderWidth: 3,
    borderColor: colors.pink,
    padding: 2,
  },
  newMatchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  newMatchName: {
    fontSize: 12,
    color: colors.gray700,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Chat list
  chatsList: {
    paddingVertical: spacing.sm,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.pink,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  unreadText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  chatNameUnread: {
    fontWeight: 'bold',
  },
  chatTime: {
    fontSize: 12,
    color: colors.gray400,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.gray500,
  },
  lastMessageUnread: {
    color: colors.gray700,
    fontWeight: '500',
  },
  // Empty state
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    maxWidth: 300,
  },
});
