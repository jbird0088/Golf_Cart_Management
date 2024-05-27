import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminRoute component={AdminPage} />} />
          <Route path="/" element={<ProtectedRoute component={() => <div>Home Page</div>} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
