// ALMANIK PMS - FRONTEND ULTRA SIMPLE
// TODO EL FRONTEND EN 1 ARCHIVO

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [sessionId, setSessionId] = useState(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    return storedSessionId;
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [beds, setBeds] = useState([]);
  const [guests, setGuests] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [tours, setTours] = useState([]);

  // API helper with auth
  const apiCall = async (endpoint, options = {}) => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');

    if (!currentSessionId) {
      console.error('No session ID available');
      setSessionId(null);
      localStorage.removeItem('sessionId');
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'session-id': currentSessionId,
          ...options.headers
        }
      });

      if (response.status === 401) {
        console.error('Session expired or invalid');
        setSessionId(null);
        localStorage.removeItem('sessionId');
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API call failed:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        alert('Error de conexión. Verifique que el servidor esté ejecutándose.');
      }
      throw error;
    }
  };

  // Load data
  const loadData = async () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) return;

    try {
      const [bedsData, guestsData, productsData, staffData, cashData, dashData, toursData] = await Promise.all([
        apiCall('/beds').catch(e => { console.error('Failed to load beds:', e); return null; }),
        apiCall('/guests').catch(e => { console.error('Failed to load guests:', e); return null; }),
        apiCall('/products').catch(e => { console.error('Failed to load products:', e); return null; }),
        apiCall('/staff').catch(e => { console.error('Failed to load staff:', e); return null; }),
        apiCall('/cash-movements').catch(e => { console.error('Failed to load cash:', e); return null; }),
        apiCall('/dashboard').catch(e => { console.error('Failed to load dashboard:', e); return null; }),
        apiCall('/tours').catch(e => { console.error('Failed to load tours:', e); return null; })
      ]);

      if (bedsData) setBeds(bedsData);
      if (guestsData) setGuests(guestsData);
      if (productsData) setProducts(productsData);
      if (staffData) setStaff(staffData);
      if (cashData) setCashMovements(cashData);
      if (dashData) setDashboardData(dashData);
      if (toursData) setTours(toursData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  // LOGIN COMPONENT
  if (!sessionId) {
    return <LoginForm onLogin={setSessionId} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* SIDEBAR */}
      <div style={{ width: '200px', backgroundColor: '#2c3e50', color: 'white', padding: '20px' }}>
        <h2 style={{ margin: '0 0 30px 0', fontSize: '18px' }}>ALMANIK PMS</h2>

        <button
          onClick={() => setCurrentView('dashboard')}
          style={buttonStyle(currentView === 'dashboard')}
        >
          📊 Dashboard
        </button>

        <button
          onClick={() => setCurrentView('beds')}
          style={buttonStyle(currentView === 'beds')}
        >
          🛏️ Beds
        </button>

        <button
          onClick={() => setCurrentView('guests')}
          style={buttonStyle(currentView === 'guests')}
        >
          👥 Guests
        </button>

        <button
          onClick={() => setCurrentView('pos')}
          style={buttonStyle(currentView === 'pos')}
        >
          🛒 POS
        </button>

        <button
          onClick={() => setCurrentView('staff')}
          style={buttonStyle(currentView === 'staff')}
        >
          👨‍💼 Staff
        </button>

        <button
          onClick={() => setCurrentView('cash')}
          style={buttonStyle(currentView === 'cash')}
        >
          💰 Cash
        </button>

        <button
          onClick={() => setCurrentView('reports')}
          style={buttonStyle(currentView === 'reports')}
        >
          📈 Reports
        </button>

        <button
          onClick={() => setCurrentView('tours')}
          style={buttonStyle(currentView === 'tours')}
        >
          🚶 Tours
        </button>

        <button
          onClick={() => {
            apiCall('/logout', { method: 'POST', body: JSON.stringify({ sessionId }) });
            setSessionId(null);
            localStorage.removeItem('sessionId');
          }}
          style={{ ...buttonStyle(false), marginTop: '50px', backgroundColor: '#e74c3c' }}
        >
          🚪 Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        {currentView === 'dashboard' && <Dashboard data={dashboardData} beds={beds} />}
        {currentView === 'beds' && <BedsView beds={beds} guests={guests} onUpdate={loadData} />}
        {currentView === 'guests' && <GuestsView guests={guests} onUpdate={loadData} />}
        {currentView === 'pos' && <POSView products={products} beds={beds} onUpdate={loadData} />}
        {currentView === 'staff' && <StaffView staff={staff} onUpdate={loadData} />}
        {currentView === 'cash' && <CashView cashMovements={cashMovements} onUpdate={loadData} />}
        {currentView === 'tours' && <ToursView tours={tours} onUpdate={loadData} apiCall={apiCall} />}
        {currentView === 'reports' && <ReportsView apiCall={apiCall} />}
      </div>
    </div>
  );
}

// LOGIN FORM
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('sessionId', data.sessionId);
        onLogin(data.sessionId);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#ecf0f1' }}>
      <form onSubmit={handleLogin} style={{ padding: '40px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>ALMANIK PMS</h1>

        {error && <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ ...buttonStyle(true), width: '100%', padding: '12px' }}
        >
          {loading ? 'Logging in...' : 'LOGIN'}
        </button>
      </form>
    </div>
  );
}

// DASHBOARD
function Dashboard({ data, beds }) {
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const cleanBeds = beds.filter(b => b.status === 'clean').length;
  const dirtyBeds = beds.filter(b => b.status === 'dirty').length;
  const totalBeds = beds.length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Sample activity data
  const recentActivity = [
    { type: 'checkin', message: 'John Smith checked into Bed A1', time: '2 minutes ago', icon: '👤' },
    { type: 'sale', message: 'Beer Corona x2 sold to Room B2', time: '15 minutes ago', icon: '🛒' },
    { type: 'payment', message: '$45 payment received - Bed A3', time: '32 minutes ago', icon: '💰' },
    { type: 'checkout', message: 'Maria Garcia checked out from Bed A3', time: '1 hour ago', icon: '🚪' }
  ];

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ padding: '0 15px' }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: window.innerWidth <= 768 ? '20px' : '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        display: 'flex',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: window.innerWidth <= 768 ? 'center' : 'center',
        textAlign: window.innerWidth <= 768 ? 'center' : 'left'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: window.innerWidth <= 768 ? '24px' : '36px',
            fontWeight: '700'
          }}>
            Welcome back, Admin! 👋
          </h1>
          <p style={{
            margin: '0',
            fontSize: window.innerWidth <= 768 ? '16px' : '18px',
            opacity: '0.9'
          }}>
            Here's what's happening at your hostel today
          </p>
        </div>
        <div style={{
          textAlign: window.innerWidth <= 768 ? 'center' : 'right',
          marginTop: window.innerWidth <= 768 ? '15px' : '0'
        }}>
          <div style={{
            fontSize: window.innerWidth <= 768 ? '20px' : '24px',
            fontWeight: '600',
            marginBottom: '5px'
          }}>
            {currentTime}
          </div>
          <div style={{
            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
            opacity: '0.8'
          }}>
            {currentDate}
          </div>
        </div>
      </div>

      {/* MAIN STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768
          ? 'repeat(auto-fit, minmax(250px, 1fr))'
          : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
      }}>
        <EnhancedStatCard
          title="Occupied Beds"
          value={occupiedBeds}
          total={totalBeds}
          color="#e74c3c"
          icon="🛏️"
          percentage={occupancyRate}
          trend="+2 from yesterday"
        />
        <EnhancedStatCard
          title="Clean Beds"
          value={cleanBeds}
          total={totalBeds}
          color="#2ecc71"
          icon="✅"
          percentage={Math.round((cleanBeds / totalBeds) * 100)}
          trend="Ready for guests"
        />
        <EnhancedStatCard
          title="Dirty Beds"
          value={dirtyBeds}
          total={totalBeds}
          color="#f39c12"
          icon="🧹"
          percentage={Math.round((dirtyBeds / totalBeds) * 100)}
          trend="Needs cleaning"
        />
        <EnhancedStatCard
          title="Today Revenue"
          value={`$${data.todayRevenue || 1220}`}
          color="#3498db"
          icon="💰"
          trend="+15% vs yesterday"
          isRevenue={true}
        />
      </div>

      {/* FINANCIAL OVERVIEW */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          color: '#2c3e50'
        }}>
          📊 Financial Overview
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <FinancialMetric label="Weekly Income" value="$2,450" color="#2ecc71" />
          <FinancialMetric label="Weekly Expenses" value="$1,230" color="#e74c3c" />
          <FinancialMetric label="Net Profit" value="$1,220" color="#3498db" />
          <FinancialMetric label="Occupancy Rate" value={`${occupancyRate}%`} color="#9b59b6" />
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '2fr 1fr',
        gap: '30px',
        marginBottom: '30px',
        margin: '0 15px 30px 15px'
      }}>
        {/* BED STATUS OVERVIEW */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            color: '#2c3e50'
          }}>
            🏠 Bed Status Overview
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth <= 768
              ? 'repeat(auto-fit, minmax(100px, 1fr))'
              : 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '15px'
          }}>
            {beds.length > 0 ? beds.map(bed => (
              <BedStatusCard key={bed.id} bed={bed} />
            )) : (
              // Sample beds if no data
              [
                { id: 1, name: 'A1', status: 'occupied', guest_name: 'John Smith' },
                { id: 2, name: 'A2', status: 'clean' },
                { id: 3, name: 'A3', status: 'occupied', guest_name: 'Maria Garcia' },
                { id: 4, name: 'B1', status: 'dirty' },
                { id: 5, name: 'B2', status: 'occupied', guest_name: 'Hans Mueller' },
                { id: 6, name: 'B3', status: 'clean' }
              ].map(bed => (
                <BedStatusCard key={bed.id} bed={bed} />
              ))
            )}
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: window.innerWidth <= 768 ? '300px' : '500px',
          overflowY: 'auto',
          marginTop: window.innerWidth <= 768 ? '20px' : '0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            color: '#2c3e50'
          }}>
            ⚡ Recent Activity
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          color: '#2c3e50'
        }}>
          🚀 Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px'
        }}>
          <QuickActionCard
            title="Check-in Guest"
            description="Process new guest arrivals"
            icon="👤"
            color="#2ecc71"
          />
          <QuickActionCard
            title="POS Sales"
            description="Sell products and services"
            icon="🛒"
            color="#3498db"
          />
          <QuickActionCard
            title="Manage Staff"
            description="Employee and volunteer management"
            icon="👨‍💼"
            color="#9b59b6"
          />
          <QuickActionCard
            title="Cash Management"
            description="Track income and expenses"
            icon="💰"
            color="#f39c12"
          />
        </div>
      </div>
    </div>
  );
}

// ENHANCED STAT CARD COMPONENT
function EnhancedStatCard({ title, value, total, color, icon, percentage, trend, isRevenue }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '15px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: `3px solid ${color}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: color,
        opacity: '0.1'
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <div style={{ fontSize: '36px', fontWeight: '700', color, marginBottom: '5px' }}>
            {value}
            {total && !isRevenue && <span style={{ fontSize: '18px', color: '#7f8c8d' }}>/{total}</span>}
          </div>
          <div style={{ color: '#7f8c8d', fontSize: '16px', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{
            fontSize: '14px',
            color: trend.includes('+') ? '#2ecc71' : trend.includes('Ready') ? '#3498db' : '#e67e22',
            fontWeight: '600'
          }}>
            {trend}
          </div>
        </div>
        <div style={{ fontSize: '32px' }}>
          {icon}
        </div>
      </div>

      {!isRevenue && percentage && (
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#ecf0f1',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 1s ease'
          }}></div>
        </div>
      )}
    </div>
  );
}

// BED STATUS CARD COMPONENT
function BedStatusCard({ bed }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return '#e74c3c';
      case 'clean': return '#2ecc71';
      case 'dirty': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'occupied': return '#ffebee';
      case 'clean': return '#e8f5e8';
      case 'dirty': return '#fff3e0';
      default: return '#f8f9fa';
    }
  };

  return (
    <div style={{
      padding: '15px',
      borderRadius: '10px',
      textAlign: 'center',
      backgroundColor: getStatusBg(bed.status),
      border: `2px solid ${getStatusColor(bed.status)}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      minHeight: '80px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = `0 4px 12px ${getStatusColor(bed.status)}30`;
    }}
    onMouseLeave={(e) => {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = 'none';
    }}
    >
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
        {bed.name}
      </div>
      <div style={{ fontSize: '12px', color: getStatusColor(bed.status), fontWeight: '600', textTransform: 'uppercase' }}>
        {bed.status}
      </div>
      {bed.guest_name && (
        <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '5px' }}>
          {bed.guest_name}
        </div>
      )}
    </div>
  );
}

// FINANCIAL METRIC COMPONENT
function FinancialMetric({ label, value, color }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      border: `2px solid ${color}20`
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
        {label}
      </div>
    </div>
  );
}

// ACTIVITY ITEM COMPONENT
function ActivityItem({ activity }) {
  const getActivityColor = (type) => {
    switch (type) {
      case 'checkin': return '#2ecc71';
      case 'checkout': return '#e74c3c';
      case 'sale': return '#3498db';
      case 'payment': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '15px 0',
      borderBottom: '1px solid #ecf0f1'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: getActivityColor(activity.type),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '15px',
        fontSize: '18px'
      }}>
        {activity.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '5px' }}>
          {activity.message}
        </div>
        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
          {activity.time}
        </div>
      </div>
    </div>
  );
}

// QUICK ACTION CARD COMPONENT
function QuickActionCard({ title, description, icon, color }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      border: `2px solid ${color}20`,
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = `${color}10`;
      e.target.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = '#f8f9fa';
      e.target.style.transform = 'translateY(0)';
    }}
    >
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
        {description}
      </div>
    </div>
  );
}

// BEDS VIEW
function BedsView({ beds, guests, onUpdate }) {
  const [selectedBed, setSelectedBed] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState(null);

  const markBedClean = async (bedId) => {
    await fetch(`${API_BASE}/beds/${bedId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
      body: JSON.stringify({ status: 'clean' })
    });
    onUpdate();
  };

  const showBedBalance = async (bedId) => {
    try {
      const response = await fetch(`${API_BASE}/balance/${bedId}`, {
        headers: { 'session-id': localStorage.getItem('sessionId') }
      });
      const data = await response.json();
      setBalance(data);
      setShowBalance(true);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  return (
    <div>
      <h1>Beds Management</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {beds.map(bed => (
          <div
            key={bed.id}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: `3px solid ${bed.status === 'occupied' ? '#e74c3c' : bed.status === 'clean' ? '#2ecc71' : '#f39c12'}`
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>{bed.name}</h3>
            <p>Price: <strong>${bed.price}/night</strong></p>
            <p>Status: <strong style={{ color: bed.status === 'occupied' ? '#e74c3c' : bed.status === 'clean' ? '#2ecc71' : '#f39c12' }}>
              {bed.status.toUpperCase()}
            </strong></p>

            {bed.guest_name && (
              <p>Guest: <strong>{bed.guest_name}</strong></p>
            )}

            <div style={{ marginTop: '15px' }}>
              {bed.status === 'clean' && (
                <button
                  onClick={() => { setSelectedBed(bed); setShowCheckin(true); }}
                  style={{ ...buttonStyle(true), marginRight: '10px' }}
                >
                  CHECK-IN
                </button>
              )}

              {bed.status === 'occupied' && (
                <>
                  <button
                    onClick={() => showBedBalance(bed.id)}
                    style={{ ...buttonStyle(false), marginRight: '10px', backgroundColor: '#3498db' }}
                  >
                    BALANCE
                  </button>
                  <button
                    onClick={() => { setSelectedBed(bed); setShowBalance(false); setShowCheckin(true); }}
                    style={{ ...buttonStyle(true), backgroundColor: '#e74c3c' }}
                  >
                    CHECK-OUT
                  </button>
                </>
              )}

              {bed.status === 'dirty' && (
                <button
                  onClick={() => markBedClean(bed.id)}
                  style={{ ...buttonStyle(true), backgroundColor: '#2ecc71' }}
                >
                  MARK CLEAN
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCheckin && selectedBed && (
        <CheckinModal
          bed={selectedBed}
          guests={guests}
          onClose={() => { setShowCheckin(false); setSelectedBed(null); }}
          onUpdate={onUpdate}
          isCheckout={selectedBed.status === 'occupied'}
          balance={balance}
        />
      )}

      {showBalance && balance && (
        <BalanceModal
          balance={balance}
          onClose={() => { setShowBalance(false); setBalance(null); }}
        />
      )}
    </div>
  );
}

// CHECKIN/CHECKOUT MODAL
function CheckinModal({ bed, guests, onClose, onUpdate, isCheckout, balance }) {
  const [formData, setFormData] = useState({
    guest_id: '',
    check_in: new Date().toISOString().split('T')[0],
    check_out: '',
    payment_amount: '',
    payment_method: 'cash'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isCheckout) {
      // Checkout
      await fetch(`${API_BASE}/checkout/${bed.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
        body: JSON.stringify({
          payment_amount: parseFloat(formData.payment_amount) || 0,
          payment_method: formData.payment_method
        })
      });
    } else {
      // Checkin
      const nights = Math.ceil((new Date(formData.check_out) - new Date(formData.check_in)) / (1000 * 60 * 60 * 24));
      const total = bed.price * nights;

      await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
        body: JSON.stringify({
          ...formData,
          bed_id: bed.id,
          total
        })
      });
    }

    onUpdate();
    onClose();
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h2>{isCheckout ? 'Check-out' : 'Check-in'} - {bed.name}</h2>

        {isCheckout && balance && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h4>Current Balance: ${balance.balance}</h4>
            <p>Total Charges: ${balance.totalCharges}</p>
            <p>Total Payments: ${balance.totalPayments}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isCheckout && (
            <>
              <select
                value={formData.guest_id}
                onChange={(e) => setFormData({ ...formData, guest_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select Guest</option>
                {guests.map(guest => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name} - {guest.document}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                style={inputStyle}
                required
              />

              <input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                style={inputStyle}
                required
              />
            </>
          )}

          {isCheckout && (
            <>
              <input
                type="number"
                step="0.01"
                placeholder="Payment Amount"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                style={inputStyle}
              />

              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                style={inputStyle}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" style={buttonStyle(true)}>
              {isCheckout ? 'CHECK-OUT' : 'CHECK-IN'}
            </button>
            <button type="button" onClick={onClose} style={buttonStyle(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BALANCE MODAL
function BalanceModal({ balance, onClose }) {
  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h2>Guest Balance</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3>Guest: {balance.booking.guest_id}</h3>
          <p>Check-in: {balance.booking.check_in}</p>
          <p>Check-out: {balance.booking.check_out}</p>
          <hr />
          <h4>Balance: ${balance.balance}</h4>
          <p>Total Charges: ${balance.totalCharges}</p>
          <p>Total Payments: ${balance.totalPayments}</p>
        </div>

        <h4>Transactions:</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {balance.transactions.map(t => (
            <div key={t.id} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
              <strong>{t.type.toUpperCase()}</strong>: {t.description} - ${t.amount}
              <br />
              <small>{new Date(t.created_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ ...buttonStyle(true), marginTop: '20px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// GUESTS VIEW
function GuestsView({ guests, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
      body: JSON.stringify(formData)
    });

    setFormData({ name: '', email: '', phone: '', document: '' });
    setShowForm(false);
    onUpdate();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Guests</h1>
        <button onClick={() => setShowForm(true)} style={buttonStyle(true)}>
          Add Guest
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={tableHeaderStyle}>Phone</th>
              <th style={tableHeaderStyle}>Document</th>
              <th style={tableHeaderStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(guest => (
              <tr key={guest.id}>
                <td style={tableCellStyle}>{guest.name}</td>
                <td style={tableCellStyle}>{guest.email || '-'}</td>
                <td style={tableCellStyle}>{guest.phone || '-'}</td>
                <td style={tableCellStyle}>{guest.document}</td>
                <td style={tableCellStyle}>{new Date(guest.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>Add Guest</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />

              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={inputStyle}
              />

              <input
                type="text"
                placeholder="Document Number"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                style={inputStyle}
                required
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={buttonStyle(true)}>
                  Add Guest
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={buttonStyle(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// POS VIEW
function POSView({ products, beds, onUpdate }) {
  const [cart, setCart] = useState([]);
  const [chargeToRoom, setChargeToRoom] = useState(false);
  const [selectedBed, setSelectedBed] = useState('');

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const processSale = async () => {
    for (const item of cart) {
      await fetch(`${API_BASE}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
        body: JSON.stringify({
          product_id: item.id,
          quantity: item.quantity,
          booking_id: chargeToRoom ? selectedBed : null
        })
      });
    }

    setCart([]);
    setChargeToRoom(false);
    setSelectedBed('');
    onUpdate();
    alert('Sale completed!');
  };

  const occupiedBeds = beds.filter(bed => bed.status === 'occupied');

  return (
    <div>
      <h1>POS - Point of Sale</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '2fr 1fr',
        gap: '20px',
        margin: '0 15px'
      }}>
        {/* PRODUCTS */}
        <div>
          <h3>Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  padding: '20px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'center'
                }}
              >
                <strong>{product.name}</strong>
                <br />
                ${product.price}
              </button>
            ))}
          </div>
        </div>

        {/* CART */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: window.innerWidth <= 768 ? '20px' : '0'
        }}>
          <h3>Cart</h3>

          {cart.length === 0 ? (
            <p>Cart is empty</p>
          ) : (
            <div>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <div>
                    <strong>{item.name}</strong>
                    <br />
                    ${item.price} x {item.quantity}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <hr />

              <div style={{ marginBottom: '15px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={chargeToRoom}
                    onChange={(e) => setChargeToRoom(e.target.checked)}
                    style={{ marginRight: '10px' }}
                  />
                  Charge to room
                </label>
              </div>

              {chargeToRoom && (
                <select
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '15px' }}
                  required
                >
                  <option value="">Select bed</option>
                  {occupiedBeds.map(bed => (
                    <option key={bed.id} value={bed.id}>
                      {bed.name} - {bed.guest_name}
                    </option>
                  ))}
                </select>
              )}

              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                Total: ${getTotal()}
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || (chargeToRoom && !selectedBed)}
                style={{ ...buttonStyle(true), width: '100%', padding: '15px', fontSize: '16px' }}
              >
                PROCESS SALE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// STAFF VIEW
function StaffView({ staff, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'volunteer', // volunteer or employee
    type: 'volunteer', // volunteer or employee
    hourly_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
    notes: '',
    is_active: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = editingStaff ? `/staff/${editingStaff.id}` : '/staff';
    const method = editingStaff ? 'PUT' : 'POST';

    await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
      body: JSON.stringify(formData)
    });

    setFormData({
      name: '', email: '', phone: '', role: 'volunteer', type: 'volunteer',
      hourly_rate: '', start_date: new Date().toISOString().split('T')[0],
      emergency_contact: '', notes: '', is_active: true
    });
    setShowForm(false);
    setEditingStaff(null);
    onUpdate();
  };

  const editStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role,
      type: staffMember.type,
      hourly_rate: staffMember.hourly_rate || '',
      start_date: staffMember.start_date ? staffMember.start_date.split('T')[0] : '',
      emergency_contact: staffMember.emergency_contact || '',
      notes: staffMember.notes || '',
      is_active: staffMember.is_active
    });
    setShowForm(true);
  };

  const toggleActive = async (staffId, currentStatus) => {
    await fetch(`${API_BASE}/staff/${staffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
      body: JSON.stringify({ is_active: !currentStatus })
    });
    onUpdate();
  };

  const volunteers = staff.filter(s => s.type === 'volunteer');
  const employees = staff.filter(s => s.type === 'employee');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Staff Management</h1>
        <button onClick={() => setShowForm(true)} style={buttonStyle(true)}>
          Add Staff Member
        </button>
      </div>

      {/* STATISTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <StatCard title="Total Staff" value={staff.length} color="#3498db" />
        <StatCard title="Employees" value={employees.length} color="#2ecc71" />
        <StatCard title="Volunteers" value={volunteers.length} color="#f39c12" />
        <StatCard title="Active" value={staff.filter(s => s.is_active).length} color="#27ae60" />
      </div>

      {/* EMPLOYEES SECTION */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#2ecc71', marginBottom: '15px' }}>👨‍💼 Employees</h3>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#e8f5e8' }}>
              <tr>
                <th style={tableHeaderStyle}>Name</th>
                <th style={tableHeaderStyle}>Contact</th>
                <th style={tableHeaderStyle}>Role</th>
                <th style={tableHeaderStyle}>Rate/Hour</th>
                <th style={tableHeaderStyle}>Start Date</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} style={{ backgroundColor: employee.is_active ? 'white' : '#f8f9fa' }}>
                  <td style={tableCellStyle}>
                    <strong>{employee.name}</strong>
                    {employee.notes && <br />}
                    {employee.notes && <small style={{ color: '#666' }}>{employee.notes}</small>}
                  </td>
                  <td style={tableCellStyle}>
                    {employee.email && <div>{employee.email}</div>}
                    {employee.phone && <div>{employee.phone}</div>}
                  </td>
                  <td style={tableCellStyle}>{employee.role}</td>
                  <td style={tableCellStyle}>${employee.hourly_rate || 'N/A'}</td>
                  <td style={tableCellStyle}>
                    {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      color: employee.is_active ? '#2ecc71' : '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <button
                      onClick={() => editStaff(employee)}
                      style={{ ...buttonStyle(false), backgroundColor: '#3498db', marginRight: '5px', padding: '5px 10px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(employee.id, employee.is_active)}
                      style={{
                        ...buttonStyle(false),
                        backgroundColor: employee.is_active ? '#e74c3c' : '#2ecc71',
                        padding: '5px 10px'
                      }}
                    >
                      {employee.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VOLUNTEERS SECTION */}
      <div>
        <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>🎒 Volunteers</h3>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#fdf6e3' }}>
              <tr>
                <th style={tableHeaderStyle}>Name</th>
                <th style={tableHeaderStyle}>Contact</th>
                <th style={tableHeaderStyle}>Role</th>
                <th style={tableHeaderStyle}>Start Date</th>
                <th style={tableHeaderStyle}>Emergency Contact</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(volunteer => (
                <tr key={volunteer.id} style={{ backgroundColor: volunteer.is_active ? 'white' : '#f8f9fa' }}>
                  <td style={tableCellStyle}>
                    <strong>{volunteer.name}</strong>
                    {volunteer.notes && <br />}
                    {volunteer.notes && <small style={{ color: '#666' }}>{volunteer.notes}</small>}
                  </td>
                  <td style={tableCellStyle}>
                    {volunteer.email && <div>{volunteer.email}</div>}
                    {volunteer.phone && <div>{volunteer.phone}</div>}
                  </td>
                  <td style={tableCellStyle}>{volunteer.role}</td>
                  <td style={tableCellStyle}>
                    {volunteer.start_date ? new Date(volunteer.start_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={tableCellStyle}>{volunteer.emergency_contact || 'N/A'}</td>
                  <td style={tableCellStyle}>
                    <span style={{
                      color: volunteer.is_active ? '#2ecc71' : '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      {volunteer.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <button
                      onClick={() => editStaff(volunteer)}
                      style={{ ...buttonStyle(false), backgroundColor: '#3498db', marginRight: '5px', padding: '5px 10px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(volunteer.id, volunteer.is_active)}
                      style={{
                        ...buttonStyle(false),
                        backgroundColor: volunteer.is_active ? '#e74c3c' : '#2ecc71',
                        padding: '5px 10px'
                      }}
                    >
                      {volunteer.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT STAFF MODAL */}
      {showForm && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                required
              />

              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, role: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="volunteer">Volunteer</option>
                <option value="employee">Employee</option>
              </select>

              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />

              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={inputStyle}
              />

              {formData.type === 'employee' && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Hourly Rate ($)"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  style={inputStyle}
                />
              )}

              <input
                type="date"
                placeholder="Start Date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                style={inputStyle}
              />

              {formData.type === 'volunteer' && (
                <input
                  type="text"
                  placeholder="Emergency Contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  style={inputStyle}
                />
              )}

              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={buttonStyle(true)}>
                  {editingStaff ? 'Update' : 'Add'} Staff Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStaff(null);
                    setFormData({
                      name: '', email: '', phone: '', role: 'volunteer', type: 'volunteer',
                      hourly_rate: '', start_date: new Date().toISOString().split('T')[0],
                      emergency_contact: '', notes: '', is_active: true
                    });
                  }}
                  style={buttonStyle(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// CASH MANAGEMENT VIEW
function CashView({ cashMovements, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income', // income or expense
    amount: '',
    description: '',
    category: 'other',
    payment_method: 'cash'
  });

  const [dateFilter, setDateFilter] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/cash-movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'session-id': localStorage.getItem('sessionId') },
      body: JSON.stringify(formData)
    });

    setFormData({
      type: 'income',
      amount: '',
      description: '',
      category: 'other',
      payment_method: 'cash'
    });
    setShowForm(false);
    onUpdate();
  };

  // Filter movements by date
  const filteredMovements = cashMovements.filter(movement => {
    const movementDate = new Date(movement.created_at).toISOString().split('T')[0];
    return movementDate >= dateFilter.start && movementDate <= dateFilter.end;
  });

  // Calculate totals
  const totalIncome = filteredMovements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);

  const totalExpenses = filteredMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);

  const netCash = totalIncome - totalExpenses;

  // Group by category
  const incomeByCategory = {};
  const expensesByCategory = {};

  filteredMovements.forEach(movement => {
    const category = movement.category || 'other';
    if (movement.type === 'income') {
      incomeByCategory[category] = (incomeByCategory[category] || 0) + parseFloat(movement.amount);
    } else {
      expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(movement.amount);
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Cash Management</h1>
        <button onClick={() => setShowForm(true)} style={buttonStyle(true)}>
          Add Movement
        </button>
      </div>

      {/* DATE FILTER */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3>Filter by Date</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>From:</label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              style={{ ...inputStyle, margin: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>To:</label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              style={{ ...inputStyle, margin: 0 }}
            />
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <StatCard title="Total Income" value={`$${totalIncome.toFixed(2)}`} color="#2ecc71" />
        <StatCard title="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} color="#e74c3c" />
        <StatCard title="Net Cash Flow" value={`$${netCash.toFixed(2)}`} color={netCash >= 0 ? '#2ecc71' : '#e74c3c'} />
        <StatCard title="Movements" value={filteredMovements.length} color="#3498db" />
      </div>

      {/* INCOME AND EXPENSES BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* INCOME BREAKDOWN */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2ecc71', marginBottom: '15px' }}>💰 Income Breakdown</h3>
          {Object.entries(incomeByCategory).map(([category, amount]) => (
            <div key={category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ textTransform: 'capitalize' }}>{category}</span>
              <span style={{ fontWeight: 'bold', color: '#2ecc71' }}>${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* EXPENSES BREAKDOWN */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>💸 Expenses Breakdown</h3>
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <div key={category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ textTransform: 'capitalize' }}>{category}</span>
              <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MOVEMENTS TABLE */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Type</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Category</th>
              <th style={tableHeaderStyle}>Amount</th>
              <th style={tableHeaderStyle}>Payment Method</th>
              <th style={tableHeaderStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map(movement => (
                <tr key={movement.id}>
                  <td style={tableCellStyle}>
                    {new Date(movement.created_at).toLocaleDateString()}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      color: movement.type === 'income' ? '#2ecc71' : '#e74c3c',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {movement.type === 'income' ? '📈 IN' : '📉 OUT'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{movement.description}</td>
                  <td style={tableCellStyle}>
                    <span style={{ textTransform: 'capitalize' }}>{movement.category || 'other'}</span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      color: movement.type === 'income' ? '#2ecc71' : '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      ${parseFloat(movement.amount).toFixed(2)}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ textTransform: 'capitalize' }}>{movement.payment_method}</span>
                  </td>
                  <td style={tableCellStyle}>
                    {new Date(movement.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ADD MOVEMENT MODAL */}
      {showForm && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>Add Cash Movement</h2>
            <form onSubmit={handleSubmit}>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="income">💰 Income</option>
                <option value="expense">💸 Expense</option>
              </select>

              <input
                type="number"
                step="0.01"
                placeholder="Amount ($)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={inputStyle}
                required
              />

              <input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={inputStyle}
                required
              />

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={inputStyle}
              >
                {formData.type === 'income' ? (
                  <>
                    <option value="accommodation">Accommodation</option>
                    <option value="pos_sales">POS Sales</option>
                    <option value="tours">Tours</option>
                    <option value="other">Other Income</option>
                  </>
                ) : (
                  <>
                    <option value="supplies">Supplies</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="utilities">Utilities</option>
                    <option value="staff">Staff</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other Expenses</option>
                  </>
                )}
              </select>

              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                style={inputStyle}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={buttonStyle(true)}>
                  Add Movement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      type: 'income',
                      amount: '',
                      description: '',
                      category: 'other',
                      payment_method: 'cash'
                    });
                  }}
                  style={buttonStyle(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// HELPER COMPONENTS
function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color, marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
        {title}
      </div>
    </div>
  );
}

// STYLES
const buttonStyle = (active) => ({
  display: 'block',
  width: '100%',
  padding: '10px',
  margin: '5px 0',
  backgroundColor: active ? '#3498db' : '#95a5a6',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px'
});

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '10px',
  margin: '10px 0',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const modalOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalContent = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  maxWidth: '500px',
  width: '90%',
  maxHeight: '80vh',
  overflowY: 'auto'
};

const tableHeaderStyle = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #dee2e6',
  fontWeight: 'bold'
};

const tableCellStyle = {
  padding: '12px',
  borderBottom: '1px solid #dee2e6'
};

// REPORTS & ANALYTICS VIEW - PANTALLA COMPLETA DE REPORTES
function ReportsView({ apiCall }) {
  const [reportData, setReportData] = useState({});
  const [dateRange, setDateRange] = useState('30'); // days
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Initialize date range (30 days back)
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Load report data when filters change
  useEffect(() => {
    if (startDate && endDate) {
      loadReportData();
    }
  }, [startDate, endDate, reportType]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/reports?start=${startDate}&end=${endDate}&type=${reportType}`);
      if (response) {
        setReportData(response);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    }
    setLoading(false);
  };

  const handleDateRangeChange = (days) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - parseInt(days));

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setDateRange(days);
  };

  const exportReport = (format) => {
    // Simple export functionality
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `almanik-report-${startDate}-to-${endDate}.${format}`;
    link.click();
  };

  return (
    <div style={{ maxWidth: '1200px', padding: '0 15px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>📈 Reports & Analytics</h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>Análisis completo del rendimiento del hostal</p>
      </div>

      {/* FILTROS DE FECHA Y CONFIGURACIÓN */}
      <div style={{
        backgroundColor: 'white',
        padding: window.innerWidth <= 768 ? '20px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '25px'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🔧 Configuración de Reportes</h3>

        {/* Quick Date Filters */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', color: '#34495e', marginBottom: '10px', display: 'block' }}>
            Período de Análisis:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth <= 768
              ? 'repeat(auto-fit, minmax(80px, 1fr))'
              : 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '10px',
            marginBottom: '15px'
          }}>
            {[
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: '90', label: '3 meses' },
              { value: '180', label: '6 meses' },
              { value: '365', label: '1 año' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => handleDateRangeChange(period.value)}
                style={{
                  padding: window.innerWidth <= 768 ? '6px 8px' : '8px 16px',
                  border: '2px solid #3498db',
                  borderRadius: '5px',
                  backgroundColor: dateRange === period.value ? '#3498db' : 'white',
                  color: dateRange === period.value ? 'white' : '#3498db',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                }}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ fontWeight: 'bold', color: '#34495e', marginBottom: '5px', display: 'block' }}>
              Fecha Inicio:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', color: '#34495e', marginBottom: '5px', display: 'block' }}>
              Fecha Fin:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
        </div>

        {/* Report Type */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', color: '#34495e', marginBottom: '10px', display: 'block' }}>
            Tipo de Reporte:
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ ...inputStyle, width: '200px' }}
          >
            <option value="overview">📊 Resumen General</option>
            <option value="revenue">💰 Análisis Financiero</option>
            <option value="occupancy">🛏️ Análisis de Ocupación</option>
            <option value="guests">👥 Análisis de Huéspedes</option>
            <option value="pos">🛒 Análisis de Ventas POS</option>
          </select>
        </div>

        {/* Export Options */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={loadReportData}
            disabled={loading}
            style={{
              ...buttonStyle(true),
              backgroundColor: '#27ae60',
              borderColor: '#27ae60'
            }}
          >
            {loading ? '🔄 Cargando...' : '🔍 Generar Reporte'}
          </button>
          <button
            onClick={() => exportReport('json')}
            style={{
              ...buttonStyle(false),
              backgroundColor: '#9b59b6',
              borderColor: '#9b59b6',
              color: 'white'
            }}
          >
            📥 Exportar JSON
          </button>
        </div>
      </div>

      {/* CONTENIDO DEL REPORTE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
          <p style={{ color: '#7f8c8d' }}>Generando reporte...</p>
        </div>
      ) : reportData && Object.keys(reportData).length > 0 ? (
        <div>
          {/* OVERVIEW GENERAL */}
          {reportType === 'overview' && (
            <OverviewReport data={reportData} startDate={startDate} endDate={endDate} />
          )}

          {/* ANÁLISIS FINANCIERO */}
          {reportType === 'revenue' && (
            <RevenueReport data={reportData} startDate={startDate} endDate={endDate} />
          )}

          {/* ANÁLISIS DE OCUPACIÓN */}
          {reportType === 'occupancy' && (
            <OccupancyReport data={reportData} startDate={startDate} endDate={endDate} />
          )}

          {/* ANÁLISIS DE HUÉSPEDES */}
          {reportType === 'guests' && (
            <GuestsReport data={reportData} startDate={startDate} endDate={endDate} />
          )}

          {/* ANÁLISIS POS */}
          {reportType === 'pos' && (
            <POSReport data={reportData} startDate={startDate} endDate={endDate} />
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '50px',
          borderRadius: '10px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ color: '#7f8c8d', marginBottom: '10px' }}>No hay datos disponibles</h3>
          <p style={{ color: '#bdc3c7' }}>
            Selecciona un rango de fechas y haz clic en "Generar Reporte" para ver los análisis.
          </p>
        </div>
      )}
    </div>
  );
}

// OVERVIEW REPORT COMPONENT
function OverviewReport({ data, startDate, endDate }) {
  const kpis = data.kpis || {};
  const trends = data.trends || {};

  return (
    <div>
      {/* KPIs PRINCIPALES */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '25px'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📊 KPIs Principales ({startDate} al {endDate})</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '2px solid #27ae60' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27ae60' }}>
              ${(kpis.totalRevenue || 0).toLocaleString()}
            </div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>Ingresos Totales</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
              Promedio diario: ${((kpis.totalRevenue || 0) / 30).toFixed(0)}
            </div>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#e8f4fd', borderRadius: '8px', border: '2px solid #3498db' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
              {(kpis.avgOccupancy || 0).toFixed(1)}%
            </div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>Ocupación Promedio</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
              {kpis.totalNights || 0} noches vendidas
            </div>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#fef3e2', borderRadius: '8px', border: '2px solid #f39c12' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f39c12' }}>
              {kpis.totalGuests || 0}
            </div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>Huéspedes Únicos</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
              {kpis.repeatGuests || 0} huéspedes recurrentes
            </div>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#fdf2f8', borderRadius: '8px', border: '2px solid #e91e63' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e91e63' }}>
              ${(kpis.avgDailyRate || 0).toFixed(0)}
            </div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>Tarifa Promedio</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
              ADR (Average Daily Rate)
            </div>
          </div>
        </div>
      </div>

      {/* TENDENCIAS Y GRÁFICOS */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '25px'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📈 Tendencias del Período</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Simulated Charts - En una implementación real usarías Chart.js */}
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>💰 Ingresos por Semana</h4>
            <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '10px' }}>
              {(trends.weeklyRevenue || [1000, 1200, 1100, 1300]).map((value, idx) => (
                <div key={idx} style={{
                  width: '50px',
                  height: `${(value / 1500) * 180}px`,
                  backgroundColor: '#3498db',
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  alignItems: 'end',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  paddingBottom: '5px'
                }}>
                  ${value}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>🛏️ Ocupación Diaria</h4>
            <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '5px' }}>
              {(trends.dailyOccupancy || [75, 80, 65, 90, 85, 70, 95]).map((value, idx) => (
                <div key={idx} style={{
                  width: '30px',
                  height: `${(value / 100) * 180}px`,
                  backgroundColor: value > 80 ? '#27ae60' : value > 60 ? '#f39c12' : '#e74c3c',
                  borderRadius: '2px 2px 0 0'
                }}>
                </div>
              ))}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '10px' }}>
              Verde: >80% | Amarillo: 60-80% | Rojo: <60%
            </div>
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🏆 Top Huéspedes (por noches)</h3>
          {(data.topGuests || []).length > 0 ? (
            <div>
              {data.topGuests.slice(0, 5).map((guest, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderBottom: '1px solid #ecf0f1',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{guest.name}</span>
                  <span style={{ color: '#27ae60' }}>{guest.nights} noches</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#7f8c8d', textAlign: 'center', fontStyle: 'italic' }}>
              No hay datos de huéspedes disponibles
            </p>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🛒 Productos Más Vendidos</h3>
          {(data.topProducts || []).length > 0 ? (
            <div>
              {data.topProducts.slice(0, 5).map((product, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderBottom: '1px solid #ecf0f1',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{product.name}</span>
                  <span style={{ color: '#e67e22' }}>{product.quantity} vendidos</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#7f8c8d', textAlign: 'center', fontStyle: 'italic' }}>
              No hay datos de productos disponibles
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// REVENUE REPORT COMPONENT
function RevenueReport({ data, startDate, endDate }) {
  const revenue = data.revenue || {};

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>💰 Análisis Financiero Detallado</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            ${(revenue.accommodation || 0).toLocaleString()}
          </div>
          <div style={{ color: '#2c3e50' }}>Ingresos Alojamiento</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fef3e2', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
            ${(revenue.pos || 0).toLocaleString()}
          </div>
          <div style={{ color: '#2c3e50' }}>Ventas POS</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            ${(revenue.total || 0).toLocaleString()}
          </div>
          <div style={{ color: '#2c3e50' }}>Total Ingresos</div>
        </div>
      </div>

      <p style={{ color: '#7f8c8d', textAlign: 'center', fontStyle: 'italic' }}>
        Análisis detallado del período {startDate} al {endDate}
      </p>
    </div>
  );
}

// OCCUPANCY REPORT COMPONENT
function OccupancyReport({ data, startDate, endDate }) {
  const occupancy = data.occupancy || {};

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🛏️ Análisis de Ocupación</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            {(occupancy.average || 0).toFixed(1)}%
          </div>
          <div style={{ color: '#2c3e50' }}>Ocupación Promedio</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            {occupancy.peak || 0}%
          </div>
          <div style={{ color: '#2c3e50' }}>Ocupación Máxima</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fdf2f8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e91e63' }}>
            {occupancy.totalNights || 0}
          </div>
          <div style={{ color: '#2c3e50' }}>Noches Vendidas</div>
        </div>
      </div>
    </div>
  );
}

// GUESTS REPORT COMPONENT
function GuestsReport({ data, startDate, endDate }) {
  const guests = data.guests || {};

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>👥 Análisis de Huéspedes</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ padding: '15px', backgroundColor: '#fef3e2', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
            {guests.total || 0}
          </div>
          <div style={{ color: '#2c3e50' }}>Total Huéspedes</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            {guests.repeat || 0}
          </div>
          <div style={{ color: '#2c3e50' }}>Huéspedes Recurrentes</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            {(guests.avgStay || 0).toFixed(1)}
          </div>
          <div style={{ color: '#2c3e50' }}>Estancia Promedio (días)</div>
        </div>
      </div>
    </div>
  );
}

// POS REPORT COMPONENT
function POSReport({ data, startDate, endDate }) {
  const pos = data.pos || {};

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🛒 Análisis de Ventas POS</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ padding: '15px', backgroundColor: '#fef3e2', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
            ${(pos.totalSales || 0).toLocaleString()}
          </div>
          <div style={{ color: '#2c3e50' }}>Ventas Totales</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            {pos.totalTransactions || 0}
          </div>
          <div style={{ color: '#2c3e50' }}>Transacciones</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            ${(pos.averageTicket || 0).toFixed(2)}
          </div>
          <div style={{ color: '#2c3e50' }}>Ticket Promedio</div>
        </div>
      </div>
    </div>
  );
}

// TOURS VIEW
function ToursView({ tours, onUpdate, apiCall }) {
  const handleTourClick = async (tour) => {
    try {
      await apiCall(`/tours/${tour.id}/click`, {
        method: 'POST',
        body: JSON.stringify({ guest_id: null })
      });
      window.open(tour.booking_url, '_blank');
      onUpdate();
    } catch (err) {
      console.error('Error tracking tour click:', err);
      window.open(tour.booking_url, '_blank');
    }
  };

  return (
    <div style={{ padding: '0 15px' }}>
      <h1>🚶 Catálogo de Tours</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>
        Descubre los mejores tours y experiencias en Medellín
      </p>

      {tours.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚶</div>
          <h3 style={{ color: '#7f8c8d' }}>No hay tours disponibles</h3>
          <p style={{ color: '#bdc3c7' }}>Los tours se cargarán automáticamente desde la base de datos</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768
            ? '1fr'
            : 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '25px'
        }}>
          {tours.map(tour => (
            <div key={tour.id} style={{
              backgroundColor: 'white',
              borderRadius: '15px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer'
            }}
            onClick={() => handleTourClick(tour)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}>
              {/* Tour Header */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px',
                position: 'relative'
              }}>
                <h3 style={{
                  margin: '0 0 10px 0',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  {tour.name}
                </h3>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '5px 15px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {tour.duration}
                  </span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    ${tour.price?.toLocaleString()} COP
                  </span>
                </div>
              </div>

              {/* Tour Content */}
              <div style={{ padding: '20px' }}>
                <p style={{
                  color: '#34495e',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  fontSize: '15px'
                }}>
                  {tour.description}
                </p>

                {/* Tour Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#e74c3c',
                      marginBottom: '5px'
                    }}>
                      {tour.clicks || 0}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#7f8c8d',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      Clicks
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#27ae60',
                      marginBottom: '5px'
                    }}>
                      {tour.commission_rate}%
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#7f8c8d',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      Comisión
                    </div>
                  </div>
                </div>

                {/* Provider */}
                <div style={{
                  backgroundColor: '#ecf0f1',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '15px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#34495e',
                    fontWeight: '600'
                  }}>
                    Por: {tour.provider}
                  </span>
                </div>

                {/* Action Button */}
                <div style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2980b9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3498db';
                }}>
                  🎫 Reservar Ahora
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;