import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loader from '../components/Loader'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const EVENT_COLORS = [
  'event-color-0', 'event-color-1', 'event-color-2',
  'event-color-3', 'event-color-4', 'event-color-5',
]
const AGENDA_COLORS = [
  'agenda-item-color-0', 'agenda-item-color-1', 'agenda-item-color-2',
  'agenda-item-color-3', 'agenda-item-color-4', 'agenda-item-color-5',
]

function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, currentMonth: false, date: new Date(year, month - 1, daysInPrev - i) })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, currentMonth: true, date: new Date(year, month, i) })
  }
  let next = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, currentMonth: false, date: new Date(year, month + 1, next - 1) })
  }
  return cells
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [allTrips, setAllTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const now = new Date()
  const [calDate, setCalDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(now)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    try {
      setLoading(true)
      const { data: memberTrips, error: memberErr } = await supabase
        .from('trip_members').select('trip_id').eq('user_id', user.id)
      if (memberErr) throw memberErr

      const memberTripIds = memberTrips.map(m => m.trip_id)
      let queryStr = `created_by.eq.${user.id}`
      if (memberTripIds.length) queryStr += `,id.in.(${memberTripIds.join(',')})`

      const { data: trips, error: tripsErr } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members!trip_members_trip_id_fkey (
            profiles!trip_members_user_id_custom_fkey (
              display_name, avatar_url, username, email
            )
          )
        `)
        .or(queryStr)
        .order('finalized_date', { ascending: true, nullsFirst: true })

      if (tripsErr) throw tripsErr
      setAllTrips(trips || [])
    } catch (err) {
      console.error(err)
      setError('Could not load trips.')
      toast('Failed to load trips.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const year = calDate.getFullYear()
  const month = calDate.getMonth()
  const cells = buildCalendarCells(year, month)

  const filteredAllTrips = searchQuery
    ? allTrips.filter(t => 
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.target_location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTrips;

  function tripsForDate(date) {
    return filteredAllTrips.filter(trip => {
      if (trip.finalized_date) {
        const start = new Date(trip.finalized_date)
        start.setHours(0, 0, 0, 0)
        if (trip.end_date) {
          const end = new Date(trip.end_date)
          end.setHours(0, 0, 0, 0)
          const current = new Date(date)
          current.setHours(0, 0, 0, 0)
          return current >= start && current <= end
        }
        return isSameDay(start, date)
      }
      if (trip.possible_dates?.length) {
        return trip.possible_dates.some(d => isSameDay(new Date(d), date))
      }
      return false
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = filteredAllTrips.filter(t => {
    if (!t.finalized_date) return true
    const end = t.end_date ? new Date(t.end_date) : new Date(t.finalized_date)
    end.setHours(0, 0, 0, 0)
    return end >= today
  })
  const selectedTrips = tripsForDate(selectedDate)

  const agendaTrips = selectedTrips.length > 0 ? selectedTrips : upcoming

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 18) return 'Afternoon'
    return 'Evening'
  }

  function formatTime(str) {
    if (!str) return ''
    const [h, m] = str.split(':')
    const hour = parseInt(h)
    const ap = hour >= 12 ? 'PM' : 'AM'
    return `${hour % 12 || 12}:${m} ${ap}`
  }

  const agendaDateLabel = selectedTrips.length > 0
    ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Upcoming trips'

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="home-shell">
      {/* ── Left: Calendar ── */}
      <div className="home-left">
        {/* Header */}
        <div className="home-header">
          <div className="home-greeting">
            <h1>{getGreeting()}, {profile?.display_name || 'Adventurer'}!</h1>
            <p>Here&apos;s what&apos;s on your agenda today.</p>
          </div>
          <div className="home-search">
            <div className="home-search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
              <input 
                type="text" 
                placeholder="Search trips…" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: 'inherit' }}
              />
            </div>
            <button className="home-notif-btn" onClick={() => navigate('/trips/new')} title="Plan a Trip">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-wrapper">
          <div className="calendar-header">
            <div className="calendar-nav-group">
              <button className="calendar-month-btn">
                {MONTHS[month]} <small><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></small>
              </button>
              <button className="calendar-month-btn">
                {year} <small><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></small>
              </button>
            </div>
            <div className="calendar-nav-group">
              <button
                className="calendar-arrow-btn"
                onClick={() => setCalDate(new Date(year, month - 1, 1))}
              >←</button>
              <button
                className="calendar-arrow-btn"
                onClick={() => setCalDate(new Date(year, month + 1, 1))}
              >→</button>
            </div>
          </div>

          <div className="calendar-grid-wrapper">
            <div className="calendar-day-headers">
              {DAYS.map(d => (
                <div key={d} className="calendar-day-header">{d.slice(0, 3)}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Loader size="medium" text="Loading calendar..." />
              </div>
            ) : (
              <div className="calendar-grid">
                {cells.map((cell, idx) => {
                  const dayTrips = tripsForDate(cell.date)
                  const isToday = isSameDay(cell.date, today)
                  const isSelected = isSameDay(cell.date, selectedDate)

                  return (
                    <div
                      key={idx}
                      className={[
                        'cal-cell',
                        !cell.currentMonth ? 'other-month' : '',
                        isToday ? 'today' : '',
                        isSelected && !isToday ? 'selected' : '',
                        dayTrips.length > 0 ? 'has-trip' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedDate(cell.date)}
                    >
                      <div className="cal-day-num">{cell.day}</div>
                      <div className="cal-events">
                        {dayTrips.slice(0, 3).map((trip, ti) => (
                          <div
                            key={trip.id}
                            className={`cal-event ${EVENT_COLORS[ti % EVENT_COLORS.length]}`}
                            onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}`) }}
                            title={trip.title}
                          >
                            {trip.title}
                          </div>
                        ))}
                        {dayTrips.length > 3 && (
                          <div style={{ fontSize: 9, color: 'var(--text3)', paddingLeft: 6 }}>
                            +{dayTrips.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Agenda Panel ── */}
      <div className="home-right">
        <div className="agenda-header">
          <span className="agenda-title">Scheduled</span>
          <div className="agenda-nav">
            <button className="agenda-cal-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
            <button className="agenda-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className="agenda-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        <div className="agenda-date">{agendaDateLabel}</div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader size="small" />
          </div>
        ) : agendaTrips.length === 0 ? (
          <div className="agenda-empty">
            <div className="agenda-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <p>No trips scheduled</p>
            <p style={{ fontSize: 11, marginTop: 6 }}>Plan your next adventure!</p>
          </div>
        ) : (
          <>
            {agendaTrips.map((trip, idx) => {
              const members = trip.trip_members || []
              const visible = members.slice(0, 3)
              const more = members.length - visible.length
              const tripDate = trip.finalized_date
                ? new Date(trip.finalized_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : (trip.possible_dates?.[0] || 'TBD')

              return (
                <div
                  key={trip.id}
                  className={`agenda-item ${AGENDA_COLORS[idx % AGENDA_COLORS.length]}`}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  <div className="agenda-item-title">{trip.title}</div>
                  {trip.target_location && (
                    <div className="agenda-item-sub">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {trip.target_location}
                    </div>
                  )}
                  <div className="agenda-item-time">
                    <span>
                      {trip.home_exit_time ? formatTime(trip.home_exit_time) : ''}
                      {trip.return_home_time ? ` – ${formatTime(trip.return_home_time)}` : ''}
                      {!trip.home_exit_time && !trip.return_home_time ? tripDate : ''}
                    </span>
                    <span>{trip.budget_per_person ? `₹${trip.budget_per_person}` : ''}</span>
                  </div>
                  {members.length > 0 && (
                    <div className="agenda-item-members">
                      {visible.map((m, mi) => {
                        const p = m.profiles
                        const init = (p?.display_name || p?.email || '?')[0].toUpperCase()
                        return (
                          <div
                            key={mi}
                            className="agenda-mini-avatar"
                            style={{ backgroundImage: p?.avatar_url ? `url('${p.avatar_url}')` : 'none' }}
                            title={p?.display_name}
                          >
                            {!p?.avatar_url && init}
                          </div>
                        )
                      })}
                      {more > 0 && <span className="agenda-member-more">+{more} more</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
