import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, getFontSizeValue, getStoredUser } from '../../utils';
import { fetchGlobalSettings, updateGlobalSettings } from '../../api';

// Debug function to see what's actually in localStorage
const debugSettings = () => {
  try {
    const raw = localStorage.getItem('appSettings');
    console.log('🔍 Raw localStorage appSettings:', raw);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('🔍 Parsed localStorage settings:', parsed);
    }
    
    const rawGlobal = localStorage.getItem('globalSettings');
    console.log('🔍 Raw localStorage globalSettings:', rawGlobal);
    if (rawGlobal) {
      const parsedGlobal = JSON.parse(rawGlobal);
      console.log('🔍 Parsed localStorage global settings:', parsedGlobal);
    }
  } catch (e) {
    console.error('Error debugging settings:', e);
  }
};

// Create context
const SettingsContext = createContext();

// Settings provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getAppSettings());
  const [initialized, setInitialized] = useState(false);
  const [lastGlobalFetch, setLastGlobalFetch] = useState(0);

  // Function to synchronize global settings with server
  const syncGlobalSettings = async (forceDirection = null) => {
    try {
      const user = getStoredUser();
      if (!user) return; // Not logged in
      
      console.log('🔄 Syncing global settings with server, direction:', forceDirection);
      
      // If we're an admin and the direction is not explicitly "fromServer",
      // we should prioritize pushing our changes to the server first
      if (user.role === 'admin' && forceDirection !== 'fromServer') {
        const localGlobalSettings = localStorage.getItem('globalSettings');
        
        if (localGlobalSettings) {
          const parsedLocalGlobal = JSON.parse(localGlobalSettings);
          
          // Send admin's global settings to server if they exist
          if (Object.keys(parsedLocalGlobal).length > 0) {
            console.log('🔄 Admin pushing global settings to server:', parsedLocalGlobal);
            await updateGlobalSettings(parsedLocalGlobal);
            console.log('🔄 Successfully pushed admin settings to server');
          }
        }
        
        // If we're explicitly only pushing to server, don't fetch back
        if (forceDirection === 'toServer') {
          setLastGlobalFetch(Date.now());
          return;
        }
      }
      
      // Only for non-admin users or explicit fromServer direction, fetch from server
      if (user.role !== 'admin' || forceDirection === 'fromServer') {
        console.log('🔄 Fetching global settings from server');
        const serverSettings = await fetchGlobalSettings();
        console.log('🔄 Received global settings from server:', serverSettings);
        
        if (serverSettings) {
          // For normal users, always use server settings
          // For admins, be more careful not to overwrite local changes
          if (user.role !== 'admin') {
            // Update localStorage with server values
            localStorage.setItem('globalSettings', JSON.stringify(serverSettings));
            
            // Refresh local settings from newly synced global settings
            setSettings(getAppSettings());
          } else {
            // For admins, merge carefully - prioritizing local changes
            const localGlobalSettings = localStorage.getItem('globalSettings');
            if (localGlobalSettings) {
              // We're an admin, so we prioritize our local changes and don't need to merge
              // Don't overwrite any local settings that the admin has changed
              console.log('🔄 Admin already has local settings, prioritizing those over server settings');
            } else {
              // No local settings, just use server settings
              localStorage.setItem('globalSettings', JSON.stringify(serverSettings));
            }
          }
        }
      }
      
      setLastGlobalFetch(Date.now());
    } catch (error) {
      console.error('Error syncing global settings:', error);
    }
  };

  useEffect(() => {
    // Load settings on mount
    setSettings(getAppSettings());
    
    // Sync with server on mount
    syncGlobalSettings();
    
    setInitialized(true);
    
    // Set up periodic sync (every 60 seconds)
    const syncInterval = setInterval(() => {
      syncGlobalSettings();
    }, 60000);
    
    return () => clearInterval(syncInterval);
  }, []);
  useEffect(() => {
    // Only save settings after initialization to prevent overriding with defaults
    if (initialized) {
      // Force values to be the correct types before saving
      let showPricesValue;
      if (settings.showPrices === true || settings.showPrices === "true" || settings.showPrices === 1) {
        showPricesValue = true;
      } else if (settings.showPrices === false || settings.showPrices === "false" || settings.showPrices === 0) {
        showPricesValue = false;
      } else {
        // Default to true for any other unexpected value
        showPricesValue = true;
      }
      
      const sanitizedSettings = {
        ...settings,
        fontSize: ['small', 'medium', 'large'].includes(settings.fontSize) ? settings.fontSize : 'medium',
        boldFont: Boolean(settings.boldFont),
        showPrices: showPricesValue,
        clinicsHidePrices: Array.isArray(settings.clinicsHidePrices) ? 
                          settings.clinicsHidePrices : []
      };
      
      // Save sanitized settings
      saveAppSettings(sanitizedSettings);
      
      // Apply font size to root element
      document.documentElement.style.fontSize = getFontSizeValue(settings.fontSize);
      
      // Apply bold font if enabled
      if (settings.boldFont) {
        document.body.classList.add('bold-font');
      } else {
        document.body.classList.remove('bold-font');
      }
      
      // Remove any dark theme classes that might be present
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
      
      // Update the settings state with sanitized values
      if (JSON.stringify(settings) !== JSON.stringify(sanitizedSettings)) {
        setSettings(sanitizedSettings);
      }
    }
  }, [settings, initialized]);

  // Update settings function
  const updateSettings = async (newSettings) => {
    debugSettings(); // Debug before update
    console.log('🔄 Updating settings with:', newSettings);
    
    // Create a local working copy to avoid mutating the input
    const workingCopy = { ...newSettings };
    
    // Handle specific cases for showPrices to ensure correct boolean conversion
    if ('showPrices' in workingCopy) {
      workingCopy.showPrices = workingCopy.showPrices === true || workingCopy.showPrices === 'true' || workingCopy.showPrices === 1;
      console.log('🔄 Normalized showPrices value:', workingCopy.showPrices);
    }
    
    // Special handling for clinicsHidePrices to ensure it's always an array
    if ('clinicsHidePrices' in workingCopy) {
      // Make sure it's a proper array
      if (!Array.isArray(workingCopy.clinicsHidePrices)) {
        workingCopy.clinicsHidePrices = [];
        console.log('🔄 Fixed clinicsHidePrices - was not an array');
      } else {
        // Make a deep copy to avoid reference issues
        workingCopy.clinicsHidePrices = [...workingCopy.clinicsHidePrices];
        console.log('🔄 Deep copied clinicsHidePrices:', workingCopy.clinicsHidePrices);
      }
    }
    
    // Important: Create a complete snapshot of the updated state before making changes
    // This ensures that what we save is exactly what we intend
    let finalUpdatedState;
    
    // Update state with new settings - using a callback to ensure we work with latest state
    setSettings(prev => {
      // Create a completely new object to avoid any reference issues
      const prevCopy = { ...prev };
      
      // If prev has clinicsHidePrices, make sure it's a completely new array
      if ('clinicsHidePrices' in prevCopy) {
        prevCopy.clinicsHidePrices = Array.isArray(prevCopy.clinicsHidePrices) 
          ? [...prevCopy.clinicsHidePrices] 
          : [];
      }
      
      // Create the final updated state by merging the copies
      finalUpdatedState = { ...prevCopy, ...workingCopy };
      console.log('🔄 Final updated state before saving:', finalUpdatedState);
      
      return finalUpdatedState;
    });
    
    // Important: Wait until state has been updated before saving
    // This ensures localStorage and state are synchronized
    setTimeout(() => {
      try {
        // Save to localStorage directly with the same state we just set
        saveAppSettings(finalUpdatedState);
        
        // Debug after update
        debugSettings();
        
        // Special handling for admin changes to global settings
        const user = getStoredUser();
        if (user?.role === 'admin' && 
            (workingCopy.hasOwnProperty('showPrices') || workingCopy.hasOwnProperty('clinicsHidePrices'))) {
          console.log('🔄 Admin changed global settings, syncing with server immediately');
          
          // Don't fetch from server right after making a change - this overwrites our changes
          // Instead, just push our changes to the server
          try {
            // Rather than reading from localStorage, which might have race conditions,
            // use our known good state that we just updated
            const globalSettings = {
              showPrices: finalUpdatedState.showPrices,
              clinicsHidePrices: Array.isArray(finalUpdatedState.clinicsHidePrices) 
                ? [...finalUpdatedState.clinicsHidePrices] 
                : []
            };
            
            console.log('🔄 Pushing global settings to server:', globalSettings);
            updateGlobalSettings(globalSettings)
              .then(() => console.log('🔄 Successfully pushed settings to server'))
              .catch(err => console.error('Error pushing settings to server:', err));
          } catch (err) {
            console.error('Error preparing settings for server push:', err);
          }
        }
      } catch (err) {
        console.error('Error in post-settings update:', err);
      }
    }, 50); // Small delay to ensure state update has completed
    
    return finalUpdatedState; // Return the new state for convenience
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSettings,
      syncGlobalSettings, // Expose the sync function to manually trigger syncs
      lastGlobalFetch    // For debugging, to know when the last sync happened
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
