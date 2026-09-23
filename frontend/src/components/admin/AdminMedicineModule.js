import React, { useEffect, useState } from 'react';
import API from '../../api';
import { FaPills, FaPlus, FaClinicMedical, FaSearch, FaEdit, FaChartBar, FaTrash, FaTimesCircle } from 'react-icons/fa';
import { formatExpiryDate, isExpiringSoon } from '../../utils';
import '../Auth.css';

const AdminMedicineModule = () => {  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({ name: '', quantity: '', purchasePrice: '', clinic: '', expiryDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Add success message state
  const [search, setSearch] = useState('');
  const [filteredNames, setFilteredNames] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  // Helper: extract clinic name from dropdown option
  const getClinicName = (option) => option.split(' (')[0];

  // Set up clinics with 'ALL' option
  useEffect(() => {
    API.get('/api/medicines/clinics')
      .then(res => {
        const clinicsList = ['ALL', ...Array.from(new Set(res.data.filter(c => c && c !== 'ALL')))];
        setClinics(clinicsList);
        setSelectedClinic('ALL');
        setForm(f => ({ ...f, clinic: 'ALL' }));
      });
  }, []);

  // Fetch medicines when clinic changes
  useEffect(() => {
    const fetchMedicines = async (clinicOption) => {
      setLoading(true);
      try {
        let url = '/api/medicines';
        const clinicName = getClinicName(clinicOption);
        if (clinicName && clinicName !== 'ALL') url += `?clinic=${encodeURIComponent(clinicName)}`;
        const res = await API.get(url);
        setMedicines(res.data);
      } catch (err) {
        setError('Failed to fetch inventory');
      }
      setLoading(false);
    };
    fetchMedicines(selectedClinic);
  }, [selectedClinic]);

  // Autocomplete for medicine name
  useEffect(() => {
    if (search) {
      setFilteredNames(medicines.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(m => m.name));
    } else {
      setFilteredNames([]);
    }
  }, [search, medicines]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'name') setSearch(e.target.value);
  };

  const handleSelectName = name => {
    setForm({ ...form, name });
    setSearch(name);
    setFilteredNames([]);
  };

  const handleClinicChange = e => {
    setSelectedClinic(e.target.value);
    setForm({ ...form, clinic: e.target.value });
  };

  // Prevent 'ALL' from being selected for add/edit in Medicines page
  const canModify = selectedClinic && getClinicName(selectedClinic) !== 'ALL';

  // Check if medicine with same name exists in selected clinic
  const medicineExists = medicines.some(med =>
    med.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
    med.clinic === getClinicName(selectedClinic) &&
    (!editingId || med._id !== editingId)
  );  const handleSubmit = async e => {
    e.preventDefault();
    if (selectedClinic === 'ALL') {
      setShowPopup(true);
      return;
    }
    if (!canModify) return;
    if (medicineExists && !editingId) return;
    
    setLoading(true);
    setSuccess(''); // Clear any previous success message
    setError(''); // Clear any previous error message
    
    const clinicName = getClinicName(selectedClinic);
    const medicineData = { ...form, clinic: clinicName };
    
    try {
      if (editingId) {
        // Update medicine
        const response = await API.put(`/api/medicines/${editingId}`, medicineData);
        
        // Update the medicine in local state
        setMedicines(prevMedicines => 
          prevMedicines.map(med => 
            med._id === editingId ? response.data : med
          )
        );
        
        // Show success message
        setSuccess(`${medicineData.name} was successfully updated`);
      } else {
        // Add new medicine
        const response = await API.post('/api/medicines', medicineData);
        
        // Add the new medicine to local state
        setMedicines(prevMedicines => [...prevMedicines, response.data]);
        
        // Show success message
        setSuccess(`${medicineData.name} was successfully added`);
      }
        // Reset form and state
      setForm({ name: '', quantity: '', purchasePrice: '', clinic: clinicName, expiryDate: '' });
      setEditingId(null);
      setShowForm(false);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Save error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save medicine';
      setError(`Error: ${errorMessage}`);
    }
    
    setLoading(false);
  };

  const handleEdit = med => {
    setForm({
      name: med.name,
      quantity: med.quantity,
      purchasePrice: med.purchasePrice,
      clinic: med.clinic,
      expiryDate: med.expiryDate ? med.expiryDate.substring(0, 10) : '',
    });
    setEditingId(med._id);
    setSearch(med.name);
    setShowForm(true);
  };  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) {
      return; // User canceled the deletion
    }
    
    setLoading(true);
    setSuccess(''); // Clear any previous success message
    setError(''); // Clear any previous error message
    
    try {
      // Get medicine name for the success message
      const medicineToDelete = medicines.find(med => med._id === id);
      const medicineName = medicineToDelete ? medicineToDelete.name : 'Medicine';
      
      await API.delete(`/api/medicines/${id}`);
      
      // Update the local state by filtering out the deleted medicine
      setMedicines(prevMedicines => prevMedicines.filter(med => med._id !== id));
      
      // Show success message
      setSuccess(`${medicineName} was successfully deleted`);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Delete error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete medicine';
      setError(`Error: ${errorMessage}`);
    }
    setLoading(false);
  };
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

  // Filtered medicines for table search with case-insensitive and fuzzy search
  const filteredMedicines = medicines.filter(med =>
    !tableSearch.trim() || 
    med.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
    fuzzyMatch(med.name, tableSearch)
  );

  // Calculate total stock price for filtered medicines
  const totalStockPrice = filteredMedicines.reduce((sum, med) => sum + (Number(med.purchasePrice) * Number(med.quantity)), 0);

  return (
    <div className="auth-container" style={{ 
      maxWidth: 1100, 
      margin: '110px auto 40px auto', 
      padding: 24, 
      position: 'relative',
      zIndex: 5
    }}>
      <h2 style={{ color: '#1976d2', fontWeight: 800, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FaPills /> Medicine Management
      </h2>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ fontWeight: 600, marginRight: 10, display: 'flex', alignItems: 'center', gap: 6 }}><FaClinicMedical /> Clinic:</label>
        <select value={selectedClinic} onChange={handleClinicChange} style={{ padding: '0.5rem', borderRadius: 6 }}>
          {clinics.map(clinic => (
            <option key={clinic} value={clinic}>{clinic}</option>
          ))}
        </select>
      </div>
      {/* Total Stock Price Display */}
      <div style={{ marginBottom: 18, fontWeight: 700, fontSize: 20, color: '#1976d2', background: '#f3f6fa', borderRadius: 8, padding: '12px 18px', display: 'inline-block' }}>
        Total Stock Price: <span style={{ color: '#2e7d32' }}>Rs. {totalStockPrice.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
      </div>
      {/* Add Medicine button always shows the form */}
      {!showForm && (
        <button
          className="main-action-btn"
          style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 24 }}
          onClick={() => setShowForm(true)}
        >
          <FaPlus style={{ marginRight: 8 }} /> Add Medicine
        </button>
      )}
      {showForm && (
        <form className="auth-form" onSubmit={handleSubmit} style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginBottom: 24, maxWidth: 600 }}>
          <div className="input-group" style={{ position: 'relative' }}>
            <FaSearch style={{ color: '#1976d2' }} />
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Search or enter medicine name"
              autoComplete="off"
              required
              style={{ zIndex: 2 }}
            />
            {filteredNames.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e3eaf2', borderRadius: 6, zIndex: 10 }}>
                {filteredNames.map(n => (
                  <div key={n} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }} onClick={() => handleSelectName(n)}>{n}</div>
                ))}
              </div>
            )}
          </div>
          <div className="input-group">
            <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" type="number" min="0" required />
          </div>
          <div className="input-group">
            <input name="purchasePrice" value={form.purchasePrice} onChange={handleChange} placeholder="Purchase Price" type="number" min="0" required />
          </div>
          <div className="input-group">
            <input name="expiryDate" value={form.expiryDate} onChange={handleChange} placeholder="Expiry Date" type="date" required />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              type="submit"
              className="main-action-btn"
              disabled={loading}
              style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16 }}
            >
              {editingId ? <><FaEdit /> Save</> : <><FaPlus /> Add</>}
            </button>            <button type="button" className="main-action-btn" style={{ background: '#e0e0e0', color: '#1976d2', fontWeight: 700, fontSize: 16 }} onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: '', quantity: '', purchasePrice: '', clinic: selectedClinic, expiryDate: '' }); }}>
              Cancel
            </button>
          </div>
          {medicineExists && !editingId && (
            <div style={{ color: '#d32f2f', marginTop: 8, fontWeight: 600 }}>
              Medicine already exists in this clinic. Please use Edit instead.
            </div>
          )}
        </form>      )}
      {error && <div className="error">{error}</div>}
      {success && (
        <div style={{ 
          backgroundColor: '#e8f5e9', 
          color: '#2e7d32', 
          padding: '10px 16px', 
          borderRadius: 8, 
          marginBottom: 16, 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 600
        }}>
          <span style={{ fontSize: '1.2rem' }}>✓</span> {success}
        </div>
      )}
      {/* Popup for select clinic warning */}
      {showPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 16px rgba(25,118,210,0.18)', minWidth: 340, textAlign: 'center', position: 'relative' }}>
            <FaTimesCircle size={38} color="#d32f2f" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 20, color: '#d32f2f', marginBottom: 10 }}>Please select the Clinic first</div>
            <div style={{ color: '#555', marginBottom: 18 }}>You must select a specific clinic before adding or editing a medicine.</div>
            <button onClick={() => setShowPopup(false)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}
      {/* Table search input - professional UI, wider, with icon */}
      <div style={{ marginBottom: 18, maxWidth: 600, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f3f6fa', borderRadius: 8, border: '1px solid #e3eaf2', padding: '0.5rem 1rem', boxShadow: '0 1px 6px rgba(25,118,210,0.07)' }}>
          <FaSearch style={{ color: '#1976d2', fontSize: 22, marginRight: 12 }} />
          <input
            type="text"
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            placeholder="Search medicine by name to edit..."
            style={{ width: '100%', fontSize: 18, border: 'none', outline: 'none', background: 'transparent', color: '#222' }}
          />
        </div>
      </div>
      <div style={{ marginTop: 24, width: '100%' }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', maxWidth: 1400, minWidth: 900, margin: '0 auto', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)' }}>
              <thead>                <tr style={{ background: '#e3eaf2' }}>
                  <th style={{ padding: '12px 16px' }}><FaPills /> Name</th>
                  <th style={{ padding: '12px 16px' }}>Quantity</th>
                  <th style={{ padding: '12px 16px' }}>Purchase Price</th>
                  <th style={{ padding: '12px 16px' }}>Expiry Date</th>
                  <th style={{ padding: '12px 16px' }}><FaClinicMedical /> Clinic</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map(med => (
                  <tr key={med._id} style={{ borderBottom: '1px solid #e3eaf2', textAlign: 'center' }}>
                    <td style={{ padding: '10px 12px' }}>{med.name}</td>
                    <td style={{ padding: '10px 12px' }}>{med.quantity}</td>
                    <td style={{ padding: '10px 12px' }}>{med.purchasePrice}</td>
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: isExpiringSoon(med.expiryDate) ? '#d32f2f' : undefined,
                      fontWeight: isExpiringSoon(med.expiryDate) ? 700 : undefined
                    }}>
                      {formatExpiryDate(med.expiryDate)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{med.clinic}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => handleEdit(med)} style={{ marginRight: 8, background: '#42a5f5', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaEdit style={{ marginRight: 4 }} /> Edit</button>
                      <button onClick={() => handleDelete(med._id)} style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Delete"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button className="main-action-btn" style={{ background: '#1976d2', fontWeight: 700, fontSize: 18, padding: '1rem 2rem' }} onClick={() => window.location.href='/admin/analytics'}>
          <FaChartBar style={{ marginRight: 8 }} /> See Analytics
        </button>
      </div>
    </div>
  );
};

export default AdminMedicineModule;
