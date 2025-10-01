// components/TemperatureDisplay.jsx - Updated with direct CAN bus monitoring
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import useScreenSize from "../helper/useScreenSize";
import temperatureMonitoringService from "../Service/TemperatureMonitoringService";

/**
 * Real-time Temperature Display Component
 * Shows current ambient temperature from CAN bus with live updates
 * Displays connection status and allows unit switching
 */
const TemperatureDisplay = ({ 
  onTemperaturePress, 
  showSetpoints = false, 
  style = {} 
}) => {
  const [temperatureUnit, setTemperatureUnit] = useState('F');
  const [temperature, setTemperature] = useState(null);
  const [setpoints, setSetpoints] = useState({
    heat: null,
    cool: null,
    operatingMode: null,
    fanMode: null,
    unit: 'F'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const isTablet = useScreenSize();

  // Initialize temperature monitoring
  useEffect(() => {
    console.log('TemperatureDisplay: Starting temperature monitoring');
    setIsLoading(true);
    
    // Start the service
    temperatureMonitoringService.start();
    
    // Get initial temperature
    const currentTemp = temperatureMonitoringService.getCurrentTemperature();
    if (currentTemp.fahrenheit) {
      console.log('TemperatureDisplay: Initial temperature:', currentTemp.fahrenheit);
      setTemperature(currentTemp);
      setIsConnected(currentTemp.isConnected);
      setLastUpdate(currentTemp.lastUpdate || new Date());
      setIsLoading(false);
      setError(null);
    } else {
      setIsLoading(false);
    }
    
    // Subscribe to temperature changes
    const handleTemperatureChange = (data) => {
      console.log('TemperatureDisplay: Temperature update:', data.temperature.fahrenheit);
      setTemperature(data.temperature);
      setLastUpdate(data.temperature.lastUpdate || new Date());
      setError(null);
      setIsLoading(false);
      setIsConnected(true);
    };
    
    // Subscribe to setpoint changes
    const handleSetpointChange = (data) => {
      console.log('TemperatureDisplay: Setpoint update:', data);
      setSetpoints({
        heat: data.heatSetpoint.fahrenheit,
        cool: data.coolSetpoint.fahrenheit,
        operatingMode: data.operatingMode,
        fanMode: data.fanMode,
        unit: 'F'
      });
    };
    
    // Subscribe to connection status
    const handleConnected = () => {
      console.log('TemperatureDisplay: Connected to CAN bus');
      setIsConnected(true);
      setError(null);
      setIsLoading(false);
    };
    
    const handleDisconnected = () => {
      console.log('TemperatureDisplay: Disconnected from CAN bus');
      setIsConnected(false);
      setError('Connection lost');
    };
    
    const handleError = (err) => {
      console.error('TemperatureDisplay: Error:', err);
      setError('Connection error');
      setIsConnected(false);
      setIsLoading(false);
    };
    
    // Add event listeners
    temperatureMonitoringService.on('temperatureChange', handleTemperatureChange);
    temperatureMonitoringService.on('setpointChange', handleSetpointChange);
    temperatureMonitoringService.on('connected', handleConnected);
    temperatureMonitoringService.on('disconnected', handleDisconnected);
    temperatureMonitoringService.on('error', handleError);
    
    // Check if already connected
    if (temperatureMonitoringService.isConnected()) {
      setIsConnected(true);
      setIsLoading(false);
    }
    
    // Set timeout to stop loading after 5 seconds
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        if (!temperature) {
          setError('No temperature data');
        }
      }
    }, 5000);
    
    // Cleanup
    return () => {
      console.log('TemperatureDisplay: Cleaning up');
      clearTimeout(loadingTimeout);
      temperatureMonitoringService.removeListener('temperatureChange', handleTemperatureChange);
      temperatureMonitoringService.removeListener('setpointChange', handleSetpointChange);
      temperatureMonitoringService.removeListener('connected', handleConnected);
      temperatureMonitoringService.removeListener('disconnected', handleDisconnected);
      temperatureMonitoringService.removeListener('error', handleError);
    };
  }, []);

  // Toggle between Celsius and Fahrenheit
  const toggleTemperatureUnit = () => {
    setTemperatureUnit(prev => prev === 'F' ? 'C' : 'F');
  };

  // Handle temperature display press
  const handlePress = () => {
    if (onTemperaturePress) {
      onTemperaturePress(temperature);
    } else {
      toggleTemperatureUnit();
    }
  };

  // Get formatted temperature based on unit
  const getFormattedTemperature = () => {
    if (!temperature) return '--°F';
    
    if (temperatureUnit === 'F') {
      return `${Math.round(temperature.fahrenheit)}°F`;
    } else {
      return `${temperature.celsius.toFixed(1)}°C`;
    }
  };

  // Refresh connection
  const refresh = () => {
    setIsLoading(true);
    setError(null);
    temperatureMonitoringService.stop();
    setTimeout(() => {
      temperatureMonitoringService.start();
    }, 500);
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    if (isLoading) {
      return { color: '#F59E0B', icon: '○' }; // Orange circle for loading
    } else if (isConnected) {
      return { color: '#10B981', icon: '●' }; // Green dot for connected
    } else if (error) {
      return { color: '#EF4444', icon: '●' }; // Red dot for error
    } else {
      return { color: '#6B7280', icon: '○' }; // Gray circle for disconnected
    }
  };

  const connectionIndicator = getConnectionIndicator();

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (isTablet) {
    return (
      <View style={[{ alignItems: 'center', padding: 16 }, style]}>
        {/* Main temperature display */}
        <TouchableOpacity 
          onPress={handlePress}
          activeOpacity={0.7}
          style={{
            alignItems: 'center',
            backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: isConnected ? '#10B981' : '#6B7280',
          }}
        >
          {/* Connection status and loading indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
            ) : (
              <Text style={{ 
                color: connectionIndicator.color, 
                fontSize: 16, 
                marginRight: 8 
              }}>
                {connectionIndicator.icon}
              </Text>
            )}
            <Text className="text-gray-400 text-sm">
              Ambient Temperature
            </Text>
          </View>

          {/* Temperature value */}
          <Text className="text-white text-4xl font-bold">
            {getFormattedTemperature()}
          </Text>

          {/* Last update time */}
          {lastUpdate && (
            <Text className="text-gray-400 text-xs mt-2">
              Updated {getTimeSinceUpdate()}
            </Text>
          )}

          {/* Error message */}
          {error && (
            <Text className="text-red-400 text-sm mt-2 text-center">
              {error}
            </Text>
          )}
        </TouchableOpacity>

        {/* Setpoint temperatures if requested */}
        {showSetpoints && (
          <View style={{ marginTop: 16, width: '100%' }}>
            <Text className="text-gray-400 text-sm mb-2 text-center">
              Setpoints
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {/* Heat setpoint */}
              <View style={{ alignItems: 'center' }}>
                <Text className="text-orange-400 text-sm">Heat</Text>
                <Text className="text-white text-lg">
                  {setpoints.heat !== null ? 
                    `${setpoints.heat.toFixed(1)}°${setpoints.unit}` : 
                    '--'
                  }
                </Text>
              </View>

              {/* Cool setpoint */}
              <View style={{ alignItems: 'center' }}>
                <Text className="text-blue-400 text-sm">Cool</Text>
                <Text className="text-white text-lg">
                  {setpoints.cool !== null ? 
                    `${setpoints.cool.toFixed(1)}°${setpoints.unit}` : 
                    '--'
                  }
                </Text>
              </View>
            </View>

            {/* Operating mode */}
            {setpoints.operatingMode && (
              <Text className="text-gray-400 text-sm text-center mt-2">
                Mode: {setpoints.operatingMode} | Fan: {setpoints.fanMode}
              </Text>
            )}
          </View>
        )}

        {/* Refresh button for troubleshooting */}
        {error && (
          <TouchableOpacity 
            onPress={refresh}
            style={{
              marginTop: 12,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: '#3B82F6'
            }}
          >
            <Text className="text-blue-400 text-sm">Retry Connection</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Phone layout (more compact)
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }, style]}>
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
        {/* Connection indicator */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
        ) : (
          <Text style={{ 
            color: connectionIndicator.color, 
            fontSize: 14, 
            marginRight: 8 
          }}>
            {connectionIndicator.icon}
          </Text>
        )}

        {/* Temperature */}
        <View>
          <Text className="text-white text-2xl font-semibold">
            {getFormattedTemperature()}
          </Text>
          {lastUpdate && !error && (
            <Text className="text-gray-400 text-xs">
              {getTimeSinceUpdate()}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Setpoints (compact) */}
      {showSetpoints && !error && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text className="text-gray-400 text-xs">Setpoints</Text>
          <Text className="text-orange-400 text-sm">
            H: {setpoints.heat !== null ? `${setpoints.heat.toFixed(0)}°${setpoints.unit}` : '--'}
          </Text>
          <Text className="text-blue-400 text-sm">
            C: {setpoints.cool !== null ? `${setpoints.cool.toFixed(0)}°${setpoints.unit}` : '--'}
          </Text>
        </View>
      )}

      {/* Error indicator */}
      {error && (
        <TouchableOpacity onPress={refresh}>
          <Text className="text-red-400 text-sm">Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TemperatureDisplay;