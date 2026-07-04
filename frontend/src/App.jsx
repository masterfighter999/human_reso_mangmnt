import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';

// Auth Context to manage state globally
export const AuthContext = createContext();

export const GRAPHQL_URL = 'http://localhost:4000/graphql';

export async function graphqlRequest(query, variables = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

// Sidebar Navigation Component
function Sidebar() {
  const { logout, user } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-logo">
        <h2>Odoo India</h2>
        <span>HRMS Portal</span>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <span className="icon">📊</span> Dashboard
        </Link>
        <Link to="/profile" className={`nav-item ${isActive('/profile')}`}>
          <span className="icon">👤</span> My Profile
        </Link>
        <Link to="/attendance" className={`nav-item ${isActive('/attendance')}`}>
          <span className="icon">⏰</span> Attendance
        </Link>
        <Link to="/leave" className={`nav-item ${isActive('/leave')}`}>
          <span className="icon">✈️</span> Time Off
        </Link>
        <Link to="/payroll" className={`nav-item ${isActive('/payroll')}`}>
          <span className="icon">💰</span> Payroll
        </Link>
      </nav>

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn">
          <span className="icon">🚪</span> Log Out
        </button>
      </div>
    </div>
  );
}

// Header Component
function Header() {
  const { user, employee, activeCheckIn, handleCheckInOut } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusColor = () => {
    if (activeCheckIn) return 'present'; // Green
    return 'absent'; // Yellow
  };

  const getStatusText = () => {
    if (activeCheckIn) {
      const checkInTime = new Date(activeCheckIn.check_in);
      return `Checked In since ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Checked Out';
  };

  return (
    <header className="app-header glass-panel">
      <div className="header-left">
        <span className="date-display">{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span className="time-display">{formatTime(currentTime)}</span>
      </div>

      <div className="header-right">
        <div className="systray-widget">
          <div className="status-indicator">
            <span className={`status-dot ${getStatusColor()}`}></span>
            <span className="status-text">{getStatusText()}</span>
          </div>
          <button 
            className={`check-btn ${activeCheckIn ? 'checkout' : 'checkin'}`} 
            onClick={handleCheckInOut}
          >
            {activeCheckIn ? 'Check Out' : 'Check In'}
          </button>
        </div>

        <div className="user-avatar-dropdown">
          <img 
            className="avatar-img" 
            src={employee?.profile_picture_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
            alt="Profile Avatar"
          />
          <div className="avatar-info">
            <span className="user-name">{employee ? `${employee.first_name} ${employee.last_name}` : 'User'}</span>
            <span className="user-role">{user?.role === 'admin' ? 'HR / Admin' : 'Employee'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// Layout Wrapper
function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="layout-right">
        <Header />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div className="loading-spinner">Loading HRMS...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Pages Import
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Attendance from './pages/Attendance';
import TimeOff from './pages/TimeOff';
import Payroll from './pages/Payroll';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticate user on load
  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // Get me query
      const meQuery = `
        query {
          me {
            id
            login_id
            email
            role
          }
          myProfile {
            id
            first_name
            last_name
            profile_picture_url
            date_of_joining
            department
            designation
            phone
            address
            date_of_birth
            gender
            marital_status
            nationality
            personal_email
            residing_address
            about_me
            skills
            certifications
            interests
          }
          activeCheckIn {
            id
            check_in
          }
        }
      `;
      const data = await graphqlRequest(meQuery);
      setUser(data.me);
      setEmployee(data.myProfile);
      setActiveCheckIn(data.activeCheckIn);
    } catch (err) {
      console.error("Failed to load user:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [token]);

  const login = (jwtToken, userData, employeeData) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
    setEmployee(employeeData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setEmployee(null);
    setActiveCheckIn(null);
  };

  const handleCheckInOut = async () => {
    try {
      if (activeCheckIn) {
        // Run checkOut mutation
        const checkOutMutation = `
          mutation {
            checkOut(remarks: "Checked out via header button") {
              id
              check_out
              work_hours
              extra_hours
            }
          }
        `;
        await graphqlRequest(checkOutMutation);
        setActiveCheckIn(null);
        alert('Successfully Checked Out!');
      } else {
        // Run checkIn mutation
        const checkInMutation = `
          mutation {
            checkIn(remarks: "Checked in via header button") {
              id
              check_in
            }
          }
        `;
        const data = await graphqlRequest(checkInMutation);
        setActiveCheckIn(data.checkIn);
        alert('Successfully Checked In!');
      }
      // Reload profile/active logs
      loadUser();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, employee, activeCheckIn, loading, login, logout, handleCheckInOut, reloadUser: loadUser }}>
      <Router>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/signup" element={token ? <Navigate to="/" replace /> : <SignUp />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute>
              <Layout><Attendance /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/leave" element={
            <ProtectedRoute>
              <Layout><TimeOff /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/payroll" element={
            <ProtectedRoute>
              <Layout><Payroll /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
