// d:\Coding\Mast Pharmacy\frontend\src\components\admin\SalesSummary.js
import React from 'react';
import { FaChartLine, FaMoneyBillWave, FaBoxes } from 'react-icons/fa';

const SalesSummary = ({ sales }) => {
  // Calculate summary statistics
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalItems = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const uniqueItems = new Set(sales.map(s => s.medicine)).size;
  
  // Find top selling item
  const itemCounts = sales.reduce((acc, s) => {
    if (!acc[s.medicine]) acc[s.medicine] = 0;
    acc[s.medicine] += s.quantity || 0;
    return acc;
  }, {});
  
  let topSellingItem = { name: 'None', count: 0 };
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > topSellingItem.count) {
      topSellingItem = { name, count };
    }
  });
  
  return (
    <div className="sales-summary" style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#1976d2', fontWeight: 600, marginBottom: 16, fontSize: 18 }}>
        Sales Summary
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16,
      }}>
        {/* Total Sales Amount Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          padding: 16, 
          boxShadow: '0 2px 10px rgba(25, 118, 210, 0.08)',
          border: '1px solid #e3f2fd',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: 50, 
            background: '#e3f2fd', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1976d2'
          }}>
            <FaMoneyBillWave size={24} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Total Sales</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1976d2' }}>
              {totalSalesAmount.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Total Items Sold Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          padding: 16, 
          boxShadow: '0 2px 10px rgba(25, 118, 210, 0.08)',
          border: '1px solid #e3f2fd',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: 50, 
            background: '#e3f2fd', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1976d2'
          }}>
            <FaBoxes size={24} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Items Sold</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1976d2' }}>
              {totalItems} ({uniqueItems} unique)
            </div>
          </div>
        </div>
        
        {/* Top Selling Item Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          padding: 16, 
          boxShadow: '0 2px 10px rgba(25, 118, 210, 0.08)',
          border: '1px solid #e3f2fd',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: 50, 
            background: '#e3f2fd', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1976d2'
          }}>
            <FaChartLine size={24} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Top Selling Item</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1976d2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
              {topSellingItem.name}
            </div>
            <div style={{ fontSize: 14, color: '#555' }}>
              {topSellingItem.count} units
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummary;
