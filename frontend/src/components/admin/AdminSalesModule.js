import React, { useEffect, useState, useCallback } from 'react';
import { FaChartBar, FaCheckCircle, FaSearch, FaClinicMedical } from 'react-icons/fa';
import API from '../../api';
import '../Auth.css';
import './AdminSalesModule.css';
import { getStoredUser } from '../../utils';
import ConfirmDialog from '../common/ConfirmDialog';
import SalesSummary from './SalesSummary';
import LoadingSpinner from '../common/LoadingSpinner';

// Helper: fuzzy/character-sequence match
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

// Custom SalesEntry component for Admin that accepts a clinic parameter
const AdminSalesEntry = ({ clinic, onEntryComplete }) => {
  const user = getStoredUser();
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);

  // Helper: extract clinic name from dropdown option
  const getClinicName = (option) => option && option.split(' (')[0];

  // Fetch medicines for the selected clinic with improved error handling
  useEffect(() => {
    if (!clinic) return;

    const fetchMedicines = async () => {
      setEntryLoading(true);
      setError('');
      try {
        const clinicName = getClinicName(clinic);
        const res = await API.get(`/api/medicines?clinic=${clinicName}`);
        setAllMedicines(res.data);
      } catch (err) {
        setError('Failed to load medicines. Please try again.');
        console.error('Error fetching medicines:', err);
        setAllMedicines([]);
      } finally {
        setEntryLoading(false);
      }
    };

    fetchMedicines();
  }, [clinic]);

  const handleSelectMed = med => {
    setSelectedMed(med);
    setSearch('');
    // No profit margin logic, just clear or set rate
    setRate('');
  };

  const handleAddSale = async e => {
    e.preventDefault();
    if (!selectedMed || !quantity || !rate) return;

    setError('');
    setEntryLoading(true);

    try {
      const now = new Date();
      const clinicName = getClinicName(clinic);

      // Validate inputs before submission
      if (quantity > selectedMed.quantity) {
        throw new Error(`Only ${selectedMed.quantity} units of ${selectedMed.name} are available`);
      }

      if (parseFloat(rate) <= 0) {
        throw new Error('Selling rate must be greater than 0');
      }

      await API.post('/api/sales', {
        medicineId: selectedMed._id,
        medicineName: selectedMed.name,
        clinic: clinicName,
        quantity: Number(quantity),
        rate: Number(rate),
        purchasePrice: selectedMed.purchasePrice || 0,
        soldBy: user.email,
        soldByName: user.name,
        soldAt: now.toISOString(),
      });

      setSelectedMed(null);
      setSearch('');
      setQuantity('');
      setRate('');

      // Show success message briefly
      setError({ type: 'success', message: 'Sale recorded successfully!' });
      setTimeout(() => setError(''), 3000);

      if (onEntryComplete) onEntryComplete();
    } catch (err) {
      setError({
        type: 'error',
        message: 'Failed to record sale: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setEntryLoading(false);
    }
  };

  // Filter medicines using fuzzy search
  const filteredMedicines = search.trim().length > 0
    ? allMedicines.filter(med =>
        med.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        fuzzyMatch(med.name, search.trim())
      )
    : [];

  return (
    <form className="auth-form" onSubmit={handleAddSale} style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginBottom: 24, maxWidth: 600 }}>
      <div className="input-group" style={{ position: 'relative' }}>
        <FaSearch style={{ color: '#1976d2' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedMed(null); }}
          placeholder="Search medicine name"
          autoComplete="off"
          required={!selectedMed}
          style={{ zIndex: 2 }}
        />
        {filteredMedicines.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e3eaf2', borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
            {filteredMedicines.map(med => (
              <div key={med._id} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }} onClick={() => handleSelectMed(med)}>{med.name}</div>
            ))}
          </div>
        )}
      </div>
      {selectedMed && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, margin: '10px 0', boxShadow: '0 1px 6px #e3eaf2' }}>
          <div><b>Name:</b> {selectedMed.name}</div>
          <div><b>Available:</b> {selectedMed.quantity}</div>
          <div><b>Purchase Price:</b> {selectedMed.purchasePrice}</div>
        </div>
      )}
      <div className="input-group">
        <input
          type="number"
          min="1"
          max={selectedMed ? selectedMed.quantity : ''}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Quantity Sold"
          required
          disabled={!selectedMed}
        />
      </div>
      <div className="input-group">
        <input
          type="number"
          min="0"
          value={rate}
          onChange={e => setRate(e.target.value)}
          placeholder="Selling Rate"
          required
          disabled={!selectedMed}
        />
      </div>
      <button
        type="submit"
        className="main-action-btn"
        disabled={!selectedMed || !quantity || !rate || entryLoading}
      >
        {entryLoading ? 'Processing...' : 'Add Sale'}
      </button>

      {/* Show error or success message */}
      {error && typeof error === 'object' && error.type === 'success' && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          backgroundColor: '#e8f5e9',
          color: '#388e3c',
          borderRadius: 4,
          fontWeight: 500
        }}>
          {error.message}
        </div>
      )}

      {error && (typeof error === 'string' || error.type === 'error') && (
        <div className="error" style={{ marginTop: 10 }}>
          {typeof error === 'string' ? error : error.message}
        </div>
      )}
      {entryLoading && (
        <div style={{ marginTop: 12 }}>
          <LoadingSpinner size="small" />
        </div>
      )}
    </form>
  );
};

const AdminSalesModule = () => {
  // Memoize user so it doesn't change on every render
  const [user] = useState(() => getStoredUser());
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSalesEntry, setShowSalesEntry] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filteredSales, setFilteredSales] = useState([]); // <-- Add this line

  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Get today's date in YYYY-MM-DD format
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [searchSold, setSearchSold] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ medicineName: '', quantity: '', rate: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Memoize getClinicName and fetchSales for stable dependencies
  const getClinicName = useCallback((option) => option && option.split(' (')[0], []);

  // Fetch clinics (memoized)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let isMounted = true;
    const fetchClinics = async () => {
      try {
        const res = await API.get('/api/medicines/clinics');
        const clinicsList = res.data.filter(c => c && c !== 'ALL');
        if (isMounted) {
          setClinics(clinicsList);
          if (clinicsList.length > 0) {
            setSelectedClinic(clinicsList[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch clinics:", err);
        }
      }
    };
    fetchClinics();
    return () => { isMounted = false; };
  }, [user]);

  // Memoize fetchSales to avoid re-creation unless dependencies change
  const fetchSales = useCallback(async () => {
    if (!user || user.role !== 'admin' || !selectedClinic) return;
    setLoading(true);
    const clinicName = getClinicName(selectedClinic);
    try {
      const res = await API.get(`/api/sales/by-date?clinic=${clinicName}&date=${selectedDate}&timezone=Asia/Karachi`);
      const fetchedSales = res.data;
      const transformedSales = fetchedSales.map(s => ({
        _id: s._id,
        medicine: s.medicineName,
        medicineId: s.medicine,
        quantity: s.quantity,
        rate: s.rate,
        total: s.total,
        purchasePrice: s.purchasePrice,
        profit: (s.purchasePrice !== null && s.purchasePrice !== undefined) 
          ? (s.rate - s.purchasePrice) * s.quantity
          : null,
        soldBy: s.soldByName || s.soldBy,
        dateTime: new Date(s.soldAt).toLocaleString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
      setSales(transformedSales);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedClinic, selectedDate, getClinicName]);

  useEffect(() => {
    if (selectedClinic) {
      fetchSales();
    }
  }, [selectedClinic, selectedDate, fetchSales]);

  // Export sales data to CSV
  const exportSalesToCSV = () => {
    if (!selectedClinic || filteredSales.length === 0) {
      setActionError('No sales data to export');
      return;
    }

    setExportLoading(true);

    try {
      const clinicName = getClinicName(selectedClinic);
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      });

      // CSV Header
      const csvHeader = 'Medicine,Quantity,Rate,Total,Sold By,Date & Time\n';

      // CSV Rows
      const csvRows = filteredSales.map(sale => {
        return [
          `"${sale.medicine}"`,
          sale.quantity,
          sale.rate,
          sale.total,
          `"${sale.soldBy}"`,
          `"${sale.dateTime}"`
        ].join(',');
      });

      // Combine header and rows
      const csvContent = csvHeader + csvRows.join('\n');

      // Create a blob and downloadable link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${clinicName}_Sales_${formattedDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionError({ type: 'success', message: 'CSV exported successfully!' });
      setTimeout(() => setActionError(''), 3000);
    } catch (err) {
      setActionError(`Failed to export CSV: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };
  // Remove useMemo for filteredSales and use useEffect instead
  useEffect(() => {
    setFilteredSales(
      sales.filter(sale =>
        sale.medicine && searchSold
          ? (
              sale.medicine.toLowerCase().includes(searchSold.trim().toLowerCase()) ||
              fuzzyMatch(sale.medicine, searchSold.trim())
            )
          : true
      )
    );
  }, [sales, searchSold]);
  // Start editing a sale
  const handleEdit = (sale, idx) => {
    setEditId(sale._id || idx);
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
    if (!selectedClinic) {
      setActionError({ type: 'error', message: 'Please select a clinic first' });
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      // Find medicineId for new medicineName (if changed)
      let medicineId = sale.medicineId;
      let medicineName = editForm.medicineName;
      const clinicName = getClinicName(selectedClinic);

      if (medicineName !== sale.medicine) {
        // Fetch medicine by name and clinic
        const res = await API.get(`/api/medicines?clinic=${clinicName}&search=${encodeURIComponent(medicineName)}`);
        const found = res.data.find(m => m.name.toLowerCase() === medicineName.toLowerCase());
        if (!found) throw new Error('Medicine not found');
        medicineId = found._id;
      }

      // Validate inputs
      if (parseFloat(editForm.quantity) <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (parseFloat(editForm.rate) <= 0) {
        throw new Error('Rate must be greater than 0');
      }

      // Use current time
      const now = new Date();

      await API.put(`/api/sales/${sale._id}`, {
        medicineId,
        medicineName,
        clinic: clinicName,
        quantity: Number(editForm.quantity),
        rate: Number(editForm.rate),
        soldAt: now.toISOString()
      });

      // Refresh sales
      await fetchSales();

      setEditId(null);
      setEditForm({ medicineName: '', quantity: '', rate: '' });

      // Show success message
      setActionError({ type: 'success', message: 'Sale updated successfully!' });
      setTimeout(() => setActionError(null), 3000);
    } catch (err) {
      setActionError({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update sale'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete a sale with confirmation dialog
  const handleDelete = (sale) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Sale',
      message: `Are you sure you want to delete this ${sale.medicine} sale?`,
      type: 'warning',
      onConfirm: async () => {
        setActionLoading(true);
        setActionError('');
        try {
          await API.delete(`/api/sales/${sale._id}`);
          // Refresh sales
          await fetchSales();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          setActionError(err.response?.data?.message || 'Failed to delete sale');
        } finally {
          setActionLoading(false);
        }
      },
      onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false })
    });
  };

  if (!user || user.role !== 'admin') {
    return <div className="container mt-5 pt-5">Unauthorized access.</div>;
  }

  return (
    <div className="admin-sales-container">
      <div className="container py-4 admin-sales-content">
        <h2 className="admin-sales-heading">
          <FaCheckCircle /> Sell Medicine
        </h2>

        {/* Clinic Selection */}
        <div className="admin-sales-toolbar">
          <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaClinicMedical /> Select Clinic:
          </label>
          <select
            value={selectedClinic}
            onChange={e => {
              setSelectedClinic(e.target.value);
              setShowSalesEntry(false);
              setEditId(null);
              setEditForm({ medicineName: '', quantity: '', rate: '' });
            }}
            style={{ padding: '0.5rem', borderRadius: 6, minWidth: 200 }}
          >
            {clinics.map(clinic => (
              <option key={clinic} value={clinic}>{clinic}</option>
            ))}
          </select>
        </div>

        <div className="admin-sales-actions mb-4">
          <button
            onClick={() => setShowSalesEntry(v => !v)}
            className="main-action-btn"
            disabled={!selectedClinic}
          >
            {showSalesEntry ? 'Cancel' : 'Sell Medicine'}
          </button>
          <button onClick={() => window.location.href='/admin/analytics'} className="main-action-btn" style={{ background: '#1976d2' }}>
            <FaChartBar style={{ marginRight: 8 }} /> View Analytics
          </button>
          <button
            onClick={exportSalesToCSV}
            className="main-action-btn"
            disabled={!selectedClinic || filteredSales.length === 0 || exportLoading}
            style={{ background: '#388e3c' }}
          >
            {exportLoading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Search/filter for sold medicines */}
        <div className="admin-sales-search">
          <input
            type="text"
            className="form-control"
            placeholder="Search sold medicines by name..."
            value={searchSold}
            onChange={e => setSearchSold(e.target.value)}
            style={{ fontSize: 17 }}
          />
        </div>

        {/* Error and Success Messages */}
        {actionError && typeof actionError === 'string' && (
          <div className="error" style={{ marginBottom: 10 }}>{actionError}</div>
        )}

        {actionError && typeof actionError === 'object' && actionError.type === 'success' && (
          <div style={{
            marginBottom: 10,
            padding: '8px 12px',
            backgroundColor: '#e8f5e9',
            color: '#388e3c',
            borderRadius: 4,
            fontWeight: 500
          }}>
            {actionError.message}
          </div>
        )}

        {actionError && typeof actionError === 'object' && actionError.type === 'error' && (
          <div className="error" style={{ marginBottom: 10 }}>{actionError.message}</div>
        )}

        {showSalesEntry && selectedClinic && (
          <div style={{ margin: '0 0 32px 0' }}>
            <AdminSalesEntry clinic={selectedClinic} onEntryComplete={() => setShowSalesEntry(false)} />
          </div>
        )}

        <div className="row align-items-center mb-3">
          <div className="col">
            <h3 style={{ color: '#1976d2', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 22 }}>
              {selectedClinic ? (
                <>Sales for {getClinicName(selectedClinic)} - {new Date(selectedDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</>
              ) : (
                <>Please select a clinic</>
              )}
            </h3>
          </div>
          <div className="col-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="form-control custom-date-input"
              style={{ minWidth: 160, borderRadius: 8, border: '1.5px solid #1976d2', background: '#f3f6fa', color: '#1976d2', fontWeight: 600, fontSize: 16, padding: '8px 14px', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.07)' }}
              disabled={!selectedClinic}
            />
          </div>
        </div>
        {/* Show sales summary statistics */}
        {filteredSales.length > 0 && <SalesSummary sales={filteredSales} />}

        {/* Only show the table after loading is false and clinics are loaded */}
        {!loading && clinics.length > 0 && (
          <div className="admin-sales-table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-sales-table" style={{ minWidth: 700, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e3eaf2' }}>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 120 }}>Medicine</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 80 }}>Quantity</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 80 }}>Rate</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 100 }}>Total</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 120 }}>Sold By</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 150 }}>Date & Time</th>
                  <th style={{ padding: 18, textAlign: 'left', minWidth: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: 24, color: '#888', fontWeight: 500 }}>No sales for this date.</td></tr>
                ) : (
                  filteredSales.map((sale, idx) => (
                    editId === (sale._id || idx) ? (
                      <tr key={sale._id || idx} style={{ background: '#f3f6fa' }}>
                        <td style={{ padding: 12 }}>
                          <input
                            type="text"
                            className="form-control"
                            value={editForm.medicineName}
                            onChange={e => setEditForm(f => ({ ...f, medicineName: e.target.value }))}
                            style={{ minWidth: 120 }}
                          />
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
                        <td style={{ padding: 12 }}>{sale.soldBy}</td>
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
                        <td style={{ padding: 16 }}>{sale.soldBy}</td>
                        <td style={{ padding: 16 }}>{sale.dateTime}</td>
                        <td style={{ padding: 16 }}>
                          <div className="button-container">
                            <button className="main-action-btn" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={() => handleEdit(sale, idx)}>Edit</button>
                            <button className="main-action-btn" style={{ background: '#d32f2f', color: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 16px' }} disabled={actionLoading} onClick={() => handleDelete(sale)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {loading && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <LoadingSpinner size="small" />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        type={confirmDialog.type}
      />
    </div>
  );
};

export default AdminSalesModule;

/* Add responsive CSS for mobile */
/* In AdminSalesModule.css, add:
@media (max-width: 768px) {
  .admin-sales-table-container {
    overflow-x: auto;
    width: 100%;
  }
  .admin-sales-table {
    min-width: 600px;
    font-size: 14px;
  }
  .admin-sales-table th, .admin-sales-table td {
    padding: 10px;
  }
}
*/
