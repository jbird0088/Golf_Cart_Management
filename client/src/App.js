import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

const HomePage = () => (
  <div>
    <h1>Home Page</h1>
    <p>Welcome to the home page!</p>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminRoute element={<AdminPage />} />} />
          <Route path="/" element={<ProtectedRoute element={<HomePage />} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
