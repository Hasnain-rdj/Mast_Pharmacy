# Mast Pharmacy Settings Feature

This document outlines the new settings features added to the Mast Pharmacy application.

## Features Added

### 1. User Preferences
Users can now personalize their experience through the Profile page settings:

- **Font Size**: Choose between Small, Medium, and Large font sizes to improve readability
- **Bold Text**: Option to make all text in the application bold for better visibility
- **Price Visibility**: Controls whether medicine prices are shown to clinic workers

### 2. Admin Controls
Admin users have additional settings:

- **Clinic-Specific Price Visibility**: Admins can choose which clinics can view medicine prices

## How to Use

1. **Access Settings**:
   - Login to your account
   - Navigate to the Profile page
   - Click the "Settings" button

2. **Font Size**:
   - Select "Small", "Medium", or "Large" to adjust the application font size
   - Changes apply immediately throughout the entire application

3. **Bold Text**:
   - Toggle "Use Bold Text" to make all text in the application bold
   - This can help improve visibility and readability for users with visual impairments
   - Changes apply immediately throughout the entire application

4. **Price Visibility** (Admin only):
   - Toggle "Show Prices to Clinic Workers" to globally enable/disable price visibility
   - When enabled, use the clinic buttons below to control visibility for specific clinics
   - Use the "ALL CLINICS" button to quickly show or hide prices for all clinics at once
   - Clinics shown in red have prices hidden
   - Admin users will always see prices regardless of these settings

## Technical Implementation

The settings system uses:

- Local storage to persist user preferences
- React Context API to manage settings state globally
- CSS variables for font size implementation

Settings affect various components including:
- `ClinicInventory.js` - Controls price column visibility
- `SalesEntryInline.js` - Controls price visibility in medicine selection
- Global styling through CSS for font size

## Additional Notes

- Settings are stored per browser, not per account
- Font size changes may require page refresh in some browsers to fully apply
