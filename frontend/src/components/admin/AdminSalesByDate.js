import React, { useEffect, useState } from 'react';
import API from '../../api';
import 'bootstrap/dist/css/bootstrap.min.css';

const AdminSalesByDate = () => {
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper: extract clinic name from dropdown option
  const getClinicName = (option) => option.split(' (')[0];

  useEffect(() => {
    API.get('/api/medicines/clinics').then(res => {
      setClinics(res.data);
      if (res.data.length > 0) setSelectedClinic(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClinic || !date) return;
    setLoading(true);
    const clinic = getClinicName(selectedClinic);
    API.get(`/api/sales/by-date?clinic=${clinic}&date=${date}`)
      .then(res => {
        setSales(res.data.map(s => ({
          _id: s._id,
          medicineName: s.medicineName,
          quantity: s.quantity,
          rate: s.rate,
          total: s.total,
          soldBy: s.soldByName || s.soldBy,
          soldAt: new Date(s.soldAt).toLocaleString()
        })));
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        setError('Failed to fetch sales');
      });
  }, [selectedClinic, date]);
  return (
    <div className="container py-4" style={{ 
      maxWidth: 900,
      marginTop: '100px',
      position: 'relative',
      zIndex: 5
    }}>
      <h2 style={{ color: '#1976d2', fontWeight: 900, marginBottom: 24 }}>Sales by Date (Admin)</h2>
      <div className="row g-3 align-items-end mb-4">
        <div className="col-md-5">
          <label className="form-label">Select Clinic</label>
          <select className="form-select" value={selectedClinic} onChange={e => setSelectedClinic(e.target.value)}>
            {clinics.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Select Date</label>
          <input
            type="date"
            className="form-control custom-date-input"
            style={{ minWidth: 140, maxWidth: 180 }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-danger">{error}</div> : (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', overflowX: 'auto' }}>
          <table className="table table-bordered" style={{ borderRadius: 16, fontSize: 17 }}>
            <thead style={{ background: '#e3eaf2' }}>
              <tr>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Total</th>
                <th>Sold By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan="6" style={{ color: '#888', fontWeight: 500 }}>No sales for this date.</td></tr>
              ) : sales.map((sale, idx) => (
                <tr key={idx}>
                  <td>{sale.medicineName}</td>
                  <td>{sale.quantity}</td>
                  <td>{sale.rate}</td>
                  <td>{sale.total}</td>
                  <td>{sale.soldByName}</td>
                  <td>{new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSalesByDate;
