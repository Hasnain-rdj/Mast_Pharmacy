import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { FaUserCircle, FaClinicMedical, FaEnvelope, FaPills, FaMoneyBillWave, FaChartBar, FaLock, FaCog, FaFont, FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa';
import { useSettings } from './context/SettingsContext';
import { getStoredUser } from '../utils';
import './Auth.css';

const Profile = () => {
  const navigate = useNavigate();
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
    // Update profile form when user data is available
    if (user && !profileForm.name) {
      setProfileForm({ name: user.name || '', profilePic: user.profilePic || '/logo192.png' });
      setProfilePic(user.profilePic || '/logo192.png');
    }
  }, [user, profileForm.name]);

  // Fetch all clinics (for admin price visibility settings)
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
  }, [user?.email]); // Only depend on user.email
  const handlePicChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();reader.onload = (ev) => {
        // Create an image element for compression
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 500px width/height)
          let width = img.width;
          let height = img.height;
          if (width > height && width > 500) {
            height = Math.round((height * 500) / width);
            width = 500;
          } else if (height > 500) {
            width = Math.round((width * 500) / height);
            height = 500;
          }
          
          // Set canvas dimensions and draw image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get compressed image data
          const newProfilePic = canvas.toDataURL('image/jpeg', 0.8);          // Upload the compressed image
          API.put('/api/auth/update-profile', {
            email: user.email,
            name: user.name,
            profilePic: newProfilePic
          })
          .then((response) => {
            const updatedUser = response.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setProfilePic(updatedUser.profilePic);
            setProfileForm(f => ({...f, profilePic: updatedUser.profilePic}));
            setProfileError('');
          })
          .catch(err => {
            setProfileError(err.response?.data?.message || 'Failed to update profile picture');
          });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Password reset handler
  const handleResetPassword = async e => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!resetForm.oldPassword || !resetForm.newPassword || !resetForm.confirmPassword) {
      setResetError('All fields are required.');
      return;
    }
    if (resetForm.newPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    try {
      await API.post('/api/auth/reset-password', {
        email: user.email,
        oldPassword: resetForm.oldPassword,
        newPassword: resetForm.newPassword
      });
      setResetSuccess('Password updated successfully!');
      setShowReset(false);
      setResetForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  // Profile update handler
  const handleProfileUpdate = async e => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    if (!profileForm.name.trim()) {
      setProfileError('Name is required.');
      return;
    }
    try {      const response = await API.put('/api/auth/update-profile', {
        email: user.email,
        name: profileForm.name,
        profilePic: profileForm.profilePic
      });
      const updatedUser = response.data.user;
      setProfileSuccess('Profile updated successfully!');
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfilePic(updatedUser.profilePic);
      setEditProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    }
  };
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  if (!user) return null;
  const isAdmin = user.role === 'admin';
  // Get settings context
  // const { settings, updateSettings } = useSettings();
  // State for settings section
  // const [showSettings, setShowSettings] = useState(false);
  // Handle font size change
  const handleFontSizeChange = (fontSize) => {
    updateSettings({ fontSize });
  };

  // Handle price visibility change
  const handlePriceVisibilityChange = async (showPrices) => {
    try {
      // First, force a state update immediately to reflect the UI change
      setRefreshToggle(prev => {
        console.log('💡 Immediate UI refresh for price visibility');
        return prev + 1;
      });
      
      // Ensure showPrices is a strict boolean
      console.log('💡 Setting price visibility to:', showPrices);
      
      // Use direct boolean value rather than relying on Boolean() conversion
      const value = showPrices === true;
      console.log('💡 Normalized value:', value);
      
      // Store the target state for verification
      const targetState = value;
      console.log(`🎯 Target showPrices state: ${targetState}`);
      
      // Save to localStorage first for immediate effect
      const updatedSettings = { ...settings, showPrices: value };
      localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      
      // Update settings with the normalized boolean value - this is synchronous in memory
      updateSettings({ showPrices: value });
      
      // Force another refresh to ensure UI consistency
      setRefreshToggle(prev => prev + 1);
      
      // Add a delay before syncing to server
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sync global settings to server
      await syncGlobalSettings('toServer');
      
      // Check if our change was properly applied
      const globalStoredRaw = localStorage.getItem('globalSettings');
      if (globalStoredRaw) {
        try {
          const globalStored = JSON.parse(globalStoredRaw);
          console.log(`🔍 Verification: showPrices is now ${globalStored.showPrices}, expected ${targetState}`);
          
          // If there's a mismatch, force update again
          if (globalStored.showPrices !== targetState) {
            console.log('⚠️ State mismatch detected for showPrices, forcing update');
            updateSettings({ showPrices: targetState });
            
            // One more sync to be sure
            await syncGlobalSettings('toServer');
          }
        } catch (e) {
          console.error('Error parsing global settings during verification:', e);
        }
      }
      
      // Final rerender to ensure UI consistency
      setRefreshToggle(prev => {
        console.log('💡 Final rerender for price visibility change');
        return prev + 1;
      });
    } catch (err) {
      console.error('Error in handlePriceVisibilityChange:', err);
    }
  };

  // Handle price visibility for specific clinic
  const handleClinicPriceVisibility = async (clinicName) => {
    try {
      // First, force a state update immediately to reflect the UI change without waiting for server
      setRefreshToggle(prev => {
        console.log('🔄 Immediate UI refresh to prevent flickering');
        return prev + 1;
      });
      
      // Create a proper copy of the current array to avoid reference issues
      const currentClinicsHidePrices = Array.isArray(settings.clinicsHidePrices) 
        ? [...settings.clinicsHidePrices] 
        : [];
      
      console.log('🔄 Before toggle, clinicsHidePrices:', currentClinicsHidePrices);
      
      // Determine new state - is the clinic currently hidden?
      const isCurrentlyHidden = currentClinicsHidePrices.includes(clinicName);
      console.log(`🔄 Clinic "${clinicName}" is currently hidden:`, isCurrentlyHidden);
      
      // Create a new array (important for proper state updates)
      let updatedClinicsHidePrices;
      if (isCurrentlyHidden) {
        // Remove clinic from list (show prices)
        updatedClinicsHidePrices = currentClinicsHidePrices.filter(c => c !== clinicName);
        console.log(`🔄 Removed ${clinicName} from hidden clinics list`);
      } else {
        // Add clinic to list (hide prices)
        updatedClinicsHidePrices = [...currentClinicsHidePrices, clinicName];
        console.log(`🔄 Added ${clinicName} to hidden clinics list`);
      }
      
      console.log('🔄 After toggle, clinicsHidePrices:', updatedClinicsHidePrices);
      
      // Save the updated settings to local storage first to prevent race conditions
      const updatedSettings = { ...settings, clinicsHidePrices: updatedClinicsHidePrices };
      localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      
      // Store a snapshot of the actual target state to verify correct application
      const targetState = !isCurrentlyHidden;
      console.log(`🎯 Target state for ${clinicName}: isHidden=${targetState}`);
      
      // Update settings with the new array - this is synchronous in memory
      updateSettings({ 
        clinicsHidePrices: updatedClinicsHidePrices 
      });
      
      // Force another state refresh to ensure UI is consistent
      setRefreshToggle(prev => prev + 1);
      
      // Add a delay before syncing to server to ensure local state is stable
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force sync to server only (don't fetch back) to avoid race conditions
      await syncGlobalSettings('toServer');
      
      // Check if our change was properly applied to localStorage
      const globalStoredRaw = localStorage.getItem('globalSettings');
      if (globalStoredRaw) {
        try {
          const globalStored = JSON.parse(globalStoredRaw);
          const currentHidden = Array.isArray(globalStored.clinicsHidePrices) && 
                               globalStored.clinicsHidePrices.includes(clinicName);
          console.log(`🔍 Verification: ${clinicName} hidden status is now ${currentHidden}, expected ${targetState}`);
          
          // If there's a mismatch, force update again
          if (currentHidden !== targetState) {
            console.log('⚠️ State mismatch detected, forcing update');
            if (targetState) {
              // Should be hidden but isn't
              const fixedArray = [...(globalStored.clinicsHidePrices || []), clinicName];
              updateSettings({ clinicsHidePrices: fixedArray });
            } else {
              // Should be visible but isn't
              const fixedArray = (globalStored.clinicsHidePrices || []).filter(c => c !== clinicName);
              updateSettings({ clinicsHidePrices: fixedArray });
            }
            
            // One more sync to be sure
            await syncGlobalSettings('toServer');
          }
        } catch (e) {
          console.error('Error parsing global settings during verification:', e);
        }
      }
      
      // Force a final rerender by incrementing our refreshToggle
      setRefreshToggle(prev => {
        console.log('🔄 Final rerender to ensure UI consistency');
        return prev + 1;
      });
    } catch (err) {
      console.error('Error in handleClinicPriceVisibility:', err);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: 500, width: '100%', marginTop: '90px', zIndex: 1 }}>
      <h2 style={{ color: '#1976d2', fontWeight: 800, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FaUserCircle /> Profile
      </h2><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 24 }}><div onClick={() => fileInput.current.click()} style={{ cursor: 'pointer' }}>
          <img
            src={profilePic}
            alt="Profile"
            style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid #1976d2', objectFit: 'cover' }}
          />
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInput}
          style={{ display: 'none' }}
          onChange={handlePicChange}
        />
        {profileError && <div style={{ color: '#d32f2f', fontWeight: 600 }}>{profileError}</div>}
        {profileSuccess && <div style={{ color: '#388e3c', fontWeight: 600 }}>{profileSuccess}</div>}
        <button onClick={() => setEditProfile(true)} className="main-action-btn" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          Edit Profile
        </button>
        {editProfile && (
          <form onSubmit={handleProfileUpdate} style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginTop: 8, width: '100%' }}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Name"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}              required
              />
            </div>
            <button type="submit" className="main-action-btn"style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16 }}>
              Save Changes
            </button>
            <button type="button" className="main-action-btn" style={{ background: '#e0e0e0', color: '#1976d2', fontWeight: 700, fontSize: 16, marginLeft: 10 }} onClick={() => { setEditProfile(false); setProfileError(''); setProfileSuccess(''); setProfileForm({ name: user.name, profilePic }); }}>
              Cancel
            </button>
          </form>
        )}
      </div>
      <div style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginBottom: 24, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <FaUserCircle style={{ color: '#1976d2' }} /> <b>Name:</b> {user.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <FaEnvelope style={{ color: '#1976d2' }} /> <b>Email:</b> {user.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <FaClinicMedical style={{ color: '#1976d2' }} /> <b>Clinic:</b> {user.clinic || 'Main Clinic'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaPills style={{ color: '#1976d2' }} /> <b>Role:</b> {user.role}
        </div>
      </div>
      {!isAdmin && (
        <div style={{ background: '#e3eaf2', borderRadius: 12, padding: 18, width: '100%' }}>
          <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaChartBar /> Analytics
          </h3>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <FaPills style={{ color: '#1976d2', fontSize: 28 }} />
              <div style={{ fontWeight: 700, fontSize: 22 }}>{stats.totalSold}</div>
              <div style={{ color: '#555', fontWeight: 500 }}>Medicines Sold</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <FaMoneyBillWave style={{ color: '#1976d2', fontSize: 28 }} />
              <div style={{ fontWeight: 700, fontSize: 22 }}>{stats.totalEarned}</div>
              <div style={{ color: '#555', fontWeight: 500 }}>Total Earned</div>
            </div>
          </div>
        </div>      )}      {/* Settings Section */}
      <div style={{ margin: '32px 0 0 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button 
          onClick={() => setShowSettings(v => !v)} 
          className="main-action-btn" 
          style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}
        >
          <FaCog style={{ marginRight: 8 }} /> {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
        
        {showSettings && (
          <div style={{ background: '#f3f6fa', borderRadius: 12, padding: 18, marginTop: 8, width: '100%' }}>
            <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaCog /> Application Settings
            </h3>            {/* Font Size Selection */}
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
                  <FaFont style={{ marginRight: 8 }} /> Medium
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
            </div>            {/* Bold Font Toggle */}
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
                    {/* Add ALL clinics option at the top */}
                    <div style={{ marginBottom: 10 }}>
                      <button
                        key={`all-clinics-button-${refreshToggle}`}
                        className="main-action-btn"
                        style={{
                          background: '#1976d2',
                          color: '#ffffff',
                          margin: '4px',
                          fontSize: '0.95rem',
                          fontWeight: 'bold'
                        }}
                        onClick={async (e) => {
                          // Prevent default to avoid losing focus
                          e.preventDefault();
                          e.stopPropagation();
                          // Force button to maintain focus to prevent visual flickering
                          e.currentTarget.blur();
                          
                          // First, force an immediate UI update to prevent flickering
                          setRefreshToggle(prev => prev + 1);
                          
                          // Use setTimeout to ensure the click event finishes completely before proceeding
                          setTimeout(async () => {
                            try {
                              // Toggle all clinics at once
                              const currentClinicsHidePrices = Array.isArray(settings.clinicsHidePrices) 
                                ? [...settings.clinicsHidePrices] 
                                : [];
                              
                              console.log('🔄 Before ALL toggle, clinicsHidePrices:', currentClinicsHidePrices);
                              
                              // Check if all clinics are currently hidden
                              const allClinicNames = allClinics.map(c => c.split(' (')[0]);
                              const allHidden = allClinicNames.length > 0 && 
                                allClinicNames.every(clinic => currentClinicsHidePrices.includes(clinic));
                              
                              // Store the target state for later verification
                              const targetState = !allHidden;
                              console.log(`🎯 Target ALL state: ${targetState ? 'hidden' : 'visible'}`);
                              
                              // Prepare the new state
                              let newClinicsHidePrices;
                              if (allHidden) {
                                // If all are hidden, show all
                                console.log('🔄 Showing ALL clinics');
                                newClinicsHidePrices = [];
                              } else {
                                // Otherwise hide all
                                console.log('🔄 Hiding ALL clinics');
                                newClinicsHidePrices = [...allClinicNames];
                              }
                              
                              // Save to local storage first for immediate effect
                              const updatedSettings = { ...settings, clinicsHidePrices: newClinicsHidePrices };
                              localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
                              
                              // Update settings - this updates the state synchronously
                              updateSettings({ clinicsHidePrices: newClinicsHidePrices });
                              
                              // Force another refresh to ensure UI consistency
                              setRefreshToggle(prev => prev + 1);
                              
                              // Add a delay before syncing to server to ensure local state is stable
                              await new Promise(resolve => setTimeout(resolve, 500));
                              
                              // Force sync global settings to server immediately - only push, don't fetch back
                              await syncGlobalSettings('toServer');
                              
                              // Final force rerender to ensure UI is consistent
                              setRefreshToggle(prev => {
                                console.log('🔄 Final rerender for ALL clinics toggle');
                                return prev + 1;
                              });
                            } catch (err) {
                              console.error('Error in ALL toggle:', err);
                            }
                          }, 0);
                        }}
                        // Disable default focus behavior that might cause visual issues
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        ALL CLINICS {(() => {
                          const allClinicNames = allClinics.map(c => c.split(' (')[0]);
                          const allHidden = allClinicNames.length > 0 && 
                            allClinicNames.every(clinic => 
                              Array.isArray(settings.clinicsHidePrices) && 
                              settings.clinicsHidePrices.includes(clinic)
                            );
                          
                          console.log(`Rendering ALL CLINICS button, allHidden: ${allHidden}, refreshToggle: ${refreshToggle}`);
                          
                          return allHidden ? 
                            <><FaEye style={{ marginLeft: 4 }} /> (Show All)</> : 
                            <><FaEyeSlash style={{ marginLeft: 4 }} /> (Hide All)</>;
                        })()}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {user && allClinics && allClinics.map((clinic, idx) => {
                        const clinicName = clinic.split(' (')[0];
                        // More robust check to avoid undefined errors
                        const clinicsArray = Array.isArray(settings.clinicsHidePrices) ? settings.clinicsHidePrices : [];
                        const isHidden = clinicsArray.includes(clinicName);
                        console.log(`Rendering clinic button: ${clinicName}, isHidden: ${isHidden}, refreshToggle: ${refreshToggle}`);
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
                              // Stop all propagation and prevent default behavior
                              e.preventDefault();
                              e.stopPropagation();
                              // Force button to maintain focus to prevent visual flickering
                              e.currentTarget.blur();
                              // Use setTimeout to ensure the click event finishes completely
                              setTimeout(() => {
                                handleClinicPriceVisibility(clinicName);
                              }, 0);
                            }}
                            // Disable default focus behavior that might cause visual issues
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
