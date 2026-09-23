// Helper function to get user data from storage
export const getStoredUser = () => {
  try {
    const localUser = localStorage.getItem('user');
    const localToken = localStorage.getItem('token');
    const expiry = localStorage.getItem('expiry');

    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Clear expired data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('expiry');
    } else if (localUser && localToken) {
      return JSON.parse(localUser);
    }

    // Check sessionStorage for session-only user
    const sessionUser = sessionStorage.getItem('user');
    const sessionToken = sessionStorage.getItem('token');
    if (sessionUser && sessionToken) {
      return JSON.parse(sessionUser);
    }

    // Fallback pair matching if user exists in one storage and token in another
    const fallbackUser = localUser || sessionUser;
    const fallbackToken = localToken || sessionToken;
    if (fallbackUser && fallbackToken) {
      return JSON.parse(fallbackUser);
    }

    return null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
};

// Helper function to get auth token
export const getStoredToken = () => {
  try {
    const localToken = localStorage.getItem('token');
    const localUser = localStorage.getItem('user');
    const expiry = localStorage.getItem('expiry');

    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('expiry');
    } else if (localToken && localUser) {
      return localToken;
    }

    const sessionToken = sessionStorage.getItem('token');
    const sessionUser = sessionStorage.getItem('user');
    if (sessionToken && sessionUser) {
      return sessionToken;
    }

    return localToken || sessionToken || null;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Settings management functions
export const getAppSettings = () => {
  try {
    const storedSettings = localStorage.getItem('appSettings');
    const globalSettings = localStorage.getItem('globalSettings');
    
    let mergedSettings = {};
    const defaults = {
      fontSize: 'medium',
      boldFont: false,
      showPrices: true,
      clinicsHidePrices: []
    };
    
    if (globalSettings) {
      try {
        const parsedGlobal = JSON.parse(globalSettings);
        mergedSettings = { ...defaults, ...parsedGlobal };
      } catch (e) {
        console.error('Error parsing global settings:', e);
        mergedSettings = { ...defaults };
      }
    } else {
      mergedSettings = { ...defaults };
    }
    
    if (storedSettings) {
      try {
        const parsedLocal = JSON.parse(storedSettings);
        if (parsedLocal.fontSize) mergedSettings.fontSize = parsedLocal.fontSize;
        if (typeof parsedLocal.boldFont === 'boolean') mergedSettings.boldFont = parsedLocal.boldFont;
      } catch (e) {
        console.error('Error parsing local settings:', e);
      }
    }
    
    return validateSettings(mergedSettings);
  } catch (error) {    
    console.error('Error getting app settings:', error);
    return {
      fontSize: 'medium',
      boldFont: false,
      showPrices: true,
      clinicsHidePrices: []
    };
  }
};

export const saveAppSettings = (settings) => {
  try {
    const validatedSettings = validateSettings(settings);
    const user = getStoredUser();
    const isAdmin = user && user.role === 'admin';
    
    const globalSettings = {};
    const localSettings = {};
    
    if (isAdmin) {
      if ('showPrices' in validatedSettings) {
        globalSettings.showPrices = validatedSettings.showPrices === true;
      }
      if ('clinicsHidePrices' in validatedSettings) {
        globalSettings.clinicsHidePrices = Array.isArray(validatedSettings.clinicsHidePrices) 
          ? [...validatedSettings.clinicsHidePrices] 
          : [];
      }
      if (Object.keys(globalSettings).length > 0) {
        try {
          const existingGlobalSettings = localStorage.getItem('globalSettings');
          let parsedGlobalSettings = {};
          if (existingGlobalSettings) {
            try {
              parsedGlobalSettings = JSON.parse(existingGlobalSettings);
            } catch (e) {
              parsedGlobalSettings = {};
            }
          }
          const updatedGlobalSettings = {
            ...parsedGlobalSettings,
            ...globalSettings
          };
          if ('clinicsHidePrices' in updatedGlobalSettings) {
            updatedGlobalSettings.clinicsHidePrices = Array.isArray(updatedGlobalSettings.clinicsHidePrices)
              ? [...updatedGlobalSettings.clinicsHidePrices]
              : [];
          }
          localStorage.setItem('globalSettings', JSON.stringify(updatedGlobalSettings));
        } catch (e) {
          console.error('Error saving global settings:', e);
        }
      }
    }
    
    if ('fontSize' in validatedSettings) {
      localSettings.fontSize = validatedSettings.fontSize;
    }
    if ('boldFont' in validatedSettings) {
      localSettings.boldFont = validatedSettings.boldFont === true;
    }
    
    if (Object.keys(localSettings).length > 0) {
      try {
        const existingLocalSettings = localStorage.getItem('appSettings');
        let parsedLocalSettings = {};
        if (existingLocalSettings) {
          try {
            parsedLocalSettings = JSON.parse(existingLocalSettings);
          } catch (e) {
            parsedLocalSettings = {};
          }
        }
        const updatedLocalSettings = {
          ...parsedLocalSettings,
          ...localSettings
        };
        localStorage.setItem('appSettings', JSON.stringify(updatedLocalSettings));
      } catch (e) {
        console.error('Error saving local settings:', e);
      }
    }
    
    return getAppSettings();
  } catch (error) {
    console.error('Error saving app settings:', error);
    return getAppSettings();
  }
};

export const validateSettings = (settings) => {
  const defaults = {
    fontSize: 'medium',
    boldFont: false,
    showPrices: true,
    clinicsHidePrices: []
  };
  
  if (!settings || typeof settings !== 'object') {
    return defaults;
  }
  
  const validated = { ...defaults };
  
  if (['small', 'medium', 'large'].includes(settings.fontSize)) {
    validated.fontSize = settings.fontSize;
  }
  
  if (typeof settings.boldFont === 'boolean') {
    validated.boldFont = settings.boldFont;
  }
  
  if (typeof settings.showPrices === 'boolean') {
    validated.showPrices = settings.showPrices;
  }
  
  if (Array.isArray(settings.clinicsHidePrices)) {
    validated.clinicsHidePrices = [...settings.clinicsHidePrices];
  }
  
  return validated;
};

export const getFontSizeValue = (size) => {
  switch (size) {
    case 'small': return '0.9rem';
    case 'large': return '1.1rem';
    case 'medium':
    default: return '1rem';
  }
};

// Calculate remaining days until expiry date
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If expiryDate is a string in YYYY-MM-DD format (or ISO string starting with YYYY-MM-DD),
  // extract year, month, day directly to avoid any timezone shifts
  let year, month, day;
  if (typeof expiryDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(expiryDate)) {
    const parts = expiryDate.substring(0, 10).split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    year = exp.getFullYear();
    month = exp.getMonth();
    day = exp.getDate();
  }

  const expDate = new Date(year, month, day);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// Format expiry date with days left or expired status
export const formatExpiryDate = (expiryDate) => {
  if (!expiryDate) return '-';
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return '-';

  // Format date as DD/MM/YYYY
  let formattedDate;
  if (typeof expiryDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(expiryDate)) {
    const [y, m, d] = expiryDate.substring(0, 10).split('-');
    formattedDate = `${d}/${m}/${y}`;
  } else {
    formattedDate = exp.toLocaleDateString('en-GB');
  }

  const daysLeft = getDaysUntilExpiry(expiryDate);
  if (daysLeft === null) return formattedDate;

  if (daysLeft < 0) {
    return `${formattedDate} (Expired)`;
  }
  if (daysLeft === 0) {
    return `${formattedDate} (Expires today)`;
  }
  if (daysLeft === 1) {
    return `${formattedDate} (1 day left)`;
  }
  return `${formattedDate} (${daysLeft} days left)`;
};

// Check if a medicine is expiring soon (default: within 90 days, or already expired)
export const isExpiringSoon = (expiryDate, thresholdDays = 90) => {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  return daysLeft !== null && daysLeft <= thresholdDays;
};

