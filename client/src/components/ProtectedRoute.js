import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ component: Component }) => {
  const { authState } = useContext(AuthContext);

  return authState.isAuthenticated ? (
    <Component />
  ) : (
    <Navigate to="/login" />
  );
};

export default ProtectedRoute;
