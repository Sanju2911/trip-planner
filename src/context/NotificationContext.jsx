import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [permission, setPermission] = useState('default')
  const [notifications, setNotifications] = useState([])
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }
    
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [])

  const sendNotification = useCallback((title, options = {}) => {
    // Add to in-app notifications list
    const newNotif = {
      id: Date.now(),
      title,
      body: options.body || '',
      icon: options.icon || null,
      time: new Date(),
      read: false,
      type: options.type || 'info'
    }
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)) // Keep last 50

    // Send browser notification if permitted
    if (permission === 'granted' && document.hidden) {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: options.tag || 'default',
          requireInteraction: options.requireInteraction || false,
        })

        if (options.onClick) {
          notif.onclick = options.onClick
        }

        // Auto close after 5 seconds
        setTimeout(() => notif.close(), 5000)
      } catch (err) {
        console.error('Failed to send notification:', err)
      }
    }
  }, [permission])

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      permission,
      requestPermission,
      sendNotification,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      showPanel,
      setShowPanel,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
