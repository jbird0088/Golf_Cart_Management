import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Correct named import

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
      if (authState.token) {
        try {
          const res = await axios.get('http://localhost:5000/api/protected', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          setAuthState({
            ...authState,
            user: res.data.user,
            isAuthenticated: true,
            loading: false,
          });
        } catch (err) {
          console.error(err);
          setAuthState({
            ...authState,
            token: null,
            user: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      } else {
        setAuthState({
          ...authState,
          loading: false,
        });
      }
    };
    fetchUser();
  }, [authState.token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', { username, password });
      const { token } = res.data;
      const decoded = jwtDecode(token); // Correct usage

      localStorage.setItem('token', token);
      setAuthState({
        ...authState,
        token,
        user: decoded.user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({
      ...authState,
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
