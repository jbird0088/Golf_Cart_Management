import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const AdminRoute = ({ element }) => {
  const { authState } = useContext(AuthContext);

  if (authState.loading) {
    return <p>Loading...</p>;
  }

  if (!authState.isAuthenticated || authState.user.role.toLowerCase() !== 'admin') {
    return <Navigate to="/login" />;
  }

  return element;
};

export default AdminRoute;
