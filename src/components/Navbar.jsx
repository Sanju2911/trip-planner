import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useNotifications } from '../context/NotificationContext'

export default function Navbar() {
  const { profile, logout } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  const { unreadCount, notifications, markAsRead, markAllAsRead, clearAll, permission, requestPermission, showPanel, setShowPanel } = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowPanel])

  async function handleLogout() {
    logout()
    toast('Signed out. See you soon!', 'info')
    setMenuOpen(false)
  }

  const getInitial = () => {
    if (!profile) return 'U'
    return (profile.display_name || profile.username || profile.email || 'U')[0].toUpperCase()
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  const formatTime = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link to="/" className="sidebar-brand" title="That One Day">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </Link>

      {/* Main nav icons */}
      <nav className="sidebar-nav">
        <Link to="/" className={`sidebar-item ${isActive('/')}`}>
          <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="sidebar-item-label">Home</span>
        </Link>

        <Link to="/trips/new" className={`sidebar-item ${isActive('/trips/new')}`}>
          <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="sidebar-item-label">New Trip</span>
        </Link>

        {/* Notifications */}
        <div className="sidebar-notif-wrapper" ref={notifRef}>
          <button 
            className={`sidebar-item ${showPanel ? 'active' : ''}`}
            onClick={() => setShowPanel(!showPanel)}
          >
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="sidebar-item-label">Alerts</span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showPanel && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <h3>Notifications</h3>
                <div className="notif-panel-actions">
                  {notifications.length > 0 && (
                    <>
                      <button onClick={markAllAsRead} className="notif-action-btn">Mark all read</button>
                      <button onClick={clearAll} className="notif-action-btn">Clear</button>
                    </>
                  )}
                </div>
              </div>

              {permission !== 'granted' && (
                <div className="notif-permission-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span>Enable notifications to stay updated</span>
                  <button onClick={requestPermission} className="btn btn-sm btn-primary">Enable</button>
                </div>
              )}

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notif-item ${notif.read ? 'read' : ''}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className={`notif-icon notif-type-${notif.type}`}>
                        {notif.type === 'trip' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                        {notif.type === 'comment' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                        {notif.type === 'info' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>}
                        {notif.type === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{notif.title}</div>
                        {notif.body && <div className="notif-body">{notif.body}</div>}
                        <div className="notif-time">{formatTime(notif.time)}</div>
                      </div>
                      {!notif.read && <div className="notif-unread-dot"></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {profile?.role === 'admin' && (
          <Link to="/admin" className={`sidebar-item ${isActive('/admin')}`}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
            </svg>
            <span className="sidebar-item-label">Admin</span>
          </Link>
        )}
      </nav>

      {/* Bottom: settings + avatar */}
      <div className="sidebar-bottom" ref={menuRef}>
        <button
          className={`sidebar-item sidebar-profile-btn ${isActive('/profile')}`}
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ marginBottom: 4, paddingLeft: 4 }}
        >
          <div
            className="sidebar-avatar"
            style={{
              backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: profile?.avatar_url ? 'transparent' : 'white',
            }}
          >
            {getInitial()}
          </div>
          <span className="sidebar-item-label">Profile</span>
        </button>

        {menuOpen && (
          <div className="user-menu">
            <div className="user-menu-name">{profile?.display_name || 'User'}</div>
            {profile?.username && (
              <div className="user-menu-username">@{profile.username}</div>
            )}
            <div className="user-menu-email">{profile?.email}</div>
            <hr className="user-menu-divider" />
            <Link
              to="/profile"
              className="user-menu-btn"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Edit Profile
            </Link>
            <button onClick={handleLogout} className="user-menu-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
