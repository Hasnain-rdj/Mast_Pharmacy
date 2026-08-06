import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartBar, FaCheckCircle, FaUser } from 'react-icons/fa';
import './Auth.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import API from '../api';
import SalesEntryInline from './SalesEntryInline';
import { getStoredUser } from '../utils';

const Dashboard = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  // All hooks must be at the top level
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSalesEntry, setShowSalesEntry] = useState(false);
  // Get today's date in YYYY-MM-DD format respecting browser's timezone
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Always use current date when the component is first loaded
  // Using local timezone date to ensure proper date display
  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  // Worker dashboard hooks (always defined, not conditional)
  const [searchSold, setSearchSold] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ medicineName: '', quantity: '', rate: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'worker') return;
    setLoading(true);
    // Add timezone offset to ensure consistent date handling
    // We explicitly use Asia/Karachi timezone for consistency with the business location
    API.get(`/api/sales/by-date?clinic=${user.clinic}&date=${selectedDate}&timezone=Asia/Karachi`)
      .then(res => {
        // Trust the backend filtering - no need to filter again in frontend
        const filteredSales = res.data;
        
        setSales(filteredSales.map(s => ({
          _id: s._id,
          medicine: s.medicineName,
          quantity: s.quantity,
          rate: s.rate,
          total: s.total,
          dateTime: new Date(s.soldAt).toLocaleString('en-GB', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.clinic, showSalesEntry, selectedDate]);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (user.role === 'admin') {
    return (
      <div className="container-fluid" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f3f6fa 60%, #e3eaf2 100%)', padding: 0, margin: 0, display: 'flex', justifyContent: 'center' }}>
        <div className="container py-4" style={{ maxWidth: 1440, marginTop: '100px', width: '100%' }}>
          <div className="row justify-content-center mb-4">
            <div className="col-auto">
              <img
                src={user.profilePic || '/logo192.png'}
                alt="Profile"
                style={{ width: 90, height: 90, borderRadius: '50%', border: '4px solid #1976d2', objectFit: 'cover', background: '#fff' }}
              />
            </div>
          </div>
          <h1 className="text-center" style={{ color: '#1976d2', fontWeight: 900, fontSize: 38, marginBottom: 0, letterSpacing: 1 }}>
            {user.name}
          </h1>
          <div className="text-center" style={{ color: '#1976d2', fontWeight: 600, fontSize: 20, marginBottom: 36 }}>
            Welcome to the Admin Dashboard
          </div>
          <div className="row justify-content-center mt-4 g-4">
            <div className="col-12 col-md-6 col-lg-3">
              <div
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
                  padding: '2.2rem 2.5rem',
                  minWidth: 220,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#1976d2',
                  border: '2px solid #e3eaf2',
                }}
                onClick={() => navigate('/admin/medicines')}
              >
                <FaCheckCircle style={{ fontSize: 38, marginBottom: 12, color: '#1976d2' }} />
                <div>Medicine Management</div>
                <div style={{ fontWeight: 400, fontSize: 16, color: '#555', marginTop: 8 }}>
                  Add/update medicine quantity and price for any clinic.
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
                  padding: '2.2rem 2.5rem',
                  minWidth: 220,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#1976d2',
                  border: '2px solid #e3eaf2',
                }}
                onClick={() => navigate('/admin/sales')}
              >
                <FaCheckCircle style={{ fontSize: 38, marginBottom: 12, color: '#1976d2' }} />
                <div>Manage Sales</div>
                <div style={{ fontWeight: 400, fontSize: 16, color: '#555', marginTop: 8 }}>
                  Sell medicines for any clinic and manage sales records.
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
                  padding: '2.2rem 2.5rem',
                  minWidth: 220,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#1976d2',
                  border: '2px solid #e3eaf2',
                }}
                onClick={() => navigate('/admin/analytics')}
              >
                <FaChartBar style={{ fontSize: 38, marginBottom: 12, color: '#1976d2' }} />
                <div>Clinics Analytics</div>
                <div style={{ fontWeight: 400, fontSize: 16, color: '#555', marginTop: 8 }}>
                  See analytics of all clinics and generate PDF reports.
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
                  padding: '2.2rem 2.5rem',
                  minWidth: 220,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#1976d2',
                  border: '2px solid #e3eaf2',
                }}
                onClick={() => navigate('/profile')}
              >
                <FaUser style={{ fontSize: 38, marginBottom: 12, color: '#1976d2' }} />
                <div>Profile Management</div>
                <div style={{ fontWeight: 400, fontSize: 16, color: '#555', marginTop: 8 }}>
                  View and update your personal account profile & settings.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Worker Dashboard UI
  // Show sales entry, today's sales, and profile management
  // Calculate total sales amount for the selected date
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);

  // Helper: fuzzy/character-sequence match (e.g., 'ot' matches 'Oxytocin')
  function fuzzyMatch(str, pattern) {
    if (!pattern) return true;
    str = str.toLowerCase();
    pattern = pattern.toLowerCase();
    let j = 0;
    for (let i = 0; i < str.length && j < pattern.length; i++) {
      if (str[i] === pattern[j]) j++;
    }
    return j === pattern.length;
  }

  // Filtered sales by search (case-insensitive, partial, and fuzzy/character-sequence)
  const filteredSales = sales.filter(sale =>
    sale.medicine && searchSold
      ? (
          sale.medicine.toLowerCase().includes(searchSold.trim().toLowerCase()) ||
          fuzzyMatch(sale.medicine, searchSold.trim())
        )
      : true
  );

  // Start editing a sale
  const handleEdit = (sale, idx) => {
    setEditId(sale._id || idx); // fallback to idx if no _id
    setEditForm({ medicineName: sale.medicine, quantity: sale.quantity, rate: sale.rate });
    setActionError('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditId(null);
    setEditForm({ medicineName: '', quantity: '', rate: '' });
    setActionError('');
  };

  // Save edited sale
  const handleSaveEdit = async (sale) => {
    setActionLoading(true);
    setActionError('');
    try {
      // Find medicineId for new medicineName (if changed)
      let medicineId = sale.medicineId;
      let medicineName = editForm.medicineName;      if (medicineName !== sale.medicine) {
        // Fetch medicine by name and clinic
        const res = await API.get(`/api/medicines?clinic=${user.clinic}&search=${encodeURIComponent(medicineName)}`);
        const found = res.data.find(m => m.name.toLowerCase() === medicineName.toLowerCase());
        if (!found) throw new Error('Medicine not found');
        medicineId = found._id;
      }      // Use current time - backend will handle timezone
      const now = new Date();
      
      await API.put(`/api/sales/${sale._id}`, {
        medicineId,
        medicineName,
        quantity: Number(editForm.quantity),
        rate: Number(editForm.rate),
        // Use current date/time
        soldAt: now.toISOString()
      });
      // Refresh sales
      API.get(`/api/sales/by-date?clinic=${user.clinic}&date=${selectedDate}`)
        .then(res => {
          setSales(res.data.map(s => ({
            _id: s._id,
            medicine: s.medicineName,
            quantity: s.quantity,
            rate: s.rate,
            total: s.total,
            dateTime: new Date(s.soldAt).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          })));
        });
      setEditId(null);
      setEditForm({ medicineName: '', quantity: '', rate: '' });
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update sale');
    }
    setActionLoading(false);
  };

  // Delete a sale
  const handleDelete = async (sale) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;
    setActionLoading(true);
    setActionError('');
    try {      await API.delete(`/api/sales/${sale._id}`);
      // Refresh sales
      API.get(`/api/sales/by-date?clinic=${user.clinic}&date=${selectedDate}`)
        .then(res => {
          setSales(res.data.map(s => ({
            _id: s._id,
            medicine: s.medicineName,
            quantity: s.quantity,
            rate: s.rate,
            total: s.total,
            dateTime: new Date(s.soldAt).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          })));
        });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete sale');
    }
    setActionLoading(false);
  };  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg, #f3f6fa 60%, #e3eaf2 100%)', padding: 0, margin: 0, display: 'flex', justifyContent: 'center' }}>
      <div className="container py-4" style={{ maxWidth: 1440, marginTop: '100px', width: '100%' }}>
        <div className="row align-items-center mb-4">
          <div className="col-auto">
            <img
              src={user.profilePic || '/logo192.png'}
              alt="Profile"
              style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #1976d2', objectFit: 'cover', background: '#fff' }}
            />
          </div>
          <div className="col">
            <h2 style={{ color: '#1976d2', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 28 }}>
              Welcome, {user.name}!
            </h2>
            <div style={{ color: '#555', fontWeight: 600, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              Clinic: {user.clinic || 'Main Clinic'}
            </div>
          </div>
        </div>        <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <button onClick={() => setShowSalesEntry(v => !v)} className="main-action-btn">
            {showSalesEntry ? 'Cancel' : 'Sell Medicine'}
          </button>
          <button onClick={() => navigate('/inventory')} className="main-action-btn" style={{ background: '#1976d2' }}>
            View Medicine Inventory
          </button>
          {/* Show total sales amount for the selected date */}
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 18 }}>
            Total Sales: {totalSalesAmount}
          </span>
        </div>
        {/* Search/filter for sold medicines */}
        <div style={{ marginBottom: 18, maxWidth: 400 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search sold medicines by name..."
            value={searchSold}
            onChange={e => setSearchSold(e.target.value)}
            style={{ fontSize: 17 }}
          />
        </div>
        {actionError && <div className="error" style={{ marginBottom: 10 }}>{actionError}</div>}
        {showSalesEntry && (
          <div style={{ margin: '0 0 32px 0' }}>
            <SalesEntryInline onEntryComplete={() => setShowSalesEntry(false)} />
          </div>
        )}
        <div className="row align-items-center mb-3">
          <div className="col">
            <h3 style={{ color: '#1976d2', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 22 }}>
              Sales for {new Date(selectedDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
            </h3>
          </div>
          <div className="col-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="form-control custom-date-input"
              style={{ minWidth: 160, borderRadius: 8, border: '1.5px solid #1976d2', background: '#f3f6fa', color: '#1976d2', fontWeight: 600, fontSize: 16, padding: '8px 14px', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.07)' }}
            />
          </div>
        </div>
        <div style={{ width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', overflowX: 'auto', marginLeft: 0, marginRight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 16, fontSize: 17 }}>
            <thead>
              <tr style={{ background: '#e3eaf2' }}>
                <th style={{ padding: 18, textAlign: 'left' }}>Medicine</th>
                <th style={{ padding: 18, textAlign: 'left' }}>Quantity</th>
                <th style={{ padding: 18, textAlign: 'left' }}>Rate</th>
                <th style={{ padding: 18, textAlign: 'left' }}>Total</th>
                <th style={{ padding: 18, textAlign: 'left' }}>Date & Time</th>
                <th style={{ padding: 18, textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: 24 }}>Loading...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 24, color: '#888', fontWeight: 500 }}>No sales yet for this date.</td></tr>
              ) : (
                filteredSales.map((sale, idx) => (
                  editId === (sale._id || idx) ? (
                    <tr key={sale._id || idx} style={{ background: '#f3f6fa' }}>
                      <td style={{ padding: 12 }}>
                        {/* Medicine name is not editable for workers */}
                        <span>{sale.medicine}</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <input
                          type="number"
                          className="form-control"
                          value={editForm.quantity}
                          min={1}
                          onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                          style={{ minWidth: 80 }}
                        />
                      </td>
                      <td style={{ padding: 12 }}>
                        <input
                          type="number"
                          className="form-control"
                          value={editForm.rate}
                          min={0}
                          onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))}
                          style={{ minWidth: 80 }}
                        />
                      </td>
                      <td style={{ padding: 12 }}>{Number(editForm.quantity) * Number(editForm.rate) || 0}</td>
                      <td style={{ padding: 12 }}>{sale.dateTime}</td>
                      <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                        <button className="main-action-btn" style={{ background: '#43a047', color: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={() => handleSaveEdit(sale)}>Save</button>
                        <button className="main-action-btn" style={{ background: '#e0e0e0', color: '#1976d2', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={handleCancelEdit}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={sale._id || idx}>
                      <td style={{ padding: 16 }}>{sale.medicine}</td>
                      <td style={{ padding: 16 }}>{sale.quantity}</td>
                      <td style={{ padding: 16 }}>{sale.rate}</td>
                      <td style={{ padding: 16 }}>{sale.total}</td>
                      <td style={{ padding: 16 }}>{sale.dateTime}</td>
                      <td style={{ padding: 16, display: 'flex', gap: 8 }}>
                        <button className="main-action-btn" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={() => handleEdit(sale, idx)}>Edit</button>
                        <button className="main-action-btn" style={{ background: '#d32f2f', color: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={() => handleDelete(sale)}>Delete</button>
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
