import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './TripTabs.css'

export default function TripTabs({ trip }) {
  const [activeTab, setActiveTab] = useState('itinerary')

  const tabs = [
    { id: 'itinerary', label: 'Day Plan' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'transport', label: 'Transport' },
    { id: 'packing', label: 'Packing' },
  ]

  return (
    <div className="trip-tabs-container">
      <div className="trip-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`trip-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="trip-tab-content">
        {activeTab === 'itinerary' && <ItineraryTab trip={trip} />}
        {activeTab === 'expenses' && <ExpensesTab trip={trip} />}
        {activeTab === 'transport' && <TransportTab trip={trip} />}
        {activeTab === 'packing' && <PackingTab trip={trip} />}
      </div>
    </div>
  )
}

// Itinerary Tab Component
function ItineraryTab({ trip }) {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    day_number: 1,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    activity_type: 'sightseeing',
    estimated_cost: ''
  })

  // Load itinerary on mount
  useEffect(() => {
    loadItinerary()
  }, [trip.id])

  async function loadItinerary() {
    setLoading(true)
    const { data, error } = await supabase
      .from('trip_itinerary')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_number', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (!error) setItems(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('trip_itinerary').insert({
      trip_id: trip.id,
      ...formData,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null
    })

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Activity added!', 'success')
      setShowForm(false)
      setFormData({ day_number: 1, title: '', description: '', start_time: '', end_time: '', location: '', activity_type: 'sightseeing', estimated_cost: '' })
      loadItinerary()
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this activity?')) return
    await supabase.from('trip_itinerary').delete().eq('id', id)
    toast('Activity deleted', 'info')
    loadItinerary()
  }

  const totalDays = trip.total_days || 1
  const groupedByDay = {}
  for (let i = 1; i <= totalDays; i++) {
    groupedByDay[i] = items.filter(item => item.day_number === i)
  }

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Day-wise Itinerary</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Activity'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="detail-card" style={{ marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Day</label>
              <select value={formData.day_number} onChange={e => setFormData({...formData, day_number: parseInt(e.target.value)})}>
                {Array.from({length: totalDays}, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>Day {day}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity Type</label>
              <select value={formData.activity_type} onChange={e => setFormData({...formData, activity_type: e.target.value})}>
                <option value="sightseeing">Sightseeing</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
                <option value="adventure">Adventure</option>
                <option value="shopping">Shopping</option>
                <option value="rest">Rest</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Activity Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Visit Red Fort" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Details about the activity..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Est. Cost (₹)</label>
              <input type="number" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} placeholder="500" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Red Fort, Delhi" />
          </div>

          <button type="submit" className="btn btn-primary">Add Activity</button>
        </form>
      )}

      {loading ? (
        <div className="loading-center">Loading itinerary...</div>
      ) : (
        <div className="itinerary-timeline">
          {Object.keys(groupedByDay).map(day => (
            <div key={day} className="day-section">
              <div className="day-header">
                <h4>Day {day}</h4>
                <span className="day-count">{groupedByDay[day].length} activities</span>
              </div>
              
              {groupedByDay[day].length === 0 ? (
                <p className="empty-state" style={{padding: 16, fontSize: 14}}>No activities planned yet</p>
              ) : (
                <div className="activity-list">
                  {groupedByDay[day].map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-time">
                        {item.start_time && <span>{item.start_time.substring(0, 5)}</span>}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className={`activity-badge ${item.activity_type}`}>{item.activity_type}</span>
                          <h5>{item.title}</h5>
                        </div>
                        {item.description && <p>{item.description}</p>}
                        {item.location && <div className="activity-location">📍 {item.location}</div>}
                        {item.estimated_cost && <div className="activity-cost">₹{item.estimated_cost}</div>}
                        <button className="btn-icon-sm" onClick={() => handleDelete(item.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Expenses Tab
function ExpensesTab({ trip }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'food',
    paid_by: '',
    split_with: [],
    description: ''
  })

  useEffect(() => {
    loadExpenses()
  }, [trip.id])

  async function loadExpenses() {
    const { data } = await supabase
      .from('trip_expenses')
      .select('*, profiles(display_name)')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('trip_expenses').insert({
      trip_id: trip.id,
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      paid_by: formData.paid_by || user.id,
      split_with: formData.split_with.length ? formData.split_with : [user.id],
      description: formData.description || null
    })

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Expense added!', 'success')
      setShowForm(false)
      setFormData({ title: '', amount: '', category: 'food', paid_by: '', split_with: [], description: '' })
      loadExpenses()
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
  
  return (
    <div className="tab-content">
      <div className="expense-summary">
        <h4>Total Expenses: ₹{totalExpenses.toFixed(2)}</h4>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Expense Tracker</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="detail-card" style={{ marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Expense Title</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Train tickets"
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                placeholder="500"
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="accommodation">Accommodation</option>
                <option value="activities">Activities</option>
                <option value="shopping">Shopping</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Paid By</label>
              <input 
                type="text" 
                value={formData.paid_by} 
                onChange={e => setFormData({...formData, paid_by: e.target.value})} 
                placeholder="User ID (leave blank for yourself)"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Additional details..."
              rows="3"
            />
          </div>

          <button type="submit" className="btn btn-primary">Add Expense</button>
        </form>
      )}

      {loading ? (
        <div className="loading-center">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <p className="empty-state" style={{padding: 40, textAlign: 'center', color: 'var(--text3)'}}>No expenses added yet</p>
      ) : (
        <div className="expenses-list">
          {expenses.map(expense => (
            <div key={expense.id} className="expense-item">
              <div className="expense-header">
                <h5>{expense.title}</h5>
                <div className="expense-amount">₹{expense.amount}</div>
              </div>
              <div className="expense-meta">
                <span className={`expense-category ${expense.category}`}>{expense.category}</span>
                <span className="expense-paid-by">Paid by {expense.profiles?.display_name || 'Unknown'}</span>
              </div>
              {expense.description && <p>{expense.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Transport Tab
function TransportTab({ trip }) {
  const { toast } = useToast()
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'train',
    booking_details: '',
    departure_time: '',
    arrival_time: '',
    pickup_location: '',
    cost_per_person: ''
  })

  useEffect(() => {
    loadTransports()
  }, [trip.id])

  async function loadTransports() {
    const { data } = await supabase
      .from('trip_transport')
      .select('*')
      .eq('trip_id', trip.id)
      .order('departure_time', { ascending: true })
    setTransports(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('trip_transport').insert({
      trip_id: trip.id,
      type: formData.type,
      booking_details: formData.booking_details,
      departure_time: formData.departure_time,
      arrival_time: formData.arrival_time,
      pickup_location: formData.pickup_location,
      cost_per_person: formData.cost_per_person ? parseFloat(formData.cost_per_person) : null
    })

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Transport added!', 'success')
      setShowForm(false)
      setFormData({ type: 'train', booking_details: '', departure_time: '', arrival_time: '', pickup_location: '', cost_per_person: '' })
      loadTransports()
    }
  }

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Transport & Tickets</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Transport'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="detail-card" style={{ marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transport Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="train">Train</option>
                <option value="flight">Flight</option>
                <option value="bus">Bus</option>
                <option value="car">Car</option>
                <option value="bike">Bike/Scooter</option>
                <option value="local">Local Transport</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost per Person (₹)</label>
              <input 
                type="number" 
                value={formData.cost_per_person} 
                onChange={e => setFormData({...formData, cost_per_person: e.target.value})} 
                placeholder="250"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Booking Details (PNR/Ticket Number)</label>
            <input 
              type="text" 
              value={formData.booking_details} 
              onChange={e => setFormData({...formData, booking_details: e.target.value})} 
              placeholder="PNR: 1234567890 or Car: KA 01 AB 1234"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <input 
                type="time" 
                value={formData.departure_time} 
                onChange={e => setFormData({...formData, departure_time: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Arrival Time</label>
              <input 
                type="time" 
                value={formData.arrival_time} 
                onChange={e => setFormData({...formData, arrival_time: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pickup Location / How to Reach</label>
            <input 
              type="text" 
              value={formData.pickup_location} 
              onChange={e => setFormData({...formData, pickup_location: e.target.value})} 
              placeholder="Hyderabad Railway Station or Meet at Metro Station"
            />
          </div>

          <button type="submit" className="btn btn-primary">Add Transport</button>
        </form>
      )}

      {loading ? (
        <div className="loading-center">Loading transport...</div>
      ) : transports.length === 0 ? (
        <p className="empty-state" style={{padding: 40, textAlign: 'center', color: 'var(--text3)'}}>No transport details added yet</p>
      ) : (
        <div className="transport-list">
          {transports.map(transport => (
            <div key={transport.id} className="transport-item">
              <div className="transport-header">
                <span className={`transport-type ${transport.type}`}>{transport.type}</span>
                <div className="transport-times">
                  {transport.departure_time && <span>{transport.departure_time.substring(0, 5)}</span>}
                  {transport.departure_time && transport.arrival_time && <span> → </span>}
                  {transport.arrival_time && <span>{transport.arrival_time.substring(0, 5)}</span>}
                </div>
              </div>
              {transport.booking_details && (
                <div className="transport-booking">{transport.booking_details}</div>
              )}
              {transport.pickup_location && (
                <div className="transport-pickup">📍 {transport.pickup_location}</div>
              )}
              {transport.cost_per_person && (
                <div className="transport-cost">₹{transport.cost_per_person} per person</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Packing Tab
function PackingTab({ trip }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [packingItems, setPackingItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [itemType, setItemType] = useState('personal')

  useEffect(() => {
    loadPackingItems()
  }, [trip.id])

  async function loadPackingItems() {
    const { data } = await supabase
      .from('trip_packing')
      .select('*')
      .eq('trip_id', trip.id)
      .order('is_checked', { ascending: true })
      .order('created_at', { ascending: false })
    setPackingItems(data || [])
    setLoading(false)
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!newItem.trim()) return

    const { error } = await supabase.from('trip_packing').insert({
      trip_id: trip.id,
      item_name: newItem.trim(),
      type: itemType,
      added_by: user.id
    })

    if (error) {
      toast(error.message, 'error')
    } else {
      setNewItem('')
      loadPackingItems()
    }
  }

  async function toggleItem(itemId, currentChecked) {
    const { error } = await supabase
      .from('trip_packing')
      .update({ is_checked: !currentChecked })
      .eq('id', itemId)

    if (!error) loadPackingItems()
  }

  async function deleteItem(itemId) {
    const { error } = await supabase
      .from('trip_packing')
      .delete()
      .eq('id', itemId)

    if (!error) {
      toast('Item removed', 'info')
      loadPackingItems()
    }
  }

  const personalItems = packingItems.filter(item => item.type === 'personal')
  const sharedItems = packingItems.filter(item => item.type === 'shared')

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Packing List</h3>
      </div>

      <form onSubmit={handleAddItem} className="packing-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <input 
              type="text" 
              value={newItem} 
              onChange={e => setNewItem(e.target.value)} 
              placeholder="Add item to pack..."
              required 
            />
          </div>
          <div className="form-group">
            <select value={itemType} onChange={e => setItemType(e.target.value)}>
              <option value="personal">Personal</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Add</button>
        </div>
      </form>

      {loading ? (
        <div className="loading-center">Loading packing list...</div>
      ) : (
        <div className="packing-sections">
          <div className="packing-section">
            <h4>Personal Items ({personalItems.length})</h4>
            {personalItems.length === 0 ? (
              <p className="empty-state" style={{fontSize: 14, color: 'var(--text3)', padding: 16}}>No personal items added</p>
            ) : (
              <div className="packing-list">
                {personalItems.map(item => (
                  <div key={item.id} className={`packing-item ${item.is_checked ? 'checked' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={item.is_checked} 
                      onChange={() => toggleItem(item.id, item.is_checked)}
                    />
                    <span className="packing-item-name">{item.item_name}</span>
                    <button 
                      type="button" 
                      className="btn-icon-sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="packing-section">
            <h4>Shared Items ({sharedItems.length})</h4>
            {sharedItems.length === 0 ? (
              <p className="empty-state" style={{fontSize: 14, color: 'var(--text3)', padding: 16}}>No shared items added</p>
            ) : (
              <div className="packing-list">
                {sharedItems.map(item => (
                  <div key={item.id} className={`packing-item ${item.is_checked ? 'checked' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={item.is_checked} 
                      onChange={() => toggleItem(item.id, item.is_checked)}
                    />
                    <span className="packing-item-name">{item.item_name}</span>
                    <button 
                      type="button" 
                      className="btn-icon-sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
