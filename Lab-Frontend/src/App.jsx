import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage'
import SignUpPage from './pages/Auth/SignUpPage'
import Dashboard from './pages/Dashboard/Dashboard'
import LabDetails from './pages/Lab/LabDetails'
import SessionPage from './pages/Session/SessionPage'
import TimetablePage from './pages/TimeTable/TimeTablePage'
import ReportsPage from './pages/Reports/ReportsPage'
import ReportDetails from './pages/Reports/ReportDetails'
import AdminPage from './pages/Admin/AdminPage'
import Navbar from './components/Layout/Navbar'
import Footer from './components/Layout/Footer';
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'


function App() {
  const { fetchMe, user, loading } = useAuth()

  useEffect(() => {
    // fetch current user on app load
    fetchMe()
  }, [])

  // Show a loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl font-semibold text-gray-700">
        Loading...
      </div>
    )
  }

  return (
    <div
  className={
    user
      ? 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100'
      : 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100'
  }
>

      {user && <Navbar />}
      <main className="p-4">
        <Routes>
          {/* Root path: Redirect depending on user state */}
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/labs/:labId" element={<LabDetails />} />
            <Route path="/sessions/:sessionId" element={<SessionPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:id" element={<ReportDetails />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<div className="text-center mt-20">404 - Not Found</div>} />
        </Routes>
        {user && <Footer />}
      </main>
    </div>
  )
}

export default App
