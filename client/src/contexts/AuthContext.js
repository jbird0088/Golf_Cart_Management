import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token'),
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp < currentTime) {
            console.error('Token expired');
            localStorage.removeItem('token');
            setAuthState({
              token: null,
              user: null,
              isAuthenticated: false,
              loading: false,
            });
            return;
          }

          const res = await axios.get('http://localhost:5000/api/protected', {
            headers: {
              'x-auth-token': token,
            },
          });

          setAuthState({
            token,
            user: res.data.user,
            isAuthenticated: true,
            loading: false,
          });
        } catch (err) {
          setAuthState({
            token: null,
            user: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      } else {
        setAuthState({
          token: null,
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    };
    fetchUser();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', { username, password });
      const { token } = res.data;
      const decoded = jwtDecode(token);

      localStorage.setItem('token', token);
      setAuthState({
        token,
        user: decoded.user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      const message = err.response && err.response.data && err.response.data.message 
        ? err.response.data.message 
        : 'Login failed';
      console.error('Login Error:', message); // Log error
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({
      token: null,
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
