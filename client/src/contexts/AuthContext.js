import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode'; // Correct named import

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

          console.log('Decoded Token:', decodedToken); // Log decoded token

          const res = await axios.get('http://localhost:5000/api/protected', {
            headers: {
              'x-auth-token': token,
            },
          });
          console.log('Fetch User Response:', res.data); // Log response

          setAuthState({
            token,
            user: res.data.user,
            isAuthenticated: true,
            loading: false,
          });
          console.log('Updated Auth State:', {
            token,
            user: res.data.user,
            isAuthenticated: true,
            loading: false,
          }); // Log updated state
        } catch (err) {
          console.error('Error fetching user:', err); // Log error
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
      console.log('Decoded JWT:', decoded); // Log the decoded JWT

      localStorage.setItem('token', token);
      setAuthState({
        token,
        user: decoded.user,
        isAuthenticated: true,
        loading: false,
      });
      console.log('Updated Auth State after login:', {
        token,
        user: decoded.user,
        isAuthenticated: true,
        loading: false,
      }); // Log updated state
    } catch (err) {
      console.error('Login Error:', err); // Log error
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
