import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loader from '../components/Loader'

export default function AdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)

  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [createMsg, setCreateMsg] = useState('')

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'trips') loadTrips()
  }, [activeTab])

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) toast('Could not load users', 'error')
    else setUsers(data)
    setLoading(false)
  }

  async function loadTrips() {
    setLoading(true)
    const { data, error } = await supabase.from('trips').select('*, profiles(display_name, username, email)').order('created_at', { ascending: false })
    if (error) toast('Could not load trips', 'error')
    else setTrips(data)
    setLoading(false)
  }

  async function handleToggleRole(id, currentRole) {
    const next = currentRole === 'admin' ? 'user' : 'admin'
    if (!window.confirm(`Change this user's role to "${next}"?`)) return
    try {
      const { error } = await supabase.from('profiles').update({ role: next }).eq('id', id)
      if (error) throw error
      toast(`Role changed to ${next}`, 'success')
      loadUsers()
    } catch (err) {
      console.error('Toggle role error:', err)
      toast(`Error: ${err.message || 'Could not update role'}`, 'error')
    }
  }

  async function handleToggleApproval(id, currentStatus) {
    const next = !currentStatus
    if (!window.confirm(`${next ? 'Approve' : 'Revoke'} this user?`)) return
    try {
      const { error } = await supabase.from('profiles').update({ is_approved: next }).eq('id', id)
      if (error) throw error
      toast(`User ${next ? 'approved' : 'revoked'}`, 'success')
      loadUsers()
    } catch (err) {
      console.error('Toggle approval error:', err)
      toast(`Error: ${err.message || 'Could not update approval'}`, 'error')
    }
  }


  async function handleDeleteTrip(id) {
    if (!window.confirm('Delete this trip completely?')) return
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) toast('Error deleting trip', 'error')
    else {
      toast('Trip deleted', 'info')
      loadTrips()
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    setCreateMsg('')
    try {
      const { error } = await supabase.from('profiles').insert({
        email: newEmail,
        password: newPassword,
        display_name: newName,
        username: newUsername,
        role: newRole,
        is_approved: true
      }).select().single()

      if (error) {
        if (error.code === '23505') throw new Error('Email or Username already exists.')
        throw error
      }

      setCreateMsg('User created & approved successfully!')
      setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword('')
      loadUsers()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p className="page-subtitle">Manage users and trips directly</p>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`admin-tab ${activeTab === 'trips' ? 'active' : ''}`} onClick={() => setActiveTab('trips')}>All Trips</button>
        <button className={`admin-tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>Create User</button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-list">
          {loading ? <Loader size="small" text="Loading users..." /> : users.map(p => (
            <div key={p.id} className="admin-row">
              <div className="admin-row-info">
                <div className="admin-avatar">{(p.display_name || p.username || p.email || '?')[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 800 }}>{p.display_name || p.username || 'User'}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>{p.email}</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div className={`role-badge role-${p.role}`}>{p.role === 'admin' ? 'Admin' : 'User'}</div>
                    <div className="role-badge" style={{ background: p.is_approved ? '#dcfce7' : '#fee2e2', color: p.is_approved ? '#166534' : '#991b1b' }}>
                      {p.is_approved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-row-actions">
                {p.id !== user.id ? (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggleApproval(p.id, p.is_approved)}>
                      {p.is_approved ? 'Revoke' : 'Approve'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggleRole(p.id, p.role)}>
                      {p.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                  </>
                ) : <span style={{ color: 'var(--text3)', fontWeight: 700, fontSize: 13 }}>You</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'trips' && (
        <div className="admin-list">
          {loading ? <Loader size="small" text="Loading trips..." /> : trips.map(t => (
            <div key={t.id} className="admin-row">
              <div className="admin-row-info">
                <div style={{ fontSize: 28, color: 'var(--primary)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>{t.title}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>By {t.profiles?.display_name || t.profiles?.username || t.profiles?.email || 'Unknown'}</div>
                </div>
              </div>
              <div className="admin-row-actions" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/trips/${t.id}/edit`)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTrip(t.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="admin-create-card">
          <h3>Create New User Account</h3>
          <form className="form-stack" onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createMsg && <div className="alert alert-success">{createMsg}</div>}
            <button type="submit" className="btn btn-primary">Create Account</button>
          </form>
        </div>
      )}
    </div>
  )
}
