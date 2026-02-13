import { create } from 'zustand';
import { Message, Chat } from '../types';
import { supabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ExtendedChat extends Chat {
  otherUser?: {
    id: string;
    name: string;
    photos: string[];
  };
}

interface ChatState {
  messages: Message[];
  chats: ExtendedChat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  loadChats: (userId: string) => Promise<void>;
  loadMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, senderId: string, receiverId: string, content: string) => Promise<void>;
  markAsRead: (matchId: string, userId: string) => Promise<void>;
  subscribeToMessages: (matchId: string, callback: (message: Message) => void) => void;
  unsubscribeFromMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  chats: [],
  currentChatId: null,
  isLoading: false,
  error: null,
  realtimeChannel: null,

  /**
   * Carrega todas as conversas do usuário
   * Usa a tabela chats que referencia matches através de people_match_id
   */
  loadChats: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:user1_id (id, name, photos),
          user2:user2_id (id, name, photos)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Mapear para formato Chat com informações do outro usuário
      const chats: ExtendedChat[] = (data || []).map(chat => {
        const isUser1 = chat.user1_id === userId;
        const otherUser = isUser1 ? chat.user2 : chat.user1;

        return {
          id: chat.id,
          match_id: chat.people_match_id || '',
          user_id_1: chat.user1_id,
          user_id_2: chat.user2_id,
          unread_count_1: chat.user1_unread_count || 0,
          unread_count_2: chat.user2_unread_count || 0,
          is_blocked: false,
          created_at: chat.created_at,
          updated_at: chat.updated_at || chat.last_message_at,
          otherUser: otherUser ? {
            id: otherUser.id,
            name: otherUser.name,
            photos: otherUser.photos || [],
          } : undefined,
        };
      });

      set({ chats, isLoading: false });
    } catch (error: any) {
      console.error('Erro ao carregar chats:', error);
      set({ error: error.message, isLoading: false, chats: [] });
    }
  },

  /**
   * Carrega mensagens de um match/conversa específica
   * A tabela messages usa match_id como referência
   */
  loadMessages: async (matchId) => {
    set({ isLoading: true, error: null, currentChatId: matchId });

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        chat_id: msg.match_id,
        sender_id: msg.sender_id,
        content: msg.content,
        type: (msg.message_type as 'text' | 'image' | 'gif') || 'text',
        media_url: msg.payload?.media_url,
        is_read: msg.is_read || false,
        is_deleted: false,
        created_at: msg.created_at,
      }));

      set({ messages, isLoading: false });
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      set({ error: error.message, isLoading: false, messages: [] });
    }
  },

  /**
   * Envia uma nova mensagem
   */
  sendMessage: async (matchId, senderId, receiverId, content) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: 'text',
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar mensagem localmente
      const newMessage: Message = {
        id: data.id,
        chat_id: data.match_id,
        sender_id: data.sender_id,
        content: data.content,
        type: 'text',
        is_read: false,
        is_deleted: false,
        created_at: data.created_at,
      };

      set({ messages: [...get().messages, newMessage] });

      // Atualizar timestamp do chat
      await supabase
        .from('chats')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('people_match_id', matchId);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  },

  /**
   * Marca mensagens como lidas
   */
  markAsRead: async (matchId, userId) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('match_id', matchId)
        .neq('sender_id', userId)
        .eq('is_read', false);

    } catch (error) {
      console.error('Erro ao marcar como lidas:', error);
    }
  },

  /**
   * Inscreve para receber mensagens em tempo real
   */
  subscribeToMessages: (matchId, callback) => {
    // Desinscrever de canal anterior se existir
    get().unsubscribeFromMessages();

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          const newMessage: Message = {
            id: msg.id,
            chat_id: msg.match_id,
            sender_id: msg.sender_id,
            content: msg.content,
            type: msg.message_type || 'text',
            media_url: msg.payload?.media_url,
            is_read: msg.is_read,
            is_deleted: false,
            created_at: msg.created_at,
          };

          // Adicionar ao estado se não for duplicata
          const { messages } = get();
          if (!messages.find(m => m.id === newMessage.id)) {
            set({ messages: [...messages, newMessage] });
            callback(newMessage);
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  /**
   * Desinscreve das atualizações em tempo real
   */
  unsubscribeFromMessages: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },
}));
