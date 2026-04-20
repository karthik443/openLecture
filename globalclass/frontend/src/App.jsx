import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CourseCatalog from './pages/CourseCatalog';
import LecturePage from './pages/LecturePage';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/catalog" element={<PrivateRoute><CourseCatalog /></PrivateRoute>} />
        <Route path="/lecture/:id" element={<PrivateRoute><LecturePage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/catalog" />} />
      </Routes>
    </BrowserRouter>
  );
}
