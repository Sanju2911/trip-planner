import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import TripTabs from '../components/TripTabs'
import Loader from '../components/Loader'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function SectSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>
      <div className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--secondary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
      Updating...
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader text="Loading trip details..." />
    </div>
  )
}

export default function TripDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [trip, setTrip] = useState(null)
  const [members, setMembers] = useState([])
  const [images, setImages] = useState([])
  const [votes, setVotes] = useState([])
  const [comments, setComments] = useState([])
  const [links, setLinks] = useState([])
  
  const [initialLoading, setInitialLoading] = useState(true)
  const [sectLoading, setSectLoading] = useState({ 
    members: false, images: false, votes: false, comments: false, links: false, transport: false
  })

  const [myTransports, setMyTransports] = useState([])
  const [myCarpool, setMyCarpool] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [newComment, setNewComment] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  
  const firstRender = useRef(true)

  useEffect(() => { loadAllData() }, [id])

  // Auto-sync transport mode
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      syncTransport()
    }, 800)
    return () => clearTimeout(timer)
  }, [myTransports, myCarpool])

  function setSect(key, val) { setSectLoading(prev => ({ ...prev, [key]: val })) }

  async function loadAllData() {
    setInitialLoading(true)
    try {
      const [tripRes, memRes, imgRes, voteRes, commentRes, linkRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('trip_members').select('*, profiles!trip_members_user_id_custom_fkey(*)').eq('trip_id', id),
        supabase.from('trip_images').select('*').eq('trip_id', id).order('created_at', { ascending: true }),
        supabase.from('trip_meeting_votes').select('*').eq('trip_id', id),
        supabase.from('trip_comments').select('*, profiles(*)').eq('trip_id', id).order('created_at', { ascending: true }),
        supabase.from('trip_links').select('*, profiles(*)').eq('trip_id', id).order('created_at', { ascending: false })
      ])

      if (tripRes.error) throw tripRes.error
      setTrip(tripRes.data)
      const memData = memRes.data || []
      setMembers(memData)
      const me = memData.find(m => m.user_id === user.id)
      if (me) { setMyTransports(me.transport_modes || []); setMyCarpool(me.carpool_user_id || '') }
      setImages(imgRes.data || [])
      setVotes(voteRes.data || [])
      setComments(commentRes.data || [])
      setLinks(linkRes.data || [])
    } catch (err) {
      console.error('Error loading trip details:', err)
      toast(err.message || 'Could not load trip details', 'error')
      navigate('/')
    } finally {
      setInitialLoading(false)
    }
  }

  async function syncTransport() {
    setSect('transport', true)
    try {
      const { error } = await supabase.from('trip_members')
        .update({ transport_modes: myTransports, carpool_user_id: myCarpool || null })
        .eq('trip_id', id).eq('user_id', user.id)
      if (error) throw error
      reloadMembers()
    } catch (err) {
      toast('Failed to sync transport', 'error')
    } finally {
      setSect('transport', false)
    }
  }

  async function reloadMembers() {
    setSect('members', true)
    try {
      const { data } = await supabase.from('trip_members').select('*, profiles!trip_members_user_id_custom_fkey(*)').eq('trip_id', id)
      setMembers(data || [])
    } finally { setSect('members', false) }
  }

  async function reloadVotes() {
    setSect('votes', true)
    try {
      const { data } = await supabase.from('trip_meeting_votes').select('*').eq('trip_id', id)
      setVotes(data || [])
    } finally { setSect('votes', false) }
  }

  async function reloadComments() {
    setSect('comments', true)
    try {
      const { data } = await supabase.from('trip_comments').select('*, profiles(*)').eq('trip_id', id).order('created_at', { ascending: true })
      setComments(data || [])
    } finally { setSect('comments', false) }
  }

  async function reloadLinks() {
    setSect('links', true)
    try {
      const { data } = await supabase.from('trip_links').select('*, profiles(*)').eq('trip_id', id).order('created_at', { ascending: false })
      setLinks(data || [])
    } finally { setSect('links', false) }
  }

  async function reloadImages() {
    setSect('images', true)
    try {
      const { data } = await supabase.from('trip_images').select('*').eq('trip_id', id).order('created_at', { ascending: true })
      setImages(data || [])
    } finally { setSect('images', false) }
  }

  async function handleMemberSearch(query) {
    setMemberSearchQuery(query)
    if (!query.trim()) { setMemberSuggestions([]); return }
    const { data } = await supabase.from('profiles')
      .select('id, username, display_name, email, avatar_url')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5)
    if (data) {
      const existingIds = members.map(m => m.user_id)
      setMemberSuggestions(data.filter(p => !existingIds.includes(p.id)))
    }
  }

  async function handleSelectMemberOption(profileId) {
    try {
      const { error } = await supabase.from('trip_members').insert({ trip_id: id, user_id: profileId })
      if (error && error.code === '23505') throw new Error('Already a member!')
      if (error) throw error
      toast('Member added', 'success')
      setMemberSearchQuery(''); setMemberSuggestions([])
      reloadMembers()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemoveMember(memberId) {
    if (!window.confirm('Remove this member?')) return
    await supabase.from('trip_members').delete().eq('id', memberId)
    toast('Member removed', 'info')
    reloadMembers()
  }

  async function handleDeleteTrip() {
    if (!window.confirm('Delete this trip completely?')) return
    await supabase.from('trips').delete().eq('id', id)
    toast('Trip deleted', 'info'); navigate('/')
  }

  async function handleUploadImage(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    toast('Uploading photos...', 'info')
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file)
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('trip-images').getPublicUrl(path)
      await supabase.from('trip_images').insert({ trip_id: id, storage_path: path, public_url: publicUrl, uploaded_by: user.id })
    }
    toast('Photos uploaded!', 'success')
    reloadImages()
  }

  async function handleDeleteImage(imgId, path) {
    if (!window.confirm('Delete this photo?')) return
    await supabase.storage.from('trip-images').remove([path])
    await supabase.from('trip_images').delete().eq('id', imgId)
    toast('Photo deleted', 'info')
    reloadImages()
  }

  async function handleVote(optionName) {
    if (!optionName) return
    try {
      await supabase.from('trip_meeting_votes').delete().eq('trip_id', id).eq('user_id', user.id)
      const { error } = await supabase.from('trip_meeting_votes').insert({ trip_id: id, user_id: user.id, voted_option: optionName })
      if (error) throw error
      toast('Vote cast!', 'success')
      reloadVotes()
    } catch (err) { toast(err.message, 'error') }
  }

  function toggleTransport(mode) {
    setMyTransports(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const { error } = await supabase.from('trip_comments').insert({ trip_id: id, user_id: user.id, content: newComment.trim() })
      if (error) throw error
      setNewComment('')
      reloadComments()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleDeleteComment(cId) {
    if (!window.confirm('Delete comment?')) return
    await supabase.from('trip_comments').delete().eq('id', cId)
    reloadComments()
  }

  async function handleAddLink(e) {
    e.preventDefault()
    if (!newLinkUrl.trim()) return
    try {
      const { error } = await supabase.from('trip_links').insert({ trip_id: id, user_id: user.id, url: newLinkUrl.trim(), title: newLinkTitle.trim() || 'External Link' })
      if (error) throw error
      setNewLinkUrl(''); setNewLinkTitle('')
      reloadLinks()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleDeleteLink(lId) {
    if (!window.confirm('Delete link?')) return
    await supabase.from('trip_links').delete().eq('id', lId)
    reloadLinks()
  }

  if (initialLoading || !trip) return <DetailSkeleton />

  const isCreatorOrAdmin = trip.created_by === user.id || profile?.role === 'admin'
  const tripDate = trip.finalized_date ? new Date(trip.finalized_date) : null
  const tripEndDate = trip.end_date ? new Date(trip.end_date) : null
  
  let dateStr = 'Date TBD'
  if (tripDate) {
    const startStr = tripDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    if (tripEndDate && tripEndDate > tripDate) {
      const endStr = tripEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      dateStr = `${startStr} — ${endStr}`
    } else {
      dateStr = `${tripDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    }
  } else if (trip.possible_dates?.length) {
    dateStr = `Possible: ${trip.possible_dates.join(', ')}`
  }
  const heroStyle = trip.cover_image_url
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('${trip.cover_image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}

  function renderFoodStop(label, point, lat, lng, timeStr) {
    if (!point) return null
    if (point === 'None') return null
    if (point === 'NTD - Need to Decide') {
      return (
        <div className="detail-card" style={{ marginBottom: 24 }}>
          <h3>{label}</h3>
          <div style={{ color: 'var(--text3)', fontStyle: 'italic', padding: '4px 8px' }}>Need to Decide</div>
        </div>
      )
    }
    return (
      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3>{label}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: lat && lng ? '16px' : '4px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text1)' }}>{point}</div>
            {timeStr && <div style={{ color: 'var(--primary)', fontWeight: '600', marginTop: '4px' }}>Expected: {formatTime(timeStr)}</div>}
          </div>
        </div>
        {lat && lng ? (
          <div className="trip-map" style={{ height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
            <iframe title={`${label} Map`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
              src={`https://maps.google.com/maps?q=${lat},${lng}&t=m&z=15&output=embed`} />
          </div>
        ) : point?.match(/^https?:\/\//) ? (
          <div style={{ marginTop: '12px' }}>
            <a href={point} className="btn btn-secondary" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '6px 12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Open Maps Link
            </a>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="back-bar">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        {isCreatorOrAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/trips/${id}/edit`)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <button className="btn btn-danger" onClick={handleDeleteTrip}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="trip-hero" style={heroStyle}>
        <div>
          <div className="trip-hero-badge">{tripDate && tripDate < new Date() ? 'PAST TRIP' : 'UPCOMING'}</div>
          <h1>{trip.title}</h1>
          <p>{trip.target_location ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              {trip.target_location}
            </>
          ) : ''}</p>
          <div className="trip-hero-date">{dateStr}</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="info-item">
          <div className="info-emoji">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div className="info-label">Home Exit Time</div>
          <div className={`info-value ${!trip.home_exit_time ? 'empty' : ''}`}>{trip.home_exit_time ? formatTime(trip.home_exit_time) : 'Not set'}</div>
        </div>
        <div className="info-item">
          <div className="info-emoji">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div className="info-label">Return Home Time</div>
          <div className={`info-value ${!trip.return_home_time ? 'empty' : ''}`}>{trip.return_home_time ? formatTime(trip.return_home_time) : 'Not set'}</div>
        </div>
        <div className="info-item">
          <div className="info-emoji">₹</div>
          <div className="info-label">Est. Budget Per Person</div>
          <div className={`info-value ${!trip.budget_per_person ? 'empty' : ''}`}>{trip.budget_per_person || 'Not set'}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="info-emoji">🤝</div>
          <div className="info-label">Meeting Point Options (Click to Vote)</div>
          <div className="info-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {sectLoading.votes ? <SectSpinner /> : (!trip.meeting_options || trip.meeting_options.length === 0) ? (
              <span className="empty" style={{ fontSize: '13px' }}>No meeting options set by organizer.</span>
            ) : (
              trip.meeting_options.map(opt => {
                const optVotes = votes.filter(v => v.voted_option === opt)
                const hasVoted = optVotes.some(v => v.user_id === user.id)
                return (
                  <button key={opt} onClick={() => handleVote(opt)} className={`btn ${hasVoted ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '14px' }}>
                    {opt} <span style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '12px', marginLeft: '6px' }}>{optVotes.length}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="info-emoji">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div className="info-label">Permission Excuse</div>
          <div className={`info-value ${!trip.home_permission_excuse ? 'empty' : ''}`}>{trip.home_permission_excuse || 'Not set'}</div>
        </div>
      </div>

      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3>Target Location</h3>
        {trip.target_lat && trip.target_lng ? (
          <div className="trip-map" style={{ height: '350px', borderRadius: '12px', overflow: 'hidden' }}>
            <iframe title="Trip Location Map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${trip.target_lat},${trip.target_lng}&t=m&z=15&output=embed`} />
          </div>
        ) : trip.target_location?.match(/^https?:\/\//) ? (
          <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: '12px', textAlign: 'center' }}>
            <a href={trip.target_location} className="btn btn-primary" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Open Google Maps Link
            </a>
          </div>
        ) : (
          <p className="empty-state" style={{ padding: 24 }}>{trip.target_location || 'No exact location set'}</p>
        )}
      </div>

      {/* ── Accommodations ── */}
      {trip.accommodations && trip.accommodations.length > 0 && (
        <div className="detail-card" style={{ marginBottom: 24 }}>
          <h3>Stay Itinerary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
            {trip.accommodations.map((stay, idx) => (
              <div key={idx} style={{ 
                borderLeft: '3px solid var(--primary)', 
                paddingLeft: '16px', 
                position: 'relative',
                paddingBottom: idx === trip.accommodations.length - 1 ? 0 : '12px'
              }}>
                <div style={{ position: 'absolute', left: '-8px', top: '0', width: '13px', height: '13px', borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--surface)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--text)' }}>{stay.location || 'Unknown Stay'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
                      {stay.days} Day{stay.days > 1 ? 's' : ''} Stay 
                      {stay.reach_time && ` • Reach at ${formatTime(stay.reach_time)}`}
                    </div>
                  </div>
                  {stay.cost && (
                    <div style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '99px', fontSize: '13px', fontWeight: 'bold' }}>
                      {stay.cost}
                    </div>
                  )}
                </div>

                {stay.link && (
                  <div style={{ marginTop: '12px' }}>
                    <a 
                      href={stay.link.startsWith('http') ? stay.link : `https://${stay.link}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                    >
                      🔗 Booking Info
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {renderFoodStop('Breakfast', trip.breakfast_point, trip.breakfast_lat, trip.breakfast_lng, trip.breakfast_time)}
      {renderFoodStop('Lunch', trip.lunch_point, trip.lunch_lat, trip.lunch_lng, trip.lunch_time)}
      {renderFoodStop('Dinner', trip.dinner_point, trip.dinner_lat, trip.dinner_lng, trip.dinner_time)}

      {/* ── Multi-Day Trip Features ── */}
      {trip.total_days && trip.total_days > 1 && (
        <TripTabs trip={trip} onUpdate={loadAllData} />
      )}

      {/* ── Members ── */}
      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3>Trip Members</h3>
        {sectLoading.members ? <SectSpinner /> : (
          <div className="members-list">
            {members.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No members yet.</p>}
            {members.map(m => {
              const initial = (m.profiles?.display_name || m.profiles?.email || '?')[0].toUpperCase()
              return (
                <div key={m.id} className="member-chip" style={{ position: 'relative' }}>
                  <div className="member-avatar" style={{
                    backgroundImage: m.profiles?.avatar_url ? `url('${m.profiles.avatar_url}')` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    color: m.profiles?.avatar_url ? 'transparent' : undefined
                  }}>
                    {initial}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600' }}>{m.profiles?.display_name || m.profiles?.email}</span>
                    {m.transport_modes && m.transport_modes.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {m.transport_modes.map(mode => (
                          <span key={mode} style={{ fontSize: '11px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '8px' }}>
                            {mode}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.carpool_user_id && (
                      <span style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                        ↳ with {members.find(x => x.profiles?.id === m.carpool_user_id || x.user_id === m.carpool_user_id)?.profiles?.display_name || 'someone'}
                      </span>
                    )}
                  </div>
                  {isCreatorOrAdmin && m.user_id !== trip.created_by && (
                    <button className="member-remove-btn" onClick={() => handleRemoveMember(m.id)}>✕</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {members.some(m => m.user_id === user.id) && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface2)', borderRadius: '12px', border: '1.5px solid var(--border)' }}>
            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              My Transport Mode
              {sectLoading.transport && <div className="spinner" style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
              {sectLoading.transport === false && !sectLoading.members && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '800' }}>● Auto-synced</span>}
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {['2-wheeler', '4-wheeler', 'Taxi', 'Train', 'Flight', 'Carpool'].map(mode => (
                <button key={mode} className={`btn ${myTransports.includes(mode) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => toggleTransport(mode)}>
                  {mode}
                </button>
              ))}
            </div>
            {myTransports.includes('Carpool') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px', color: 'var(--text2)', fontWeight: '700' }}>Riding with:</label>
                <select value={myCarpool} onChange={e => setMyCarpool(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--surface)', fontWeight: '600' }}>
                  <option value="">Select a member...</option>
                  {members.filter(m => m.user_id !== user.id).map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name || m.profiles?.email}</option>
                  ))}
                </select>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', fontStyle: 'italic' }}>Your choices are saved automatically!</p>
          </div>
        )}

        {isCreatorOrAdmin && (
          <div className="member-add-row" style={{ marginTop: '16px', position: 'relative' }}>
            <input type="text" placeholder="Search by name, username, or email..." value={memberSearchQuery} onChange={e => handleMemberSearch(e.target.value)} style={{ width: '100%' }} />
            {memberSuggestions.length > 0 && (
              <div className="suggestions-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {memberSuggestions.map(s => (
                  <div key={s.id} className="suggestion-item" onClick={() => handleSelectMemberOption(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', backgroundImage: s.avatar_url ? `url('${s.avatar_url}')` : 'none', backgroundSize: 'cover' }}>
                      {!s.avatar_url && (s.display_name || s.username || s.email)[0].toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)' }}>{s.display_name || s.username}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>@{s.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Photos ── */}
      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3>Trip Photos</h3>
        {sectLoading.images ? <SectSpinner /> : images.length > 0 ? (
          <div className="image-gallery">
            {images.map(img => (
              <div key={img.id} className="image-thumb" onClick={() => window.open(img.public_url, '_blank')}>
                <img src={img.public_url} alt="Trip" loading="lazy" />
                {(img.uploaded_by === user.id || profile?.role === 'admin') && (
                  <button className="image-remove-btn" onClick={e => { e.stopPropagation(); handleDeleteImage(img.id, img.storage_path) }}>✕</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>No photos yet. Add some memories!</p>
        )}
        <div style={{ marginTop: 16 }}>
          <label className="upload-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload Photos
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadImage} />
          </label>
        </div>
      </div>

      {/* ── Links ── */}
      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3>External Drives & Links</h3>
        <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '16px' }}>Add Google Drive, OneDrive, or Dropbox links here for massive albums!</p>
        {sectLoading.links ? <SectSpinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {links.length > 0 ? links.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ fontWeight: '600', color: 'var(--primary)' }}>{l.title}</a>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Added by {l.profiles?.display_name || l.profiles?.username}</div>
                </div>
                {(l.user_id === user.id || profile?.role === 'admin') && (
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--danger)' }} onClick={() => handleDeleteLink(l.id)}>✕</button>
                )}
              </div>
            )) : <p className="empty-state" style={{ padding: 12 }}>No external links added yet.</p>}
          </div>
        )}
        <form onSubmit={handleAddLink} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(200px, 2fr) auto', gap: '8px' }}>
          <input type="text" placeholder="Title (e.g. G-Drive)" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
          <input type="url" placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
          <button type="submit" className="btn btn-secondary">Add Link</button>
        </form>
      </div>

      {/* ── Comments ── */}
      <div className="detail-card">
        <h3>Trip Discussion</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto', padding: '16px', background: 'var(--surface2)', borderRadius: '12px' }}>
          {sectLoading.comments ? <SectSpinner /> : comments.length > 0 ? comments.map(c => {
            const isMe = c.user_id === user.id
            return (
              <div key={c.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative' }}>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {c.profiles?.display_name || c.profiles?.username} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ background: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : 'black', padding: '10px 14px', borderRadius: '16px', borderBottomRightRadius: isMe ? '4px' : '16px', borderBottomLeftRadius: !isMe ? '4px' : '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {c.content}
                </div>
                {(isMe || profile?.role === 'admin') && (
                  <button onClick={() => handleDeleteComment(c.id)} style={{ position: 'absolute', top: '16px', [isMe ? 'left' : 'right']: '-28px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                )}
              </div>
            )
          }) : <p className="empty-state" style={{ background: 'transparent' }}>No comments yet. Start the discussion!</p>}
        </div>
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="Type your message..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '24px', border: '1px solid var(--border)' }} required />
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '24px', padding: '0 24px' }}>Send</button>
        </form>
      </div>
    </div>
  )
}
