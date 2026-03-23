import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Notification } from '../types'

export function useNotifications() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const items = (data ?? []) as Notification[]
    setNotifications(items)
    setUnreadCount(items.filter(n => !n.is_read).length)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', userId)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, loading, markAsRead, markAllRead, refetch: fetchNotifications }
}
