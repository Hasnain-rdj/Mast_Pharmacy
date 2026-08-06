import React, { useEffect, useState } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import './Auth.css';
import API from '../api';
import { getStoredUser } from '../utils';
import { useSettings } from './context/SettingsContext';

const SalesEntryInline = ({ onEntryComplete }) => {
  const user = getStoredUser();
  const userClinic = user?.clinic;
  const [search, setSearch] = useState('');
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [quantity, setQuantity] = useState('');  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const { settings } = useSettings(); // Properly use the settings context
  
  // Log settings for debugging
  console.log('💊 SalesEntryInline settings received:', settings);
  
  // Define a strict comparison to ensure showPrices is truly a boolean
  const isAdmin = user?.role === 'admin';
  
  // Force showPrices to be treated as boolean
  const globalShowPrices = settings.showPrices === true; 
  console.log('💊 Global showPrices value:', globalShowPrices);
  
  // Check if this clinic is in the hidden list
  const hiddenClinics = Array.isArray(settings.clinicsHidePrices) ? settings.clinicsHidePrices : [];
  const clinicPricesHidden = hiddenClinics.includes(userClinic);
  console.log('💊 Clinic prices hidden for', userClinic, ':', clinicPricesHidden);
  console.log('💊 Hidden clinics list:', hiddenClinics);
  
  // Calculate final showPrices value with proper boolean logic
  const showPrices = isAdmin || (globalShowPrices && !clinicPricesHidden);
  console.log('💊 Final showPrices value:', showPrices);

  // Fetch all medicines for the clinic on mount
  useEffect(() => {
    if (userClinic) {
      API.get(`/api/medicines?clinic=${userClinic}`)
        .then(res => setAllMedicines(res.data))
        .catch(() => setAllMedicines([]));
    }
  }, [userClinic]);  const handleSelectMed = med => {
    setSelectedMed(med);
    setSearch(''); // Clear the search field when a medicine is selected
    // Show the admin's set price if prices are visible, but let clinic worker modify if needed
    if (med.purchasePrice && (showPrices || user.role === 'admin')) {
      setRate(med.purchasePrice);
    } else {
      setRate('');
    }
  };const handleAddSale = async e => {
    e.preventDefault();
    if (!selectedMed || !quantity || !rate) return;
    setError('');
    try {
      // Use the browser's current date/time which respects local timezone
      const now = new Date();
      
      console.log(`Adding sale at current time: ${now.toString()}`);
      console.log(`ISO string: ${now.toISOString()}`);
      
      await API.post('/api/sales', {
        medicineId: selectedMed._id,
        medicineName: selectedMed.name,
        clinic: userClinic,
        quantity: Number(quantity),
        rate: Number(rate),
        soldBy: user.email,
        soldByName: user.name,
        soldAt: now.toISOString(),
      });
      setSelectedMed(null);
      setSearch('');
      setQuantity('');
      setRate('');
      if (onEntryComplete) onEntryComplete();
    } catch (err) {
      setError('Failed to record sale');
    }
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

  // Filter all medicines using all search types, but only if search is not empty
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
      </div>      {selectedMed && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, margin: '10px 0', boxShadow: '0 1px 6px #e3eaf2' }}>
          <div><b>Name:</b> {selectedMed.name}</div>
          <div><b>Available:</b> {selectedMed.quantity}</div>
          {(showPrices || user.role === 'admin') && (
            <div><b>Price:</b> {selectedMed.purchasePrice ? `${selectedMed.purchasePrice} Rs` : 'Not set'}</div>
          )}
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
          placeholder="Rate"
          required
          disabled={!selectedMed}
        />
      </div>
      <button type="submit" className="main-action-btn" disabled={!selectedMed || !quantity || !rate}>
        Add Sale <FaPlus style={{ marginLeft: 4 }} />
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default SalesEntryInline;
