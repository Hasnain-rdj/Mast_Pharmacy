import React, { useEffect, useState } from 'react';
import { FaSearch, FaList, FaPills, FaSort, FaSortUp, FaSortDown, FaExchangeAlt } from 'react-icons/fa';
import './Auth.css';
import API from '../api';
import { getStoredUser, formatExpiryDate, isExpiringSoon } from '../utils';
import { useSettings } from './context/SettingsContext';
import LoadingSpinner from './common/LoadingSpinner';

const ClinicInventory = () => {
  const user = getStoredUser();
  const userClinic = user?.clinic;
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettings(); // Properly use the settings context
  
  // Log settings for debugging
  console.log('🏥 ClinicInventory settings received:', settings);
  
  // Define a strict comparison to ensure showPrices is truly a boolean
  const isAdmin = user?.role === 'admin';
  
  // Force showPrices to be treated as boolean
  const globalShowPrices = settings.showPrices === true; 
  console.log('🏥 Global showPrices value:', globalShowPrices);
  
  // Check if this clinic is in the hidden list
  const hiddenClinics = Array.isArray(settings.clinicsHidePrices) ? settings.clinicsHidePrices : [];
  const clinicPricesHidden = hiddenClinics.includes(userClinic);
  console.log('🏥 Clinic prices hidden for', userClinic, ':', clinicPricesHidden);
  console.log('🏥 Hidden clinics list:', hiddenClinics);
  
  // Calculate final showPrices value with proper boolean logic
  const showPrices = isAdmin || (globalShowPrices && !clinicPricesHidden);
  console.log('🏥 Final showPrices value:', showPrices);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferToClinic, setTransferToClinic] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [transferSelectedMed, setTransferSelectedMed] = useState(null);
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [allClinics, setAllClinics] = useState([]);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [transferHistoryError, setTransferHistoryError] = useState('');
  const [editTransferIdx, setEditTransferIdx] = useState(null);
  const [editTransferQty, setEditTransferQty] = useState('');
  const [editTransferLoading, setEditTransferLoading] = useState(false);
  const [editTransferError, setEditTransferError] = useState('');
  const [deleteTransferLoadingIdx, setDeleteTransferLoadingIdx] = useState(null);

  // Fetch medicines on component mount
  useEffect(() => {
    if (userClinic) {
      setLoading(true);
      API.get(`/api/medicines?clinic=${userClinic}`)
        .then(res => {
          setMedicines(res.data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load medicines');
          setMedicines([]);
          setLoading(false);
        });
    }
  }, [userClinic]);

  // Fetch all clinics for transfer dropdown
  useEffect(() => {
    API.get('/api/medicines/clinics').then(res => {
      // Remove self clinic and 'ALL' from the list, and also remove any null/empty
      setAllClinics(res.data.filter(c => {
        if (!c || c === 'ALL') return false;
        // If backend returns clinics with worker names in brackets, extract the clinic name
        const clinicName = c.split(' (')[0];
        return clinicName !== userClinic;
      }));
    });
  }, [userClinic]);

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

  // Sort and filter medicines
  const filteredMedicines = medicines
    .filter(med => 
      !search.trim() || 
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      fuzzyMatch(med.name, search)
    )
    .sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === 'quantity') {
        return sortDirection === 'asc'
          ? a.quantity - b.quantity
          : b.quantity - a.quantity;
      } else if (sortField === 'expiryDate') {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return sortDirection === 'asc'
          ? new Date(a.expiryDate) - new Date(b.expiryDate)
          : new Date(b.expiryDate) - new Date(a.expiryDate);
      }
      return 0;
    });

  // Filtered medicines for transfer search (hide already selected)
  const transferFilteredMeds = medicines.filter(med =>
    (!transferSearch.trim() ||
      med.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
      fuzzyMatch(med.name, transferSearch)) &&
    (!transferSelectedMed || med._id !== transferSelectedMed._id)
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // Handle transfer submit
  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');
    if (!transferToClinic || !transferSelectedMed || !transferQuantity) {
      setTransferError('Please fill all fields.');
      return;
    }
    if (Number(transferQuantity) <= 0 || Number(transferQuantity) > transferSelectedMed.quantity) {
      setTransferError('Invalid quantity.');
      return;
    }
    setTransferLoading(true);
    try {
      // Always use only the clinic name (before any ' (') for transfer
      const toClinicName = transferToClinic.split(' (')[0];
      await API.post('/api/medicines/transfer', {
        fromClinic: userClinic,
        toClinic: toClinicName,
        medicineId: transferSelectedMed._id,
        medicineName: transferSelectedMed.name,
        quantity: Number(transferQuantity)
      });
      setTransferSuccess('Transfer successful!');
      setShowTransfer(false);
      setTransferToClinic('');
      setTransferSelectedMed(null);
      setTransferQuantity('');
      setTransferSearch('');
      setLoading(true);
      const res = await API.get(`/api/medicines?clinic=${userClinic}`);
      setMedicines(res.data);
      setLoading(false);
    } catch (err) {
      setTransferError(err.response?.data?.message || 'Transfer failed');
    }
    setTransferLoading(false);
  };
  const fetchTransferHistory = async () => {
    setTransferHistoryLoading(true);
    setTransferHistoryError('');
    try {
      const res = await API.get(`/api/medicines/transfer/history?clinic=${userClinic}`);
      setTransferHistory(res.data);
    } catch (err) {
      setTransferHistoryError('Failed to load transfer history');
      setTransferHistory([]);
    }
    setTransferHistoryLoading(false);
  };
  
  // Edit transfer record handler
  const handleEditTransferSave = async (idx, rec) => {
    setEditTransferLoading(true);
    setEditTransferError('');
    if (!editTransferQty || Number(editTransferQty) <= 0) {
      setEditTransferError('Invalid quantity.');
      setEditTransferLoading(false);
      return;
    }
    try {
      await API.put(`/api/medicines/transfer/history/${rec._id}`, {
        quantity: Number(editTransferQty)
      });
      // Update local transferHistory
      const updated = [...transferHistory];
      updated[idx] = { ...rec, quantity: Number(editTransferQty) };
      setTransferHistory(updated);
      setEditTransferIdx(null);
      setEditTransferQty('');
      setEditTransferError('');
      // Optionally, refresh medicines
      setLoading(true);
      const res = await API.get(`/api/medicines?clinic=${userClinic}`);
      setMedicines(res.data);
      setLoading(false);
    } catch (err) {
      setEditTransferError(err.response?.data?.message || 'Failed to update record');
    }
    setEditTransferLoading(false);
  };

  // Delete transfer record handler
  const handleDeleteTransfer = async (idx, rec) => {
    if (!window.confirm('Are you sure you want to delete this transfer record? This will revert the stock change.')) return;
    setDeleteTransferLoadingIdx(idx);
    try {
      await API.delete(`/api/medicines/transfer/history/${rec._id}`);
      // Remove from local transferHistory
      setTransferHistory(transferHistory.filter((_, i) => i !== idx));
      // Optionally, refresh medicines
      setLoading(true);
      const res = await API.get(`/api/medicines?clinic=${userClinic}`);
      setMedicines(res.data);
      setLoading(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record');
    }
    setDeleteTransferLoadingIdx(null);
  };

  return (
    <div className="container-fluid" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f3f6fa 60%, #e3eaf2 100%)', padding: 0, margin: 0, display: 'flex', justifyContent: 'center' }}>
      <div className="container py-4" style={{ maxWidth: 1200, marginTop: '100px', width: '100%' }}>
        <h2 style={{ 
          color: '#1976d2', 
          fontWeight: 900, 
          marginBottom: 24, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          fontSize: 32 
        }}>
          <FaPills /> Clinic Medicine Inventory
        </h2>
        {/* Transfer Medicine Button and Inline Form */}
        <div style={{ marginBottom: 18 }}>
          {!showTransfer && (
            <button className="main-action-btn" style={{ background: '#1976d2', fontWeight: 700 }} onClick={() => setShowTransfer(true)}>
              <FaExchangeAlt style={{ marginRight: 8 }} /> Transfer Medicine
            </button>
          )}
          {showTransfer && (
            <form className="auth-form" onSubmit={handleTransfer} style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginBottom: 24, maxWidth: 600, marginTop: 18 }}>
              <h3 style={{ color: '#1976d2', fontWeight: 800, marginBottom: 18, fontSize: 22 }}>Transfer Medicine</h3>
              <div className="input-group">
                <label style={{ minWidth: 70, fontWeight: 600 }}>From</label>
                <input value={userClinic} disabled style={{ background: '#e3eaf2', color: '#1976d2', fontWeight: 700 }} />
              </div>
              <div className="input-group">
                <label style={{ minWidth: 70, fontWeight: 600 }}>To</label>
                <select value={transferToClinic} onChange={e => setTransferToClinic(e.target.value)} required>
                  <option value="">Select Clinic</option>
                  {allClinics.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ position: 'relative' }}>
                <FaSearch style={{ color: '#1976d2' }} />
                <input
                  value={transferSearch}
                  onChange={e => { setTransferSearch(e.target.value); setTransferSelectedMed(null); }}
                  placeholder="Search medicine name..."
                  autoComplete="off"
                  required={!transferSelectedMed}
                  style={{ zIndex: 2 }}
                />
                {transferSearch && transferFilteredMeds.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e3eaf2', borderRadius: 6, zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {transferFilteredMeds.map(med => (
                      <div key={med._id} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }} onClick={() => { setTransferSelectedMed(med); setTransferSearch(med.name); }}>
                        {med.name} <span style={{ color: '#888', fontSize: 13 }}>({med.quantity} available)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {transferSelectedMed && (
                <div style={{ background: '#fff', borderRadius: 8, padding: 12, margin: '10px 0', boxShadow: '0 1px 6px #e3eaf2' }}>
                  <div><b>Name:</b> {transferSelectedMed.name}</div>
                  <div><b>Available:</b> {transferSelectedMed.quantity}</div>
                </div>
              )}
              <div className="input-group">
                <input
                  type="number"
                  min="1"
                  max={transferSelectedMed ? transferSelectedMed.quantity : ''}
                  value={transferQuantity}
                  onChange={e => setTransferQuantity(e.target.value)}
                  placeholder="Quantity to transfer"
                  required
                  disabled={!transferSelectedMed}
                />
              </div>
              {transferError && <div className="error">{transferError}</div>}
              {transferSuccess && <div className="success">{transferSuccess}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="submit" className="main-action-btn" style={{ background: '#1976d2' }} disabled={transferLoading}>{transferLoading ? <LoadingSpinner size="small" /> : 'Transfer'}</button>
                <button type="button" className="main-action-btn" style={{ background: '#e0e0e0', color: '#1976d2' }} onClick={() => { setShowTransfer(false); setTransferToClinic(''); setTransferSelectedMed(null); setTransferQuantity(''); setTransferSearch(''); setTransferError(''); setTransferSuccess(''); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
        {/* Transfer History Button and Table */}
        <div style={{ marginBottom: 18 }}>
          <button
            className="main-action-btn"
            style={{ background: '#1976d2', fontWeight: 700, marginBottom: 10 }}
            onClick={async () => {
              if (!showTransferHistory) await fetchTransferHistory();
              setShowTransferHistory(v => !v);
            }}
          >
            {showTransferHistory ? 'Hide Transfer History' : 'Show Transfer History'}
          </button>
          {showTransferHistory && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 18, marginTop: 8, marginBottom: 18 }}>
              <h4 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 12 }}>Transfer History</h4>
              {transferHistoryLoading ? (
                <LoadingSpinner size="small" />
              ) : transferHistoryError ? (
                <div className="error">{transferHistoryError}</div>
              ) : transferHistory.length === 0 ? (
                <div style={{ color: '#888', fontWeight: 500 }}>No transfer records found.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>                    <thead>
                      <tr style={{ background: '#e3eaf2' }}>
                        <th style={{ padding: 10 }}>Date</th>
                        <th style={{ padding: 10 }}>Medicine</th>
                        <th style={{ padding: 10 }}>Quantity</th>
                        <th style={{ padding: 10 }}>From</th>
                        <th style={{ padding: 10 }}>To</th>
                        <th style={{ padding: 10, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferHistory.map((rec, idx) => (
                        editTransferIdx === idx ? (
                          <tr key={idx} style={{ borderBottom: '1px solid #e3eaf2', background: '#f3f6fa' }}>
                            <td style={{ padding: 10 }}>{new Date(rec.date).toLocaleString('en-GB')}</td>
                            <td style={{ padding: 10 }}>{rec.medicineName}</td>
                            <td style={{ padding: 10 }}>
                              <input
                                type="number"
                                min="1"
                                value={editTransferQty}
                                onChange={e => setEditTransferQty(e.target.value)}
                                style={{ width: 70 }}
                              />
                            </td>
                            <td style={{ padding: 10 }}>{rec.fromClinic}</td>
                            <td style={{ padding: 10 }}>{rec.toClinic}</td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button className="main-action-btn" style={{ background: '#1976d2', fontSize: 14, marginRight: 6 }} onClick={() => handleEditTransferSave(idx, rec)} disabled={editTransferLoading}>
                                {editTransferLoading ? <LoadingSpinner size="xsmall" /> : 'Save'}
                              </button>
                              <button className="main-action-btn" style={{ background: '#e0e0e0', color: '#1976d2', fontSize: 14 }} onClick={() => setEditTransferIdx(null)}>
                                Cancel
                              </button>
                              {editTransferError && <div className="error">{editTransferError}</div>}
                            </td>
                          </tr>
                        ) : (
                          <tr key={idx} style={{ borderBottom: '1px solid #e3eaf2' }}>
                            <td style={{ padding: 10 }}>{new Date(rec.date).toLocaleString('en-GB')}</td>
                            <td style={{ padding: 10 }}>{rec.medicineName}</td>
                            <td style={{ padding: 10 }}>{rec.quantity}</td>
                            <td style={{ padding: 10 }}>{rec.fromClinic}</td>
                            <td style={{ padding: 10 }}>{rec.toClinic}</td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button className="main-action-btn" style={{ background: '#1976d2', fontSize: 14, marginRight: 6 }} onClick={() => { setEditTransferIdx(idx); setEditTransferQty(rec.quantity); setEditTransferError(''); }}>
                                Edit
                              </button>
                              <button className="main-action-btn" style={{ background: '#c62828', color: '#fff', fontSize: 14 }} onClick={() => handleDeleteTransfer(idx, rec)} disabled={deleteTransferLoadingIdx === idx}>
                                {deleteTransferLoadingIdx === idx ? <LoadingSpinner size="xsmall" /> : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Search Bar */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="input-group" style={{ position: 'relative', margin: 0 }}>
              <FaSearch style={{ color: '#1976d2' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines..."
                autoComplete="off"
                style={{ zIndex: 2 }}
              />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading medicines...</p>
          </div>
        ) : (
          <>
            {/* Stats Card */}
            <div className="row mb-4">
              <div className="col-md-4">
                <div style={{ 
                  background: '#f3f6fa', 
                  borderRadius: 16, 
                  boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)',
                  padding: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <FaList style={{ color: '#1976d2', fontSize: 24 }} />
                  <div style={{ fontWeight: 600, fontSize: 18 }}>
                    Total Items: {filteredMedicines.length}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Medicines Table */}
            <div style={{ 
              background: '#fff', 
              borderRadius: 12, 
              boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', 
              padding: 24,
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 17 }}>                <thead>
                  <tr style={{ background: '#e3eaf2' }}>
                    <th 
                      style={{ padding: 16, cursor: 'pointer', userSelect: 'none' }} 
                      onClick={() => handleSort('name')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Medicine Name {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      style={{ padding: 16, cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} 
                      onClick={() => handleSort('quantity')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        Available Quantity {getSortIcon('quantity')}
                      </div>
                    </th>
                    {(showPrices || user.role === 'admin') && (
                      <th 
                        style={{ padding: 16, cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          Price (Rs)
                        </div>
                      </th>
                    )}
                    <th 
                      style={{ padding: 16, cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} 
                      onClick={() => handleSort('expiryDate')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        Expiry Date {getSortIcon('expiryDate')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                        No medicines found
                      </td>
                    </tr>
                  ) : (                    filteredMedicines.map(med => (
                      <tr key={med._id} style={{ borderBottom: '1px solid #e3eaf2' }}>
                        <td style={{ padding: 16 }}>{med.name}</td>
                        <td style={{ padding: 16, textAlign: 'center' }}>
                          <span style={{ 
                            background: med.quantity > 10 ? '#e8f5e9' : med.quantity > 0 ? '#fff3e0' : '#ffebee',
                            color: med.quantity > 10 ? '#2e7d32' : med.quantity > 0 ? '#ef6c00' : '#c62828',
                            padding: '6px 16px',
                            borderRadius: 20,
                            fontWeight: 600,
                            display: 'inline-block',
                            minWidth: '80px'
                          }}>
                            {med.quantity}
                          </span>
                        </td>
                        {(showPrices || user.role === 'admin') && (
                          <td style={{ padding: 16, textAlign: 'center' }}>
                            {med.purchasePrice ? `${med.purchasePrice} Rs` : '-'}
                          </td>
                        )}
                        <td style={{
                          padding: 16,
                          textAlign: 'center',
                          color: isExpiringSoon(med.expiryDate) ? '#d32f2f' : undefined,
                          fontWeight: isExpiringSoon(med.expiryDate) ? 700 : undefined
                        }}>
                          {formatExpiryDate(med.expiryDate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClinicInventory;
