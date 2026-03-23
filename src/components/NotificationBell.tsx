import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../hooks/useNotifications'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="notif-bell" onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${n.is_read ? '' : 'unread'}`}
                onClick={() => { if (!n.is_read) markAsRead(n.id) }}
              >
                <h4>{n.title}</h4>
                <p>{n.body}</p>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                  {formatTime(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
