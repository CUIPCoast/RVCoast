// victronRoutes.js - Updated with grid endpoints
const express = require('express');
const router = express.Router();
const victronService = require('./victronModbusService');

// Middleware to ensure Victron service is connected
const ensureVictronConnected = async (req, res, next) => {
  if (!victronService.connected && !victronService.simulationEnabled) {
    try {
      await victronService.connect();
    } catch (error) {
      console.error('Failed to connect to Victron service:', error);
      // Continue anyway - we'll return an error if needed
    }
  }
  next();
};

// Get all data in a single request
router.get('/all', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getAllData();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get battery data
router.get('/battery', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getBatteryStatus();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get PV charger data
router.get('/pv', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getPVCharger();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get AC loads data
router.get('/ac-loads', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getACLoads();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get DC system data
router.get('/dc-system', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getDCSystem();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get grid data - new endpoint
router.get('/grid', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getGrid();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get system overview
router.get('/system', ensureVictronConnected, (req, res) => {
  try {
    const data = victronService.getSystemOverview();
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get API status
router.get('/status', (req, res) => {
  try {
    const data = {
      apiStatus: victronService.getApiStatus(),
      config: victronService.getConfiguration()
    };
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Toggle simulation mode
router.post('/simulation', (req, res) => {
  try {
    const { enabled } = req.body;
    const simulationEnabled = victronService.toggleSimulation(enabled);
    res.json({ 
      status: 'success', 
      message: `Simulation mode ${simulationEnabled ? 'enabled' : 'disabled'}`,
      simulationEnabled 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update configuration
router.post('/config', (req, res) => {
  try {
    const success = victronService.updateConfiguration(req.body);
    const updatedConfig = victronService.getConfiguration();
    res.json({ 
      status: success ? 'success' : 'error', 
      message: success ? 'Configuration updated' : 'Failed to update configuration',
      config: updatedConfig
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Reconnect to Victron system
router.post('/reconnect', async (req, res) => {
  try {
    await victronService.disconnect();
    const success = await victronService.connect();
    res.json({ 
      status: success ? 'success' : 'error', 
      message: success ? 'Reconnected successfully' : 'Failed to reconnect',
      connected: victronService.connected
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Run diagnostics
router.get('/diagnostics', async (req, res) => {
  try {
    const diagnosticResults = await victronService.runDiagnostics();
    res.json({ 
      status: 'success', 
      data: diagnosticResults
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;