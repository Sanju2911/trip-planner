import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loader from '../components/Loader'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: ''
  })
  
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        password: profile.password || '',
        display_name: profile.display_name || ''
      })
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
    }
  }, [profile])

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    toast('Uploading new avatar...', 'info')
    
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file)
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage.from('trip-images').getPublicUrl(path)
      
      const { error: patchErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (patchErr) throw patchErr

      toast('Avatar updated!', 'success')
      refreshProfile()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.username.trim() || !formData.password.trim()) {
        throw new Error('Username and Password cannot be blank.')
      }

      // Detect display name change
      const isDisplayChanged = formData.display_name !== profile.display_name && !profile.display_name_changed

      const payload = {
        username: formData.username.trim(),
        password: formData.password.trim()
      }

      if (isDisplayChanged) {
        payload.display_name = formData.display_name.trim()
        payload.display_name_changed = true // Lock it
      }

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
      if (error) {
        if (error.code === '23505') throw new Error('Username is already taken!')
        throw error
      }

      toast('Profile updated successfully!', 'success')
      refreshProfile()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return <div className="page-wrapper"><Loader text="Loading profile..." /></div>

  return (
    <div className="page-wrapper-narrow">
      <div className="form-page-header">
        <h1>My Profile</h1>
        <p>Manage your identity across the Trip Planner</p>
      </div>

      <div className="detail-card" style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '16px' }}>Profile Picture</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--primary)', 
            backgroundImage: `url('${avatarPreview}')`, backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '48px', fontWeight: 'bold'
          }}>
            {!avatarPreview && (profile.display_name || profile.username || 'U')[0].toUpperCase()}
          </div>
          <label className="btn btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Change Picture
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-sections">
        <div className="form-section">
          <div className="form-section-header">Account Details</div>
          <div className="form-section-body">
            
            <div className="form-group">
              <label className="form-label">
                Display Name {profile.display_name_changed && <span style={{ color: 'var(--danger)', fontSize: '12px', marginLeft: '8px' }}>Locked</span>}
              </label>
              <input 
                type="text" 
                value={formData.display_name} 
                onChange={e => setFormData({...formData, display_name: e.target.value})} 
                disabled={profile.display_name_changed}
                placeholder="How your friends see you" 
                style={profile.display_name_changed ? { background: 'var(--surface2)', color: 'var(--text3)', border: 'none' } : {}}
              />
              {!profile.display_name_changed && <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Warning: You can only set your custom Display Name once!</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required 
              />
            </div>

          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  )
}
