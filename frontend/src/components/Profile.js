import React, { useRef, useState, useEffect } from 'react';
import API from '../api';
import { FaClinicMedical, FaEnvelope, FaPills, FaMoneyBillWave, FaLock, FaCog, FaFont, FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa';
import { useSettings } from './context/SettingsContext';
import { getStoredUser } from '../utils';
import './Auth.css';

const Profile = () => {
  const user = getStoredUser();
  // All hooks must be called before any return or conditional
  const [profilePic, setProfilePic] = useState(user?.profilePic || '/logo192.png');
  const fileInput = useRef();
  const [stats, setStats] = useState({ totalSold: 0, totalEarned: 0 });
  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', profilePic: profilePic });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [allClinics, setAllClinics] = useState([]);
  const { settings, updateSettings, syncGlobalSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [logoutWorkerLoading, setLogoutWorkerLoading] = useState(false);
  const [logoutWorkerMessage, setLogoutWorkerMessage] = useState('');
  const [logoutWorkerError, setLogoutWorkerError] = useState('');

  const handleLogoutAllWorkers = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to log out ALL clinic workers from all devices and browsers? They will need to log in again.'
    );
    if (!confirmed) return;

    setLogoutWorkerLoading(true);
    setLogoutWorkerMessage('');
    setLogoutWorkerError('');

    try {
      const res = await API.post('/api/auth/logout-all-workers');
      setLogoutWorkerMessage(res.data.message || 'All clinic workers have been logged out from all devices!');
    } catch (err) {
      setLogoutWorkerError(err.response?.data?.message || 'Failed to log out clinic workers.');
    } finally {
      setLogoutWorkerLoading(false);
    }
  };

  useEffect(() => {
    if (user && !profileForm.name) {
      setProfileForm({ name: user.name || '', profilePic: user.profilePic || '/logo192.png' });
      setProfilePic(user.profilePic || '/logo192.png');
    }
  }, [user, profileForm.name]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      API.get('/api/medicines/clinics').then(res => {
        setAllClinics(res.data.filter(c => c && c !== 'ALL'));
      });
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!user?.email) return;
      try {
        const res = await API.get(`/api/sales/stats?soldBy=${user.email}`);
        if (isMounted) {
          setStats(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setStats({ totalSold: 0, totalEarned: 0 });
        }
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const handlePicChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 500;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setProfilePic(dataUrl);
          setProfileForm(f => ({ ...f, profilePic: dataUrl }));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError('New passwords do not match');
      return;
    }
    try {
      await API.post('/api/auth/reset-password', {
        email: user.email,
        oldPassword: resetForm.oldPassword,
        newPassword: resetForm.newPassword,
      });
      setResetSuccess('Password reset successfully!');
      setResetForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowReset(false), 1500);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Password reset failed');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await API.put('/api/auth/update-profile', {
        email: user.email,
        name: profileForm.name,
        profilePic: profileForm.profilePic,
      });
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(res.data.user));
      }
      setProfileSuccess('Profile updated successfully!');
      setEditProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Profile update failed');
    }
  };

  const handleFontSizeChange = (size) => {
    updateSettings({ fontSize: size });
  };

  const handlePriceVisibilityChange = async (show) => {
    updateSettings({ showPrices: show });
    await syncGlobalSettings('toServer');
  };

  const handleClinicPriceVisibility = async (clinicName) => {
    const currentClinicsHidePrices = Array.isArray(settings.clinicsHidePrices) 
      ? [...settings.clinicsHidePrices] 
      : [];
    let updatedList;
    if (currentClinicsHidePrices.includes(clinicName)) {
      updatedList = currentClinicsHidePrices.filter(c => c !== clinicName);
    } else {
      updatedList = [...currentClinicsHidePrices, clinicName];
    }
    const updatedSettings = { ...settings, clinicsHidePrices: updatedList };
    localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    updateSettings({ clinicsHidePrices: updatedList });
    setRefreshToggle(prev => prev + 1);
    await syncGlobalSettings('toServer');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="auth-container profile-page" style={{ maxWidth: 900, margin: '110px auto 40px', padding: '2rem' }}>
      <div className="profile-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 16 }}>
          <img
            src={profilePic}
            alt="Profile"
            style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #1976d2', objectFit: 'cover', background: '#fff' }}
          />
          {editProfile && (
            <button
              type="button"
              onClick={() => fileInput.current.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              +
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePicChange}
          />
        </div>

        {!editProfile ? (
          <>
            <h2 style={{ color: '#1976d2', fontWeight: 800, margin: '0 0 4px 0' }}>{user?.name}</h2>
            <div style={{ color: '#666', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaEnvelope style={{ color: '#1976d2' }} /> {user?.email}
            </div>
            {user?.role === 'worker' && (
              <div style={{ color: '#1565c0', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaClinicMedical /> Clinic: {user?.clinic}
              </div>
            )}
            <div style={{ textTransform: 'capitalize', color: '#1976d2', fontWeight: 700, background: '#e3f2fd', padding: '4px 14px', borderRadius: 20, marginTop: 8, fontSize: '0.9rem' }}>
              Role: {user?.role}
            </div>
            <button
              onClick={() => setEditProfile(true)}
              className="main-action-btn btn-light"
              style={{ marginTop: 12, padding: '0.4rem 1.2rem', fontSize: '0.9rem' }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleUpdateProfile} style={{ width: '100%', maxWidth: 400, marginTop: 12 }}>
            <div className="input-group">
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Name"
                required
              />
            </div>
            {profileError && <div style={{ color: '#d32f2f', fontWeight: 600, marginBottom: 8 }}>{profileError}</div>}
            {profileSuccess && <div style={{ color: '#388e3c', fontWeight: 600, marginBottom: 8 }}>{profileSuccess}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="submit" className="main-action-btn" style={{ background: '#1976d2', color: '#fff' }}>Save</button>
              <button type="button" onClick={() => setEditProfile(false)} className="main-action-btn btn-light">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {user?.role === 'worker' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 4px 16px rgba(25, 118, 210, 0.08)', textAlign: 'center' }}>
            <FaPills size={32} style={{ color: '#1976d2', marginBottom: 8 }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1976d2' }}>{stats.totalSold}</div>
            <div style={{ color: '#666', fontWeight: 600 }}>Total Medicines Sold</div>
          </div>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 4px 16px rgba(25, 118, 210, 0.08)', textAlign: 'center' }}>
            <FaMoneyBillWave size={32} style={{ color: '#2e7d32', marginBottom: 8 }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2e7d32' }}>Rs. {stats.totalEarned.toLocaleString()}</div>
            <div style={{ color: '#666', fontWeight: 600 }}>Total Sales Amount</div>
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div style={{ margin: '24px 0 0 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={() => setShowSettings(v => !v)}
          className="main-action-btn"
          style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center' }}
        >
          <FaCog style={{ marginRight: 8 }} /> {showSettings ? 'Hide Application Settings' : 'Application Settings'}
        </button>

        {showSettings && (
          <div style={{ background: '#f8fafc', borderRadius: 16, padding: 24, marginTop: 8, width: '100%', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#1976d2', marginBottom: 16, fontSize: '1.3rem' }}>Display & View Preferences</h3>

            {/* Font Size Selector */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Font Size</h4>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={`main-action-btn ${settings.fontSize === 'small' ? '' : 'btn-light'}`}
                  style={{
                    background: settings.fontSize === 'small' ? '#1976d2' : '#e0e0e0',
                    color: settings.fontSize === 'small' ? '#fff' : '#1976d2',
                    flex: 1
                  }}
                  onClick={() => handleFontSizeChange('small')}
                >
                  <FaFont style={{ marginRight: 8, fontSize: '0.8em' }} /> Small
                </button>
                <button
                  className={`main-action-btn ${settings.fontSize === 'medium' ? '' : 'btn-light'}`}
                  style={{
                    background: settings.fontSize === 'medium' ? '#1976d2' : '#e0e0e0',
                    color: settings.fontSize === 'medium' ? '#fff' : '#1976d2',
                    flex: 1
                  }}
                  onClick={() => handleFontSizeChange('medium')}
                >
                  <FaFont style={{ marginRight: 8, fontSize: '1em' }} /> Medium
                </button>
                <button
                  className={`main-action-btn ${settings.fontSize === 'large' ? '' : 'btn-light'}`}
                  style={{
                    background: settings.fontSize === 'large' ? '#1976d2' : '#e0e0e0',
                    color: settings.fontSize === 'large' ? '#fff' : '#1976d2',
                    flex: 1
                  }}
                  onClick={() => handleFontSizeChange('large')}
                >
                  <FaFont style={{ marginRight: 8, fontSize: '1.2em' }} /> Large
                </button>
              </div>
            </div>

            {/* Bold Font Toggle */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Bold Text</h4>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={`main-action-btn ${settings.boldFont ? '' : 'btn-light'}`}
                  style={{ 
                    background: settings.boldFont ? '#1976d2' : '#e0e0e0',
                    color: settings.boldFont ? '#fff' : '#1976d2',
                    width: '100%'
                  }}
                  onClick={() => updateSettings({ boldFont: !settings.boldFont })}
                >
                  {settings.boldFont ? 'Use Normal Text' : 'Use Bold Text'}
                </button>
              </div>
            </div>

            {/* Price Visibility Settings - Admin Only */}
            {isAdmin && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginBottom: 10 }}>Price Visibility (Admin Only)</h4>
                <div style={{ marginBottom: 10 }}>
                  <button
                    key={`price-visibility-button-${refreshToggle}`}
                    className={`main-action-btn ${settings.showPrices ? '' : 'btn-light'}`}
                    style={{ 
                      background: settings.showPrices ? '#1976d2' : '#e0e0e0',
                      color: settings.showPrices ? '#fff' : '#1976d2',
                      width: '100%'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.blur();
                      setTimeout(() => {
                        handlePriceVisibilityChange(!settings.showPrices);
                      }, 0);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {settings.showPrices ? (
                      <><FaEye style={{ marginRight: 8 }} /> Show Prices to Clinic Workers</>
                    ) : (
                      <><FaEyeSlash style={{ marginRight: 8 }} /> Hide Prices from Clinic Workers</>
                    )}
                  </button>
                </div>

                {settings.showPrices && (
                  <div>
                    <p style={{ marginBottom: 10, fontSize: '0.9rem', color: '#666' }}>
                      Select clinics where medicine prices should be hidden:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {user && allClinics && allClinics.map((clinic, idx) => {
                        const clinicName = clinic.split(' (')[0];
                        const clinicsArray = Array.isArray(settings.clinicsHidePrices) ? settings.clinicsHidePrices : [];
                        const isHidden = clinicsArray.includes(clinicName);
                        return (
                          <button
                            key={`clinic-button-${idx}-${refreshToggle}`}
                            className="main-action-btn btn-light"
                            style={{ 
                              background: isHidden ? '#c62828' : '#e0e0e0',
                              color: isHidden ? '#fff' : '#333',
                              margin: '4px',
                              fontSize: '0.9rem'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.blur();
                              setTimeout(() => {
                                handleClinicPriceVisibility(clinicName);
                              }, 0);
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {clinicName} {isHidden ? <FaEyeSlash style={{ marginLeft: 4 }} /> : <FaEye style={{ marginLeft: 4 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Force Logout All Workers - Admin Only */}
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e0e0e0' }}>
                  <h4 style={{ marginBottom: 8, color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
                    <FaSignOutAlt style={{ marginRight: 8 }} /> Worker Session Management (Admin Only)
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: 12 }}>
                    Instantly log out all clinic workers across all devices and phones with a single click.
                  </p>
                  <button
                    type="button"
                    className="main-action-btn"
                    disabled={logoutWorkerLoading}
                    style={{
                      background: '#d32f2f',
                      color: '#ffffff',
                      width: '100%',
                      fontWeight: 'bold',
                      padding: '0.8rem 1rem'
                    }}
                    onClick={handleLogoutAllWorkers}
                  >
                    <FaSignOutAlt style={{ marginRight: 8 }} />
                    {logoutWorkerLoading ? 'Logging Out All Workers...' : 'Force Logout All Workers From All Devices'}
                  </button>
                  {logoutWorkerMessage && (
                    <div style={{ color: '#2e7d32', background: '#edf7ed', padding: '10px', borderRadius: '8px', marginTop: 10, fontWeight: 600, fontSize: '0.9rem' }}>
                      {logoutWorkerMessage}
                    </div>
                  )}
                  {logoutWorkerError && (
                    <div style={{ color: '#d32f2f', background: '#fdeded', padding: '10px', borderRadius: '8px', marginTop: 10, fontWeight: 600, fontSize: '0.9rem' }}>
                      {logoutWorkerError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password Reset Section */}
      <div style={{ margin: '32px 0 0 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => setShowReset(v => !v)} className="main-action-btn" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          <FaLock style={{ marginRight: 8 }} /> {showReset ? 'Cancel Password Reset' : 'Reset Password'}
        </button>
        {showReset && (
          <form onSubmit={handleResetPassword} style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginTop: 8 }}>
            <div className="input-group">
              <input
                type="password"
                placeholder="Current Password"
                value={resetForm.oldPassword}
                onChange={e => setResetForm(f => ({ ...f, oldPassword: e.target.value }))}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="New Password"
                value={resetForm.newPassword}
                onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm New Password"
                value={resetForm.confirmPassword}
                onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </div>
            {resetError && <div style={{ color: '#d32f2f', fontWeight: 600, marginBottom: 8 }}>{resetError}</div>}
            {resetSuccess && <div style={{ color: '#388e3c', fontWeight: 600, marginBottom: 8 }}>{resetSuccess}</div>}
            <button type="submit" className="main-action-btn" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16 }}>
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
