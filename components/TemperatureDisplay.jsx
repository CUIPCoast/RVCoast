import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import useTemperature from "../hooks/useTemperature";
import useScreenSize from "../helper/useScreenSize";

/**
 * Real-time Temperature Display Component
 * Shows current ambient temperature from CAN bus or simulated data
 * Displays connection status and simulation mode indicator
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
    isSimulationMode,
    isLoading,
    error,
    connectionStatus,
    connectionDetails,
    refresh,
    updateSimulationConfig
  } = useTemperature({ 
    autoStart: true, 
    temperatureUnit,
    enableSimulation: true 
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
      return { color: '#F59E0B', icon: '○', text: 'Connecting...' };
    } else if (isConnected && isSimulationMode) {
      return { color: '#F97316', icon: '●', text: 'Demo Mode' }; // Orange for simulation
    } else if (isConnected) {
      return { color: '#10B981', icon: '●', text: 'Live Data' }; // Green for real data
    } else {
      return { color: '#6B7280', icon: '○', text: 'Initializing...' }; // Gray for starting up
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

  // Handle simulation config update (for testing)
  const handleSimulationConfigPress = () => {
    if (isSimulationMode) {
      // Example: Update simulation to be more active
      updateSimulationConfig({
        temperatureRange: { celsius: 5, fahrenheit: 9 },
        updateInterval: 1000, // Faster updates for demo
        noiseLevel: 0.2 // More variation
      });
    }
  };

  if (isTablet) {
    return (
      <View style={[{ alignItems: 'center', padding: 16, minHeight: 400 }, style]}>
        {/* Main temperature display */}
        <TouchableOpacity 
          onPress={handlePress}
          activeOpacity={0.7}
          style={{
            alignItems: 'center',
            backgroundColor: isConnected ? 
              (isSimulationMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 
              'rgba(107, 114, 128, 0.1)',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: isConnected ? 
              (isSimulationMode ? '#F97316' : '#10B981') : 
              '#6B7280',
            minWidth: 230, // Made wider
            
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
              {connectionIndicator.text}
            </Text>
          </View>

          {/* Temperature value */}
          <Text className="text-white text-4xl font-bold">
            {formattedTemperature}
          </Text>

          {/* Data source indicator */}
          {isConnected && (
            <Text className={`text-xs mt-1 ${isSimulationMode ? 'text-orange-400' : 'text-green-400'}`}>
              {isSimulationMode ? 'Demo Data' : connectionDetails.connectionType}
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

            {/* Simulation indicator for setpoints */}
            {isSimulationMode && (
              <Text className="text-orange-400 text-xs text-center mt-1">
                Demo setpoints
              </Text>
            )}
          </View>
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
          <View style={{ alignItems: 'center', marginRight: 8 }}>
            <Text style={{ 
              color: connectionIndicator.color, 
              fontSize: 14
            }}>
              {connectionIndicator.icon}
            </Text>
            {isSimulationMode && (
              <Text className="text-orange-400 text-xs">DEMO</Text>
            )}
          </View>
        )}

        {/* Temperature */}
        <View style={{ flex: 1 }}>
          <Text className="text-white text-2xl font-semibold">
            {formattedTemperature}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {connectionStatus.lastUpdate && (
              <Text className="text-gray-400 text-xs">
                {getTimeSinceUpdate()}
              </Text>
            )}
            {isSimulationMode && (
              <Text className="text-orange-400 text-xs ml-2">
                • Demo
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Setpoints (compact) */}
      {showSetpoints && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text className="text-gray-400 text-xs">
            Setpoints {isSimulationMode ? '(Demo)' : ''}
          </Text>
          <Text className="text-orange-400 text-sm">
            H: {setpoints.heat !== null ? `${setpoints.heat.toFixed(0)}${setpoints.unit}` : '--'}
          </Text>
          <Text className="text-blue-400 text-sm">
            C: {setpoints.cool !== null ? `${setpoints.cool.toFixed(0)}${setpoints.unit}` : '--'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default TemperatureDisplay;