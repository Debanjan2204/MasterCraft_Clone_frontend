
import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const data = await apiLogin(username, password)
    localStorage.setItem('access_token', data.access_token)
    // decode basic info from JWT payload
    const payload = JSON.parse(atob(data.access_token.split('.')[1]))
    const userObj = {
      id: payload.sub,          // username used as id for assigned-tickets call
      username: payload.sub,
      roles: payload.authorities || [],
    }
    localStorage.setItem('user', JSON.stringify(userObj))
    setToken(data.access_token)
    setUser(userObj)
    return userObj
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)