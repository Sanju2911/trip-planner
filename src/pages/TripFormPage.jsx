import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loader from '../components/Loader'

// Helper to reliably parse maps
async function resolveMapQuery(query) {
  if (!query) throw new Error("Empty search")
  
  // First try direct extraction if full URL is pasted
  const directMatch = query.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || query.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/) || query.match(/3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (directMatch) {
    return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]), name: 'Selected Map Location' }
  }

  if (query.includes('maps.app.goo.gl') || query.includes('google.com/maps') || query.includes('goo.gl/maps')) {
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(query)}`
      const res = await fetch(proxyUrl)
      const htmlContext = await res.text()
      const coordsMatch = htmlContext.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || htmlContext.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/) || htmlContext.match(/3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
      
      if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1])
        const lng = parseFloat(coordsMatch[2])
        
        const titleMatch = htmlContext.match(/<title>([^<]+)<\/title>/) || htmlContext.match(/<meta property="og:title" content="([^"]+)"/)
        let placeName = 'Google Maps Location'
        if (titleMatch && titleMatch[1]) {
           placeName = decodeURIComponent(titleMatch[1].replace(/\+/g, ' ')).replace(' - Google Maps', '')
        }
        return { lat, lng, name: placeName }
      }
    } catch(e) {
      console.error("Proxy fetch failed", e);
    }
    // Cannot extract from proxy, but it is a link!
    return { lat: null, lng: null, name: query, isLink: true }
  }

  // Fallback map search
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
    headers: { 'Accept-Language': 'en' }
  })
  const data = await res.json()
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name, suggestions: data }
  }
  throw new Error("Place not found")
}

// Step icons
const StepIcon = ({ step, active, completed }) => {
  const icons = {
    1: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    2: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    3: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    4: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    5: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  }
  return (
    <div className={`wizard-step-icon ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
      {completed ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> : icons[step]}
    </div>
  )
}

export default function TripFormPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  
  // Target location specific search state
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  
  // Food stop specific search states
  const [foodQueries, setFoodQueries] = useState({ breakfast: '', lunch: '', dinner: '' })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_location: '',
    target_lat: 17.385,
    target_lng: 78.4867,
    finalized_date: '',
    possible_dates: '',
    reschedule_dates: '',
    
    // Multi-Day & Stay
    total_days: 1,
    end_date: '',
    accommodations: [],
    
    home_exit_time: '',
    return_home_time: '',
    starting_point: '',
    meeting_options: '',
    meet_condition: '',
    
    // Food
    breakfast_point: '',
    breakfast_lat: '',
    breakfast_lng: '',
    breakfast_time: '',
    
    lunch_point: '',
    lunch_lat: '',
    lunch_lng: '',
    lunch_time: '',
    
    dinner_point: '',
    dinner_lat: '',
    dinner_lng: '',
    dinner_time: '',
    
    home_permission_excuse: '',
    budget_per_person: ''
  })

  // Steps configuration
  const steps = [
    { num: 1, title: 'Trip Basics', subtitle: 'Name & destination' },
    { num: 2, title: 'When', subtitle: 'Dates & duration' },
    { num: 3, title: 'Where to Meet', subtitle: 'Meeting points' },
    { num: 4, title: 'Food & Stops', subtitle: 'Meals planning' },
    { num: 5, title: 'Final Touch', subtitle: 'Cover & extras' },
  ]

  useEffect(() => {
    if (id) {
      setInitialLoading(true)
      supabase.from('trips').select('*').eq('id', id).single().then(({ data, error }) => {
        if (!error && data) {
          if (data.created_by !== user.id && profile?.role !== 'admin') {
             toast('You do not have permission to edit this trip.', 'error')
             navigate(`/trips/${id}`)
             return
          }
          setFormData({
            title: data.title || '',
            description: data.description || '',
            target_location: data.target_location || '',
            target_lat: data.target_lat || 17.385,
            target_lng: data.target_lng || 78.4867,
            finalized_date: data.finalized_date || '',
            total_days: data.total_days || 1,
            end_date: data.end_date || '',
            accommodations: data.accommodations || [],

            possible_dates: data.possible_dates ? data.possible_dates.join(', ') : '',
            reschedule_dates: data.reschedule_dates ? data.reschedule_dates.join(', ') : '',
            home_exit_time: data.home_exit_time ? data.home_exit_time.slice(0, 5) : '',
            return_home_time: data.return_home_time ? data.return_home_time.slice(0, 5) : '',
            starting_point: data.starting_point || '',
            meeting_options: data.meeting_options ? data.meeting_options.join(', ') : (data.meeting_point || ''),
            meet_condition: data.meet_condition || '',
            
            breakfast_point: data.breakfast_point || '',
            breakfast_lat: data.breakfast_lat || '',
            breakfast_lng: data.breakfast_lng || '',
            breakfast_time: data.breakfast_time ? data.breakfast_time.slice(0, 5) : '',
            
            lunch_point: data.lunch_point || '',
            lunch_lat: data.lunch_lat || '',
            lunch_lng: data.lunch_lng || '',
            lunch_time: data.lunch_time ? data.lunch_time.slice(0, 5) : '',
            
            dinner_point: data.dinner_point || '',
            dinner_lat: data.dinner_lat || '',
            dinner_lng: data.dinner_lng || '',
            dinner_time: data.dinner_time ? data.dinner_time.slice(0, 5) : '',
            
            home_permission_excuse: data.home_permission_excuse || '',
            budget_per_person: data.budget_per_person || ''
          })
          setSearchQuery(data.target_location || '')
          if (data.cover_image_url) setCoverPreview(data.cover_image_url)
          if (data.breakfast_point) setFoodQueries(f => ({ ...f, breakfast: data.breakfast_point }))
          if (data.lunch_point) setFoodQueries(f => ({ ...f, lunch: data.lunch_point }))
          if (data.dinner_point) setFoodQueries(f => ({ ...f, dinner: data.dinner_point }))
        }
        setInitialLoading(false)
      })
    }
  }, [id])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const result = await resolveMapQuery(searchQuery)
      
      // If it resolved to a specific mapped coordinate immediately without array suggestions
      if (result.name && result.lat !== null && !result.suggestions?.length) {
        setFormData({
          ...formData,
          target_location: result.name,
          target_lat: parseFloat(result.lat),
          target_lng: parseFloat(result.lng)
        })
        setSearchQuery(result.name)
        setSuggestions([])
        toast('Location successfully fetched from link', 'success')
      } else if (result.isLink) {
        setFormData({
          ...formData,
          target_location: result.name,
          target_lat: null,
          target_lng: null
        })
        setSearchQuery(result.name)
        setSuggestions([])
        toast('Map Link saved', 'success')
      } else if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions)
      } else {
        setSuggestions([])
      }
    } catch (err) {
      toast('Search failed or not found', 'error')
    }
    setSearching(false)
  }

  function handleSelectSuggestion(s) {
    setFormData({
      ...formData,
      target_location: s.display_name,
      target_lat: parseFloat(s.lat),
      target_lng: parseFloat(s.lon)
    })
    setSearchQuery(s.display_name)
    setSuggestions([])
  }

  function handleCoverChange(e) {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  async function setFoodLocation(meal, query) {
    if (!query.trim()) return
    try {
      const result = await resolveMapQuery(query)
      setFormData({
        ...formData,
        [`${meal}_point`]: result.name,
        [`${meal}_lat`]: result.lat,
        [`${meal}_lng`]: result.lng
      })
      setFoodQueries(f => ({ ...f, [meal]: result.name }))
      toast(`${meal} location set!`, 'success')
    } catch (err) {
      setFormData({
        ...formData,
        [`${meal}_point`]: query,
        [`${meal}_lat`]: null,
        [`${meal}_lng`]: null
      })
      toast(`Set as text`, 'info')
    }
  }

  function setFoodNone(meal) {
    setFormData({
      ...formData,
      [`${meal}_point`]: 'None',
      [`${meal}_lat`]: null,
      [`${meal}_lng`]: null,
      [`${meal}_time`]: ''
    })
    setFoodQueries(f => ({ ...f, [meal]: 'None' }))
  }

  function setFoodNTD(meal) {
    setFormData({
      ...formData,
      [`${meal}_point`]: 'Not Decided Yet',
      [`${meal}_lat`]: null,
      [`${meal}_lng`]: null,
      [`${meal}_time`]: ''
    })
    setFoodQueries(f => ({ ...f, [meal]: 'Not Decided Yet' }))
  }

  async function handleSubmit(e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // STRICT: Only submit if on step 5
    if (currentStep !== 5) {
      console.log('Blocked submission - not on step 5, current step:', currentStep)
      return
    }
    
    if (!formData.title) return toast('Trip title is required', 'error')
    setLoading(true)

    try {
      let cover_url = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `${user.id}/covers/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('trip-images').upload(path, coverFile)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('trip-images').getPublicUrl(path)
        cover_url = publicUrl
      }

      const payload = {
        title: formData.title,
        description: formData.description || null,
        target_location: formData.target_location || null,
        target_lat: formData.target_lat || null,
        target_lng: formData.target_lng || null,
        finalized_date: formData.finalized_date || null,
        total_days: formData.total_days || 1,
        end_date: formData.end_date || null,
        accommodations: formData.accommodations || [],

        possible_dates: formData.possible_dates ? formData.possible_dates.split(',').map(s => s.trim()).filter(Boolean) : [],
        reschedule_dates: formData.reschedule_dates.split(',').map(s => s.trim()).filter(Boolean),
        home_exit_time: formData.home_exit_time || null,
        return_home_time: formData.return_home_time || null,
        starting_point: formData.starting_point || null,
        meeting_options: formData.meeting_options ? formData.meeting_options.split(',').map(s => s.trim()).filter(Boolean) : [],
        meet_condition: formData.meet_condition || null,
        home_permission_excuse: formData.home_permission_excuse || null,

        breakfast_point: formData.breakfast_point || null,
        breakfast_lat: formData.breakfast_lat || null,
        breakfast_lng: formData.breakfast_lng || null,
        breakfast_time: formData.breakfast_time || null,

        lunch_point: formData.lunch_point || null,
        lunch_lat: formData.lunch_lat || null,
        lunch_lng: formData.lunch_lng || null,
        lunch_time: formData.lunch_time || null,

        dinner_point: formData.dinner_point || null,
        dinner_lat: formData.dinner_lat || null,
        dinner_lng: formData.dinner_lng || null,
        dinner_time: formData.dinner_time || null,
        budget_per_person: formData.budget_per_person || null,
      }
      
      if (cover_url) payload.cover_image_url = cover_url

      let finalId = id
      if (id) {
        const { error } = await supabase.from('trips').update(payload).eq('id', id)
        if (error) throw error
        toast('Trip updated successfully!', 'success')
      } else {
        payload.created_by = user.id
        const { data, error } = await supabase.from('trips').insert(payload).select().single()
        if (error) throw error
        finalId = data.id
        const { error: memberError } = await supabase.from('trip_members').insert({ trip_id: finalId, user_id: user.id })
        if (memberError) throw memberError
        toast('Trip created!', 'success')
      }

      navigate(`/trips/${finalId}`)
    } catch (err) {
      toast(err.message || 'Error saving trip', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Check if step is valid
  function isStepValid(step) {
    switch (step) {
      case 1: return !!formData.title.trim()
      case 2: return true
      case 3: return true
      case 4: return true
      case 5: return true
      default: return true
    }
  }

  function nextStep() {
    if (currentStep < 5 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Food input component
  const FoodCard = ({ meal, icon, label }) => (
    <div className="wizard-food-card">
      <div className="wizard-food-header">
        <span className="wizard-food-icon">{icon}</span>
        <span className="wizard-food-label">{label}</span>
      </div>
      <div className="wizard-food-body">
        <div className="wizard-food-input-row">
          <input
            type="text"
            value={foodQueries[meal]}
            onChange={e => setFoodQueries(f => ({ ...f, [meal]: e.target.value }))}
            placeholder="Search restaurant or paste maps link..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setFoodLocation(meal, foodQueries[meal]); } }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFoodLocation(meal, foodQueries[meal])}>
            Set
          </button>
        </div>
        <div className="wizard-food-quick-btns">
          <button type="button" className="wizard-quick-btn" onClick={() => setFoodNone(meal)}>Skip this meal</button>
          <button type="button" className="wizard-quick-btn" onClick={() => setFoodNTD(meal)}>Decide later</button>
        </div>
        {formData[`${meal}_point`] && formData[`${meal}_point`] !== 'None' && formData[`${meal}_point`] !== 'Not Decided Yet' && (
          <div className="wizard-food-time">
            <label>Time</label>
            <input
              type="time"
              value={formData[`${meal}_time`]}
              onChange={e => setFormData({ ...formData, [`${meal}_time`]: e.target.value })}
            />
          </div>
        )}
        {formData[`${meal}_point`] && (
          <div className="wizard-food-set">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            {formData[`${meal}_point`]}
          </div>
        )}
      </div>
    </div>
  )

  if (initialLoading) {
    return <div className="page-loading"><Loader text="Loading trip..." /></div>
  }

  return (
    <div className="wizard-page">
      {/* Header */}
      <div className="wizard-header">
        <button type="button" className="wizard-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div className="wizard-header-text">
          <h1>{id ? 'Edit Trip' : 'Plan Your Trip'}</h1>
              <p>Let&apos;s make this adventure happen!</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="wizard-progress">
        {steps.map((step) => (
          <div 
            key={step.num} 
            className={`wizard-progress-step ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
            onClick={() => currentStep > step.num && setCurrentStep(step.num)}
          >
            <StepIcon step={step.num} active={currentStep === step.num} completed={currentStep > step.num} />
            <div className="wizard-progress-text">
              <span className="wizard-progress-title">{step.title}</span>
              <span className="wizard-progress-subtitle">{step.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <form 
        onSubmit={handleSubmit} 
        className="wizard-form"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && currentStep < 5 && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault()
            nextStep()
          }
        }}
      >
        
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Let&apos;s start with the basics</h2>
              <p>What&apos;s the trip called and where are you going?</p>
            </div>

            <div className="wizard-card">
              <div className="form-group">
                <label className="form-label">Trip Name</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Give your trip a fun name..."
                  className="wizard-input-lg"
                  autoFocus
                />
                <p className="form-hint">e.g. &quot;Weekend Goa Getaway&quot; or &quot;Birthday Trip to Manali&quot;</p>
              </div>

              <div className="form-group">
                <label className="form-label">Destination</label>
                <div className="wizard-search-row">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search for a place or paste a Google Maps link..."
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {suggestions.length > 0 && (
                  <div className="wizard-suggestions">
                    {suggestions.map((s, i) => (
                      <div key={i} className="wizard-suggestion" onClick={() => handleSelectSuggestion(s)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {formData.target_location && (
                  <div className="wizard-selected-place">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{formData.target_location}</span>
                    <button type="button" onClick={() => { setFormData({ ...formData, target_location: '', target_lat: null, target_lng: null }); setSearchQuery(''); }}>
                      Change
                    </button>
                  </div>
                )}
              </div>

              {formData.target_lat && (
                <div className="wizard-map">
                  <iframe
                    title="Map Preview"
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: 12 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${formData.target_lat},${formData.target_lng}&t=m&z=13&output=embed`}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Quick Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any notes about the trip vibe, theme, or goals..."
                  rows="3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: When */}
        {currentStep === 2 && (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>When is the trip?</h2>
              <p>Set the dates and duration</p>
            </div>

            <div className="wizard-card">
              <div className="wizard-date-type">
                <label className="wizard-date-option">
                  <input
                    type="radio"
                    name="dateType"
                    checked={formData.total_days === 1}
                    onChange={() => setFormData({ ...formData, total_days: 1, end_date: '' })}
                  />
                  <div className="wizard-date-option-content">
                    <span className="wizard-date-option-title">Day Trip</span>
                    <span className="wizard-date-option-desc">Just for one day</span>
                  </div>
                </label>
                <label className="wizard-date-option">
                  <input
                    type="radio"
                    name="dateType"
                    checked={formData.total_days > 1}
                    onChange={() => setFormData({ ...formData, total_days: 2 })}
                  />
                  <div className="wizard-date-option-content">
                    <span className="wizard-date-option-title">Multi-Day Trip</span>
                    <span className="wizard-date-option-desc">2 or more days</span>
                  </div>
                </label>
              </div>

              {formData.total_days > 1 && (
                <div className="form-group">
                  <label className="form-label">How many days?</label>
                  <div className="wizard-days-picker">
                    {[2, 3, 4, 5, 7, 10, 14].map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`wizard-day-btn ${formData.total_days === d ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, total_days: d })}
                      >
                        {d} days
                      </button>
                    ))}
                    <input
                      type="number"
                      min="2"
                      max="30"
                      value={formData.total_days}
                      onChange={e => setFormData({ ...formData, total_days: parseInt(e.target.value) || 2 })}
                      className="wizard-day-input"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.finalized_date}
                    onChange={e => setFormData({ ...formData, finalized_date: e.target.value })}
                  />
                </div>
                {formData.total_days > 1 && (
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.finalized_date}
                    />
                  </div>
                )}
              </div>

              <div className="wizard-divider" />

              <div className="form-group">
                <label className="form-label">Not sure about the date? Add options</label>
                <input
                  type="text"
                  value={formData.possible_dates}
                  onChange={e => setFormData({ ...formData, possible_dates: e.target.value })}
                  placeholder="e.g. April 5, April 12, April 19"
                />
                <p className="form-hint">Comma-separated dates for the group to vote on</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Leave Home At</label>
                  <input
                    type="time"
                    value={formData.home_exit_time}
                    onChange={e => setFormData({ ...formData, home_exit_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Return Home By</label>
                  <input
                    type="time"
                    value={formData.return_home_time}
                    onChange={e => setFormData({ ...formData, return_home_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Budget Per Person</label>
                <input
                  type="text"
                  value={formData.budget_per_person}
                  onChange={e => setFormData({ ...formData, budget_per_person: e.target.value })}
                  placeholder="e.g. ₹500 - ₹1000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Meeting */}
        {currentStep === 3 && (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Where to meet?</h2>
              <p>Plan the meeting point for the group</p>
            </div>

            <div className="wizard-card">
              <div className="form-group">
                <label className="form-label">Your Starting Point</label>
                <input
                  type="text"
                  value={formData.starting_point}
                  onChange={e => setFormData({ ...formData, starting_point: e.target.value })}
                  placeholder="Where will you be coming from?"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Meeting Point Options</label>
                <textarea
                  value={formData.meeting_options}
                  onChange={e => setFormData({ ...formData, meeting_options: e.target.value })}
                  placeholder="Add meeting options separated by comma for group voting...&#10;e.g. JNTU Metro, Ameerpet Metro, Kukatpally Y Junction"
                  rows="3"
                />
                <p className="form-hint">Group members can vote on these options</p>
              </div>

              <div className="form-group">
                <label className="form-label">Meet Condition (Optional)</label>
                <input
                  type="text"
                  value={formData.meet_condition}
                  onChange={e => setFormData({ ...formData, meet_condition: e.target.value })}
                  placeholder="e.g. Call me when you reach, Wait near ticket counter..."
                />
              </div>

              <div className="wizard-divider" />

              <div className="form-group">
                <label className="form-label">Home Permission Strategy</label>
                <textarea
                  value={formData.home_permission_excuse}
                  onChange={e => setFormData({ ...formData, home_permission_excuse: e.target.value })}
                  placeholder="What&apos;s the cover story? 😉&#10;e.g. Group project, Library study session, Birthday party..."
                  rows="2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Food */}
        {currentStep === 4 && (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Plan your meals</h2>
              <p>Add food stops for the trip</p>
            </div>

            <div className="wizard-food-grid">
              <FoodCard meal="breakfast" icon="☀️" label="Breakfast" timeLabel="Morning" />
              <FoodCard meal="lunch" icon="🌤️" label="Lunch" timeLabel="Afternoon" />
              <FoodCard meal="dinner" icon="🌙" label="Dinner" timeLabel="Evening" />
            </div>
          </div>
        )}

        {/* Step 5: Final */}
        {currentStep === 5 && (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Final touches</h2>
              <p>Add a cover image and review</p>
            </div>

            <div className="wizard-card">
              <div className="form-group">
                <label className="form-label">Cover Image</label>
                <label className="wizard-upload">
                  {coverPreview ? (
                    <div className="wizard-upload-preview">
                      <img src={coverPreview} alt="Cover preview" />
                      <div className="wizard-upload-overlay">
                        <span>Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="wizard-upload-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span>Click to upload cover image</span>
                      <small>Recommended: 1200 x 630 px</small>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </label>
              </div>

              <div className="wizard-divider" />

              {/* Summary */}
              <div className="wizard-summary">
                <h3>Trip Summary</h3>
                <div className="wizard-summary-grid">
                  <div className="wizard-summary-item">
                    <span className="wizard-summary-label">Trip Name</span>
                    <span className="wizard-summary-value">{formData.title || 'Not set'}</span>
                  </div>
                  <div className="wizard-summary-item">
                    <span className="wizard-summary-label">Destination</span>
                    <span className="wizard-summary-value">{formData.target_location || 'Not set'}</span>
                  </div>
                  <div className="wizard-summary-item">
                    <span className="wizard-summary-label">Duration</span>
                    <span className="wizard-summary-value">{formData.total_days} day{formData.total_days > 1 ? 's' : ''}</span>
                  </div>
                  <div className="wizard-summary-item">
                    <span className="wizard-summary-label">Start Date</span>
                    <span className="wizard-summary-value">{formData.finalized_date || 'Not set'}</span>
                  </div>
                  <div className="wizard-summary-item">
                    <span className="wizard-summary-label">Budget</span>
                    <span className="wizard-summary-value">{formData.budget_per_person || 'Not set'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="wizard-nav">
          {currentStep > 1 && (
            <button type="button" className="btn btn-ghost" onClick={prevStep}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
          )}
          <div className="wizard-nav-spacer" />
          {currentStep < 5 ? (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
            >
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
              {loading ? 'Creating...' : (id ? 'Update Trip' : 'Create Trip')}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
