import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useChatStore } from '../../src/stores/chatStore';
import { useAuthStore } from '../../src/stores/authStore';
import { Message } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';

// Função para formatar hora
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    messages,
    loadMessages,
    sendMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    markAsRead,
    isLoading,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  // Carregar informações do outro usuário
  const loadOtherUser = useCallback(async () => {
    if (!matchId || !user?.id) return;

    try {
      // Buscar o match para encontrar o outro usuário
      const { data: match } = await supabase
        .from('matches')
        .select(`
          *,
          user_1:user_id_1 (id, name, photos),
          user_2:user_id_2 (id, name, photos)
        `)
        .eq('id', matchId)
        .maybeSingle();

      if (match) {
        const other = match.user_id_1 === user.id ? match.user_2 : match.user_1;
        setOtherUser(other);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  }, [matchId, user?.id]);

  useEffect(() => {
    if (matchId && user?.id) {
      loadMessages(matchId as string);
      loadOtherUser();

      // Marcar mensagens como lidas
      markAsRead(matchId as string, user.id);

      // Subscribe to real-time messages
      subscribeToMessages(matchId as string, (newMsg) => {
        // Scroll to bottom quando receber nova mensagem
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      return () => {
        unsubscribeFromMessages();
      };
    }
  }, [matchId, user?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !matchId || !user?.id || !otherUser?.id) return;

    setIsSending(true);
    try {
      await sendMessage(matchId as string, user.id, otherUser.id, newMessage.trim());
      setNewMessage('');
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {item.type === 'image' && item.media_url ? (
            <Image
              source={{ uri: item.media_url }}
              style={styles.messageImage}
              contentFit="cover"
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownText : styles.otherText,
              ]}
            >
              {item.content}
            </Text>
          )}
        </View>
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {formatTime(item.created_at)}
          </Text>
          {isOwnMessage && (
            <Ionicons
              name={item.is_read ? "checkmark-done" : "checkmark"}
              size={14}
              color={item.is_read ? colors.blue : colors.gray400}
            />
          )}
        </View>
      </View>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.emptyText}>Comece a conversa!</Text>
      <Text style={styles.emptySubtext}>
        Diga oi para {otherUser?.name || 'seu match'} 👋
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: otherUser?.name || 'Chat',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.black} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: colors.yellow,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Loading */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.yellow} />
          </View>
        ) : (
          /* Messages */
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListEmptyComponent={ListEmptyComponent}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="camera" size={24} color={colors.gray600} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.gray400}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={newMessage.trim() ? colors.white : colors.gray400}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  backButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messagesListEmpty: {
    flex: 1,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 2,
  },
  ownBubble: {
    backgroundColor: colors.yellow,
    borderColor: colors.black,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.white,
    borderColor: colors.black,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: colors.black,
  },
  otherText: {
    color: colors.black,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: colors.gray400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.black,
  },
  attachButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    maxHeight: 100,
    borderWidth: 2,
    borderColor: colors.gray300,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray300,
  },
});
