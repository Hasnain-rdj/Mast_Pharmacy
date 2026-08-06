const express = require('express');
const GlobalSetting = require('../models/GlobalSetting');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all global settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await GlobalSetting.find().select('-updatedBy');
    
    // Convert array of settings to an object
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    res.json(settingsObject);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update global setting (admin only)
router.put('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Invalid settings object' });
    }
    
    // Process each setting
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      await GlobalSetting.findOneAndUpdate(
        { key },
        { 
          key, 
          value,
          updatedBy: req.user.userId
        },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get specific setting
router.get('/:key', verifyToken, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await GlobalSetting.findOne({ key }).select('-updatedBy');
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({ key: setting.key, value: setting.value });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
