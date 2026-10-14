import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage for an existing session
    const storedUser = localStorage.getItem('trip_planner_user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        fetchProfile(parsed.id)
      } catch (err) {
        localStorage.removeItem('trip_planner_user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }
      
      if (data && !data.is_approved) {
        logout()
        throw new Error('Your account is pending admin approval.')
      }

      setProfile(data)
    } catch (err) {
      console.error('fetchProfile error', err)
      logout()
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Define custom login since we are no longer using supabase.auth
  async function login(email, password) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (error || !data) {
      throw new Error('Invalid email or password.')
    }

    if (!data.is_approved) {
      throw new Error('Your account is pending admin approval.')
    }

    // Set "session"
    const sessionObj = { id: data.id, email: data.email }
    localStorage.setItem('trip_planner_user', JSON.stringify(sessionObj))
    setUser(sessionObj)
    setProfile(data)
    return data
  }

  // Define custom sign out
  function logout() {
    localStorage.removeItem('trip_planner_user')
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = () => user && fetchProfile(user.id)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
