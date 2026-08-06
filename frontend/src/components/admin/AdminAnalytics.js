import React, { useEffect, useState, useRef } from 'react';
import API from '../../api';
import { FaChartBar, FaClinicMedical, FaFilePdf, FaSearch, FaPills, FaDollarSign, FaListOl } from 'react-icons/fa';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import '../Auth.css';
Chart.register(ArcElement, Tooltip, Legend);

const AdminAnalytics = () => {
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, topMedicines: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [month, setMonth] = useState('');
  const tableRef = useRef();

  // Helper: extract clinic name from dropdown option
  const getClinicName = (option) => option.split(' (')[0];

  // Fetch unique clinic names from backend
  useEffect(() => {
    API.get('/api/medicines/clinics')
      .then(res => {
        // Filter out 'ALL' from clinics for analytics
        const filtered = res.data.filter(c => c && c !== 'ALL');
        setClinics(filtered);
        setSelectedClinic(filtered[0] || '');
      });
  }, []);

  useEffect(() => {
    if (selectedClinic) fetchStats();
    // eslint-disable-next-line
  }, [selectedClinic, fromDate, toDate, month]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const clinicName = getClinicName(selectedClinic);
      const res = await API.get(`/api/sales/analytics?clinic=${clinicName}&from=${fromDate}&to=${toDate}`);
      setStats(res.data);
    } catch (err) {
      setError('Failed to fetch analytics');
      setStats({ totalSales: 0, totalRevenue: 0, topMedicines: [] });
    }
    setLoading(false);
  };

  const fetchMonthlyStats = async () => {
    if (!selectedClinic || !month) return;
    setLoading(true);
    setError('');
    try {
      const clinicName = getClinicName(selectedClinic);
      const res = await API.get(`/api/sales/monthly-analytics?clinic=${clinicName}&month=${month}`);
      setStats(res.data);
    } catch (err) {
      setError('Failed to fetch monthly analytics');
      setStats({ totalSales: 0, totalRevenue: 0, topMedicines: [] });
    }
    setLoading(false);
  };

  const handleClinicChange = e => setSelectedClinic(e.target.value);

  const handlePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.text(`Analytics Report - ${selectedClinic}`, 14, 18);
    doc.text(`From: ${fromDate || 'All Time'}  To: ${toDate || 'All Time'}`, 14, 28);
    autoTable(doc, {
      head: [['Medicine', 'Quantity Sold', 'Revenue']],
      body: stats.topMedicines.map(m => [m.name, m.quantity, m.revenue]),
      startY: 38,
    });
    doc.text(`Total Sales: ${stats.totalSales}`, 14, doc.lastAutoTable.finalY + 12);
    doc.text(`Total Revenue: ${stats.totalRevenue}`, 14, doc.lastAutoTable.finalY + 22);
    doc.save(`analytics_${selectedClinic}_${Date.now()}.pdf`);
  };

  // Pie chart data for top medicines
  const pieData = {
    labels: stats.topMedicines.map(m => m.name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: stats.topMedicines.map(m => m.quantity),
        backgroundColor: [
          '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#ffc107', '#8bc34a', '#e91e63', '#3f51b5'
        ],
        borderWidth: 1,
      },
    ],
  };  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: '110px auto 40px auto',
      padding: '20px',
      position: 'relative',
      zIndex: 5,
      overflowX: 'hidden' 
    }}>
      <h2 style={{ color: '#1976d2', fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontSize: 32 }}>
        <FaChartBar /> Platform Analytics
      </h2>
      <div style={{ display: 'flex', gap: 18, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FaClinicMedical /> Clinic:</label>
        <select value={selectedClinic} onChange={handleClinicChange} style={{ padding: '0.5rem', borderRadius: 6, minWidth: 160 }}>
          {clinics.map(clinic => (
            <option key={clinic} value={clinic}>{clinic}</option>
          ))}
        </select>
        <label style={{ fontWeight: 600 }}>From:</label>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="custom-date-input"
          style={{ minWidth: 140, maxWidth: 180, marginRight: 6 }}
        />
        <label style={{ fontWeight: 600 }}>To:</label>
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="custom-date-input"
          style={{ minWidth: 140, maxWidth: 180, marginRight: 6 }}
        />
        <button className="main-action-btn" onClick={fetchStats} style={{ marginLeft: 10 }}><FaSearch /> Search</button>
        <label style={{ fontWeight: 600, marginLeft: 18 }}>Or Month:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="custom-date-input"
          style={{ minWidth: 140, maxWidth: 180, marginRight: 6 }}
        />
        <button className="main-action-btn" style={{ marginLeft: 10, background: '#1976d2', color: '#fff' }} onClick={fetchMonthlyStats}>Monthly Analytics</button>
        <button className="main-action-btn" style={{ background: '#d32f2f', color: '#fff', marginLeft: 10 }} onClick={handlePDF}><FaFilePdf /> Download PDF</button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>          {/* Stat Cards */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, background: '#f3f6fa', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FaListOl style={{ color: '#1976d2', fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontWeight: 800, fontSize: 28 }}>{stats.totalSales}</div>
              <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 16 }}>Total Sales</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, background: '#f3f6fa', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FaDollarSign style={{ color: '#43a047', fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontWeight: 800, fontSize: 28 }}>{stats.totalRevenue}</div>
              <div style={{ color: '#43a047', fontWeight: 600, fontSize: 16 }}>Total Revenue</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, background: '#f3f6fa', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FaDollarSign style={{ color: '#9c27b0', fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontWeight: 800, fontSize: 28 }}>{stats.totalProfit || 0}</div>
              <div style={{ color: '#9c27b0', fontWeight: 600, fontSize: 16 }}>Total Profit</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, background: '#f3f6fa', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FaPills style={{ color: '#ff9800', fontSize: 32, marginBottom: 8 }} />
              <div style={{ fontWeight: 800, fontSize: 28 }}>{stats.topMedicines.length}</div>
              <div style={{ color: '#ff9800', fontWeight: 600, fontSize: 16 }}>Top Medicines</div>
            </div>
          </div>{/* Pie Chart */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, marginBottom: 32, minWidth: 280, overflowX: 'auto' }}>
            <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 18, fontSize: 20 }}>Top 10 Medicines Sold</h3>            {stats.topMedicines.length === 0 ? (
              <div style={{ color: '#888', fontWeight: 500, fontSize: 18 }}>No data available.</div>
            ) : (
              <div style={{ width: '100%', maxWidth: 800, height: 400, margin: '0 auto' }}>
                <Pie 
                  data={pieData} 
                  options={{
                    plugins: { legend: { position: 'right' } },
                    responsive: true,
                    maintainAspectRatio: false,
                  }} 
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            )}
          </div>
          {/* Table */}
          <div ref={tableRef} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)', padding: 24, marginTop: 18, overflowX: 'auto' }}>
            <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 16 }}>Top Medicines Sold (Table)</h3>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 16, minWidth: 500 }}>
              <thead>
                <tr style={{ background: '#e3eaf2' }}>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: '#1976d2', borderTopLeftRadius: 8 }}>Medicine</th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: '#1976d2' }}>Quantity Sold</th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: '#1976d2' }}>Revenue</th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: '#1976d2', borderTopRightRadius: 8 }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {stats.topMedicines.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: 18, color: '#888', textAlign: 'center' }}>No data available.</td></tr>
                ) : (
                  stats.topMedicines.map((m, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f3f6fa' : '#fff' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1976d2' }}>{m.name}</td>
                      <td style={{ padding: '12px 10px' }}>{m.quantity}</td>
                      <td style={{ padding: '12px 10px' }}>{m.revenue}</td>
                      <td style={{ padding: '12px 10px' }}>
                        {m.profit !== null && m.profit !== undefined ? m.profit : 'N/A'}
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
  );
};

export default AdminAnalytics;
