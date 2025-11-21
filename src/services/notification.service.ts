import { supabase } from '../integrations/supabase'
import type { ApiResponse } from '../types/app.types'

export interface Notification {
  id: string
  user_id: string
  type: 'match_mutual' | 'new_message'
  title: string
  body: string | null
  data: Record<string, any>
  read: boolean
  created_at: string
  updated_at: string
}

export class NotificationService {
  /**
   * Busca todas as notificações do usuário
   */
  static async getNotifications(userId: string, limit: number = 50): Promise<ApiResponse<Notification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[NotificationService] getNotifications error:', error)
        throw error
      }

      return { data: (data || []) as Notification[] }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get notifications'
      }
    }
  }

  /**
   * Busca notificações não lidas
   */
  static async getUnreadNotifications(userId: string): Promise<ApiResponse<Notification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[NotificationService] getUnreadNotifications error:', error)
        throw error
      }

      return { data: (data || []) as Notification[] }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get unread notifications'
      }
    }
  }

  /**
   * Conta notificações não lidas
   */
  static async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('[NotificationService] getUnreadCount error:', error)
        throw error
      }

      return { data: data || 0 }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get unread count'
      }
    }
  }

  /**
   * Marca notificação como lida
   */
  static async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('[NotificationService] markAsRead error:', error)
        throw error
      }

      return { data: undefined }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to mark notification as read'
      }
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async markAllAsRead(userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('[NotificationService] markAllAsRead error:', error)
        throw error
      }

      return { data: undefined }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      }
    }
  }

  /**
   * Deleta notificação
   */
  static async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('[NotificationService] deleteNotification error:', error)
        throw error
      }

      return { data: undefined }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to delete notification'
      }
    }
  }
}

