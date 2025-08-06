// victronRoutes.js
// REST API routes for Victron Energy data

const express = require('express');
const router = express.Router();
const victronService = require('./victronModbusService');

// Initialize connection when server starts
(async () => {
  try {
    // Try to connect to the Victron system
    const connected = await victronService.connect();
    if (!connected) {
      console.log('Failed to connect to Victron system, enabling simulation mode');
      victronService.toggleSimulation(true);
    }
  } catch (error) {
    console.error('Error initializing Victron connection:', error);
    victronService.toggleSimulation(true);
  }
})();

// Get all Victron data
router.get('/all', async (req, res) => {
  try {
    const data = victronService.getAllData();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get Victron data',
      error: error.message
    });
  }
});

// Get battery status
router.get('/battery', async (req, res) => {
  try {
    const data = victronService.getBatteryStatus();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get battery data',
      error: error.message
    });
  }
});

// Get solar/PV charger information
router.get('/pv', async (req, res) => {
  try {
    const data = victronService.getPVCharger();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get PV charger data',
      error: error.message
    });
  }
});

// Get AC loads
router.get('/ac-loads', async (req, res) => {
  try {
    const data = victronService.getACLoads();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get AC loads data',
      error: error.message
    });
  }
});

// Get DC system information
router.get('/dc-system', async (req, res) => {
  try {
    const data = victronService.getDCSystem();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get DC system data',
      error: error.message
    });
  }
});

// Get system overview
router.get('/system', async (req, res) => {
  try {
    const data = victronService.getSystemOverview();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system overview',
      error: error.message
    });
  }
});

// Get API status
router.get('/status', async (req, res) => {
  try {
    const status = victronService.getApiStatus();
    const config = victronService.getConfiguration();
    
    res.json({
      status: 'success',
      apiStatus: status,
      configuration: config
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get API status',
      error: error.message
    });
  }
});

// Toggle simulation mode
router.post('/simulation', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Enabled parameter is required'
      });
    }
    
    const simulationStatus = victronService.toggleSimulation(enabled);
    
    res.json({
      status: 'success',
      simulationEnabled: simulationStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle simulation mode',
      error: error.message
    });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const newConfig = req.body;
    
    if (!newConfig || Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No configuration parameters provided'
      });
    }
    
    const success = victronService.updateConfiguration(newConfig);
    const currentConfig = victronService.getConfiguration();
    
    res.json({
      status: 'success',
      message: 'Configuration updated',
      configuration: currentConfig
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update configuration',
      error: error.message
    });
  }
});

// Reconnect to Victron system
router.post('/reconnect', async (req, res) => {
  try {
    await victronService.disconnect();
    const connected = await victronService.connect();
    
    if (connected) {
      res.json({
        status: 'success',
        message: 'Successfully reconnected to Victron system'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to reconnect to Victron system'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to reconnect to Victron system',
      error: error.message
    });
  }
});

module.exports = router;

