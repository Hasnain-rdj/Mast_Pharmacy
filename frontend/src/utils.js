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
    // First check for local overrides (user preferences for font size, etc.)
    const storedSettings = localStorage.getItem('appSettings');
    
    // Global settings (from server) take precedence over local for shared settings
    const globalSettings = localStorage.getItem('globalSettings');
    
    let mergedSettings = {};
    
    // Start with default settings
    const defaults = {
      fontSize: 'medium', // small, medium, large
      boldFont: false, // Bold all text in application
      showPrices: true, // Show medicine prices to clinic workers
      clinicsHidePrices: [] // Array of clinic names where prices should be hidden
    };
    
    // Add global settings if available (admin-controlled shared settings)
    if (globalSettings) {
      try {
        const parsedGlobal = JSON.parse(globalSettings);
        mergedSettings = { ...defaults, ...parsedGlobal };
        console.log('⚙️ Loaded global settings from localStorage:', parsedGlobal);
      } catch (e) {
        console.error('Error parsing global settings:', e);
        mergedSettings = { ...defaults };
      }
    } else {
      mergedSettings = { ...defaults };
    }
    
    // Add local user preference overrides
    if (storedSettings) {
      try {
        const parsedLocal = JSON.parse(storedSettings);
        
        // Only user preferences can override local settings
        // Font size and boldFont are user preferences
        if (parsedLocal.fontSize) mergedSettings.fontSize = parsedLocal.fontSize;
        if (typeof parsedLocal.boldFont === 'boolean') mergedSettings.boldFont = parsedLocal.boldFont;
        
        console.log('⚙️ Merged with local settings:', parsedLocal);
      } catch (e) {
        console.error('Error parsing local settings:', e);
      }
    }
    
    // Validate and sanitize merged settings
    const validated = validateSettings(mergedSettings);
    
    return validated;
  } catch (error) {    
    console.error('Error getting app settings:', error);
    
    // Use emergency defaults in case of error
    return {
      fontSize: 'medium',
      boldFont: false,
      showPrices: true, // Always true in case of error
      clinicsHidePrices: []
    };
  }
};

export const saveAppSettings = (settings) => {
  try {
    // Validate settings before saving
    const validatedSettings = validateSettings(settings);
    
    const user = getStoredUser();
    const isAdmin = user && user.role === 'admin';
    
    // Log what we're about to save
    console.log('⚙️ Saving validated settings:', validatedSettings);
    console.log('⚙️ User is admin:', isAdmin);
    
    // Split settings into global and local
    const globalSettings = {};
    const localSettings = {};
    
    // Admin controls global settings
    if (isAdmin) {
      // These settings are controlled by admin and shared across all users
      if ('showPrices' in validatedSettings) {
        globalSettings.showPrices = validatedSettings.showPrices === true;
      }
      
      if ('clinicsHidePrices' in validatedSettings) {
        // Deep copy the array to avoid reference issues
        globalSettings.clinicsHidePrices = Array.isArray(validatedSettings.clinicsHidePrices) 
          ? [...validatedSettings.clinicsHidePrices] 
          : [];
      }
      
      // Save global settings to localStorage with careful handling
      if (Object.keys(globalSettings).length > 0) {
        try {
          // Get existing global settings or create empty object
          const existingGlobalSettings = localStorage.getItem('globalSettings');
          let parsedGlobalSettings = {};
          
          if (existingGlobalSettings) {
            try {
              parsedGlobalSettings = JSON.parse(existingGlobalSettings);
            } catch (e) {
              console.error('Error parsing existing global settings:', e);
              // Continue with empty object if parsing failed
              parsedGlobalSettings = {};
            }
          }
          
          // Create a completely new object with spread operators to avoid reference issues
          const updatedGlobalSettings = {
            ...parsedGlobalSettings,
            ...globalSettings
          };
          
          // Handle clinicsHidePrices specially to ensure it's a fresh array
          if ('clinicsHidePrices' in updatedGlobalSettings) {
            updatedGlobalSettings.clinicsHidePrices = Array.isArray(updatedGlobalSettings.clinicsHidePrices)
              ? [...updatedGlobalSettings.clinicsHidePrices]
              : [];
          }
          
          // Debug the actual state we're about to save
          console.log('⚙️ Final global settings to save:', JSON.stringify(updatedGlobalSettings));
          
          // Save to localStorage
          localStorage.setItem('globalSettings', JSON.stringify(updatedGlobalSettings));
          console.log('⚙️ Updated global settings in localStorage');
        } catch (e) {
          console.error('Error saving global settings:', e);
        }
      }
    }
    
    // These settings are always user preferences
    if ('fontSize' in validatedSettings) {
      localSettings.fontSize = validatedSettings.fontSize;
    }
    
    if ('boldFont' in validatedSettings) {
      localSettings.boldFont = validatedSettings.boldFont === true;
    }
    
    // Save local settings with careful handling
    if (Object.keys(localSettings).length > 0) {
      try {
        // Get existing local settings or create empty object
        const existingLocalSettings = localStorage.getItem('appSettings');
        let parsedLocalSettings = {};
        
        if (existingLocalSettings) {
          try {
            parsedLocalSettings = JSON.parse(existingLocalSettings);
          } catch (e) {
            console.error('Error parsing existing local settings:', e);
            // Continue with empty object if parsing failed
            parsedLocalSettings = {};
          }
        }
        
        // Create a completely new object to avoid reference issues
        const updatedLocalSettings = {
          ...parsedLocalSettings,
          ...localSettings
        };
        
        // Save to localStorage
        localStorage.setItem('appSettings', JSON.stringify(updatedLocalSettings));
        console.log('⚙️ Updated local settings in localStorage:', updatedLocalSettings);
      } catch (e) {
        console.error('Error saving local settings:', e);
      }
    }
    
    // Force a localStorage sync to make sure changes are persisted immediately
    try {
      localStorage.getItem('test');
    } catch (e) {
      console.error('Error forcing localStorage sync:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Get font size in pixels based on setting
export const getFontSizeValue = (setting) => {
  switch (setting) {
    case 'small':
      return '14px';
    case 'large':
      return '18px';
    case 'medium':
    default:
      return '16px';
  }
};

// Helper to check if prices should be shown for a specific clinic
export const shouldShowPrices = (clinicName) => {
  const user = getStoredUser();
  const settings = getAppSettings();
  
  // Admin always sees prices regardless of settings
  if (user && user.role === 'admin') return true;
  
  // For clinic workers, check both global setting and clinic-specific setting
  if (!settings.showPrices) return false;
  
  // For safety, ensure clinicsHidePrices exists and is an array
  const hiddenClinics = Array.isArray(settings.clinicsHidePrices) ? 
                        settings.clinicsHidePrices : [];
  
  return !hiddenClinics.includes(clinicName);
};

// Helper function to ensure settings are valid
export const validateSettings = (settings) => {
  console.log('🔎 Validating settings:', settings);
  
  const defaultSettings = {
    fontSize: 'medium',
    boldFont: false,
    showPrices: true,
    clinicsHidePrices: []
  };
  
  // Check for null or undefined settings
  if (!settings) {
    console.log('🔎 Settings null or undefined, returning defaults');
    return defaultSettings;
  }
  
  // Force showPrices to be a strict boolean value
  let showPricesValue;
  if (settings.showPrices === true || settings.showPrices === "true" || settings.showPrices === 1) {
    showPricesValue = true;
    console.log('🔎 showPrices normalized to TRUE');
  } else if (settings.showPrices === false || settings.showPrices === "false" || settings.showPrices === 0) {
    showPricesValue = false;
    console.log('🔎 showPrices normalized to FALSE');
  } else {
    // Default to true for any other unexpected value
    showPricesValue = true;
    console.log('🔎 showPrices defaulting to TRUE due to unexpected value:', settings.showPrices);
  }
  
  // Handle clinicsHidePrices specially
  let clinicsHidePrices = [];
  if (Array.isArray(settings.clinicsHidePrices)) {
    // Filter out any non-string values
    clinicsHidePrices = settings.clinicsHidePrices.filter(clinic => typeof clinic === 'string');
    console.log('🔎 Filtered clinicsHidePrices:', clinicsHidePrices);
  } else {
    console.log('🔎 clinicsHidePrices is not an array, using default');
    clinicsHidePrices = defaultSettings.clinicsHidePrices;
  }
  
  // Ensure each setting has the correct type
  const validatedSettings = {
    fontSize: ['small', 'medium', 'large'].includes(settings.fontSize) ? 
              settings.fontSize : defaultSettings.fontSize,
    boldFont: typeof settings.boldFont === 'boolean' ? 
              settings.boldFont : Boolean(settings.boldFont),
    showPrices: showPricesValue,
    clinicsHidePrices: clinicsHidePrices
  };
  
  console.log('🔎 Validation result:', validatedSettings);
  return validatedSettings;
};
