import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import useTemperature from "../hooks/useTemperature";
import useScreenSize from "../helper/useScreenSize";

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
  const isTablet = useScreenSize();
  
  const {
    temperature,
    formattedTemperature,
    setpoints,
    isConnected,
    isLoading,
    error,
    connectionStatus,
    refresh
  } = useTemperature({ 
    autoStart: true, 
    temperatureUnit 
  });

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
    if (!connectionStatus.lastUpdate) return '';
    
    const now = new Date();
    const diff = Math.floor((now - connectionStatus.lastUpdate) / 1000);
    
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
            {error ? '--' : formattedTemperature}
          </Text>

          {/* Last update time */}
          {connectionStatus.lastUpdate && (
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
                    `${setpoints.heat.toFixed(1)}${setpoints.unit}` : 
                    '--'
                  }
                </Text>
              </View>

              {/* Cool setpoint */}
              <View style={{ alignItems: 'center' }}>
                <Text className="text-blue-400 text-sm">Cool</Text>
                <Text className="text-white text-lg">
                  {setpoints.cool !== null ? 
                    `${setpoints.cool.toFixed(1)}${setpoints.unit}` : 
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
            {error ? '--°F' : formattedTemperature}
          </Text>
          {connectionStatus.lastUpdate && !error && (
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
            H: {setpoints.heat !== null ? `${setpoints.heat.toFixed(0)}${setpoints.unit}` : '--'}
          </Text>
          <Text className="text-blue-400 text-sm">
            C: {setpoints.cool !== null ? `${setpoints.cool.toFixed(0)}${setpoints.unit}` : '--'}
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