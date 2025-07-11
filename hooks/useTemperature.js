// hooks/useTemperature.js - React hook for real-time temperature monitoring
import { useState, useEffect, useCallback } from 'react';
import temperatureMonitoringService from '../Service/TemperatureMonitoringService';

/**
 * React hook for accessing real-time temperature data from the RV climate system
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoStart - Whether to automatically start monitoring (default: true)
 * @param {string} options.temperatureUnit - Preferred unit 'C' or 'F' (default: 'F')
 * @returns {Object} Temperature data and control functions
 */
export function useTemperature(options = {}) {
  const {
    autoStart = true,
    temperatureUnit = 'F'
  } = options;

  // State for current temperature data
  const [temperatureData, setTemperatureData] = useState({
    current: {
      celsius: 22.22, // Start with current actual temperature (72°F)
      fahrenheit: 72.0,
      lastUpdate: new Date(),
      instance: null,
      source: 'initial'
    },
    setpoints: {
      heatSetpoint: { celsius: null, fahrenheit: null },
      coolSetpoint: { celsius: null, fahrenheit: null },
      operatingMode: 'off',
      fanMode: 'auto'
    },
    isConnected: false,
    isLoading: false,
    error: null
  });

  // State for connection status
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    reconnectAttempts: 0,
    lastUpdate: null
  });

  // Initialize and set up event listeners
  useEffect(() => {
    const handleTemperatureChange = (data) => {
      setTemperatureData(prev => ({
        ...prev,
        current: data.temperature,
        isConnected: true,
        error: null
      }));
      
      setConnectionStatus(prev => ({
        ...prev,
        connected: true,
        lastUpdate: new Date()
      }));
    };

    const handleSetpointChange = (data) => {
      setTemperatureData(prev => ({
        ...prev,
        setpoints: {
          ...prev.setpoints,
          ...data
        }
      }));
    };

    const handleConnected = () => {
      console.log('useTemperature: Temperature monitoring connected');
      setConnectionStatus(prev => ({
        ...prev,
        connected: true,
        reconnectAttempts: 0,
        lastUpdate: new Date()
      }));
      
      setTemperatureData(prev => ({
        ...prev,
        isConnected: true,
        error: null
      }));
    };

    const handleDisconnected = () => {
      console.log('useTemperature: Temperature monitoring disconnected');
      setConnectionStatus(prev => ({
        ...prev,
        connected: false
      }));
      
      setTemperatureData(prev => ({
        ...prev,
        isConnected: false
      }));
    };

    const handleError = (error) => {
      console.error('useTemperature: Temperature monitoring error:', error);
      setTemperatureData(prev => ({
        ...prev,
        error: error.message || 'Temperature monitoring error',
        isConnected: false
      }));
    };

    const handleMaxReconnectAttempts = () => {
      console.log('useTemperature: Max reconnection attempts reached');
      setTemperatureData(prev => ({
        ...prev,
        error: 'Failed to connect to temperature monitoring after multiple attempts',
        isConnected: false
      }));
    };

    // Set up event listeners
    temperatureMonitoringService.on('temperatureChange', handleTemperatureChange);
    temperatureMonitoringService.on('setpointChange', handleSetpointChange);
    temperatureMonitoringService.on('connected', handleConnected);
    temperatureMonitoringService.on('disconnected', handleDisconnected);
    temperatureMonitoringService.on('error', handleError);
    temperatureMonitoringService.on('maxReconnectAttemptsReached', handleMaxReconnectAttempts);

    // Auto-start monitoring if requested
    if (autoStart && !temperatureMonitoringService.isConnected()) {
      console.log('useTemperature: Auto-starting temperature monitoring');
      temperatureMonitoringService.start();
    }

    // Get initial state
    const initialTemp = temperatureMonitoringService.getCurrentTemperature();
    if (initialTemp.celsius !== undefined) {
      setTemperatureData(prev => ({
        ...prev,
        current: initialTemp,
        isConnected: initialTemp.isConnected
      }));
    }

    // Cleanup on unmount
    return () => {
      temperatureMonitoringService.off('temperatureChange', handleTemperatureChange);
      temperatureMonitoringService.off('setpointChange', handleSetpointChange);
      temperatureMonitoringService.off('connected', handleConnected);
      temperatureMonitoringService.off('disconnected', handleDisconnected);
      temperatureMonitoringService.off('error', handleError);
      temperatureMonitoringService.off('maxReconnectAttemptsReached', handleMaxReconnectAttempts);
    };
  }, [autoStart]);

  // Get temperature in preferred unit
  const getCurrentTemperature = useCallback(() => {
    const { current } = temperatureData;
    
    if (temperatureUnit === 'C') {
      return {
        value: current.celsius,
        unit: '°C',
        raw: current
      };
    } else {
      return {
        value: current.fahrenheit,
        unit: '°F',
        raw: current
      };
    }
  }, [temperatureData, temperatureUnit]);

  // Get formatted temperature string
  const getFormattedTemperature = useCallback((decimals = 1) => {
    const temp = getCurrentTemperature();
    
    if (temp.value === null || temp.value === undefined) {
      return `--${temp.unit}`;
    }
    
    return `${temp.value.toFixed(decimals)}${temp.unit}`;
  }, [getCurrentTemperature]);

  // Get setpoint temperatures in preferred unit
  const getSetpoints = useCallback(() => {
    const { setpoints } = temperatureData;
    
    if (temperatureUnit === 'C') {
      return {
        heat: setpoints.heatSetpoint.celsius,
        cool: setpoints.coolSetpoint.celsius,
        unit: '°C',
        operatingMode: setpoints.operatingMode,
        fanMode: setpoints.fanMode
      };
    } else {
      return {
        heat: setpoints.heatSetpoint.fahrenheit,
        cool: setpoints.coolSetpoint.fahrenheit,
        unit: '°F',
        operatingMode: setpoints.operatingMode,
        fanMode: setpoints.fanMode
      };
    }
  }, [temperatureData, temperatureUnit]);

  // Start monitoring manually
  const startMonitoring = useCallback(() => {
    if (!temperatureMonitoringService.isConnected()) {
      console.log('useTemperature: Starting temperature monitoring');
      setTemperatureData(prev => ({ ...prev, isLoading: true, error: null }));
      temperatureMonitoringService.start();
    }
  }, []);

  // Stop monitoring manually
  const stopMonitoring = useCallback(() => {
    console.log('useTemperature: Stopping temperature monitoring');
    temperatureMonitoringService.stop();
    setTemperatureData(prev => ({
      ...prev,
      isConnected: false,
      isLoading: false
    }));
    setConnectionStatus(prev => ({
      ...prev,
      connected: false
    }));
  }, []);

  // Refresh/reconnect
  const refresh = useCallback(() => {
    console.log('useTemperature: Refreshing temperature monitoring');
    temperatureMonitoringService.stop();
    setTimeout(() => {
      temperatureMonitoringService.start();
    }, 1000);
  }, []);

  return {
    // Current temperature data
    temperature: getCurrentTemperature(),
    formattedTemperature: getFormattedTemperature(),
    setpoints: getSetpoints(),
    
    // Raw data for advanced usage
    rawData: temperatureData.current,
    
    // Connection status
    isConnected: temperatureData.isConnected,
    isLoading: temperatureData.isLoading,
    error: temperatureData.error,
    connectionStatus,
    
    // Control functions
    startMonitoring,
    stopMonitoring,
    refresh,
    
    // Utility functions
    formatTemperature: (temp, unit = temperatureUnit, decimals = 1) => {
      if (temp === null || temp === undefined) {
        return `--°${unit}`;
      }
      return `${temp.toFixed(decimals)}°${unit}`;
    },
    
    // Convert between units
    convertTemperature: (temp, fromUnit, toUnit) => {
      if (temp === null || temp === undefined) return null;
      
      if (fromUnit === toUnit) return temp;
      
      if (fromUnit === 'C' && toUnit === 'F') {
        return (temp * 9/5) + 32;
      } else if (fromUnit === 'F' && toUnit === 'C') {
        return (temp - 32) * 5/9;
      }
      
      return temp;
    }
  };
}

export default useTemperature;