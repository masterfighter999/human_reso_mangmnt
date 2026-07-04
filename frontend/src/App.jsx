import React, { createContext, useState, useEffect, useContext } from 'react';
import { NotificationProvider, useNotification } from './components/NotificationContext';
import ToastContainer from './components/ToastContainer';
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
  const { logout, user, activeRole, viewMode, setViewMode } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>Align HRMS</h2>
        <span>perfectly aligned</span>
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

        {activeRole === 'admin' && (
          <>
            <Link to="/employees" className={`nav-item ${isActive('/employees')}`}>
              <span className="icon">👥</span> Employees
            </Link>
            <Link to="/approvals" className={`nav-item ${isActive('/approvals')}`}>
              <span className="icon">✓</span> Approvals Queue
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user?.role === 'admin' && (
          <div className="role-switcher-section">
            <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: '600' }}>View As:</span>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="admin">HR Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        )}
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
    if (activeCheckIn) return 'present';
    return 'absent';
  };

  const getStatusText = () => {
    if (activeCheckIn) {
      const checkInTime = new Date(activeCheckIn.check_in);
      return `Checked In at ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Checked Out';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="display-font" style={{ fontSize: '1.2rem', marginRight: '8px' }}>
          {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="mono-font" style={{ fontSize: '0.9rem', color: 'var(--muted)', background: 'var(--panel)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
          {formatTime(currentTime)}
        </span>
      </div>

      <div className="header-right">
        <div className="systray-widget">
          <div className="status-indicator">
            <span className={`status-dot ${getStatusColor()}`}></span>
            <span className="status-text" style={{ fontSize: '0.85rem' }}>{getStatusText()}</span>
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
import Employees from './pages/Employees';
import Approvals from './pages/Approvals';

function AppInner() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('admin');

  // Authenticate user on load
  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
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
      if (data.me && data.me.role) {
        setViewMode(data.me.role);
      }
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
    if (userData && userData.role) {
      setViewMode(userData.role);
    }
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
        notify.success('Successfully Checked Out! Have a great rest of your day.');
      } else {
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
        notify.success('Successfully Checked In! Your shift has started.');
      }
      loadUser();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const activeRole = user?.role === 'admin' ? viewMode : 'employee';
  const notify = useNotification();

  return (
    <AuthContext.Provider value={{ token, user, employee, activeCheckIn, loading, login, logout, handleCheckInOut, reloadUser: loadUser, activeRole, viewMode, setViewMode }}>
      <Router>
        <ToastContainer />
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

          {/* Admin Protected Routes */}
          <Route path="/employees" element={
            <ProtectedRoute>
              {activeRole === 'admin' ? <Layout><Employees /></Layout> : <Navigate to="/" replace />}
            </ProtectedRoute>
          } />

          <Route path="/approvals" element={
            <ProtectedRoute>
              {activeRole === 'admin' ? <Layout><Approvals /></Layout> : <Navigate to="/" replace />}
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  );
}
