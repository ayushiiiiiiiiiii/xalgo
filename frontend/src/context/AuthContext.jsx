import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Persistent Hydration Check
  useEffect(() => {
    const storedToken = localStorage.getItem('xalgo_token');
    const storedUser = localStorage.getItem('xalgo_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error('❌ [AUTH] Failed to hydrate authentication state:', err);
        localStorage.removeItem('xalgo_token');
        localStorage.removeItem('xalgo_user');
      }
    }
    setLoading(false);
  }, []);

  const loginAction = async (credentials, isRegister = false) => {
    const endpoint = isRegister ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
    
    // Format body fields for login/register
    const body = isRegister 
      ? { username: credentials.username, email: credentials.email, password: credentials.password }
      : { identifier: credentials.identifier || credentials.username, password: credentials.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication clearance refused.');
      }

      // Save credentials in browser storage
      localStorage.setItem('xalgo_token', data.token);
      localStorage.setItem('xalgo_user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (err) {
      console.error('❌ [AUTH] Access failure:', err);
      throw err;
    }
  };

  const logoutAction = async () => {
    try {
      // Clean localized storage keys
      localStorage.removeItem('xalgo_token');
      localStorage.removeItem('xalgo_user');

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('❌ [AUTH] Logout failed:', err);
    }
  };

  const fetchLatestProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        await logoutAction();
        return;
      }
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('xalgo_user', JSON.stringify(data.user));
        console.log('⚡ [AUTH] Profile successfully auto-hydrated.', data.user);
      }
    } catch (err) {
      console.error('❌ [AUTH] Profile hydration error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isAuthenticated,
        loading,
        loginAction,
        logoutAction,
        fetchLatestProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
