import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const AdminRoute = ({ component: Component }) => {
  const { authState } = useContext(AuthContext);

  return authState.isAuthenticated && authState.user.role === 'Admin' ? (
    <Component />
  ) : (
    <Navigate to="/login" />
  );
};

export default AdminRoute;
