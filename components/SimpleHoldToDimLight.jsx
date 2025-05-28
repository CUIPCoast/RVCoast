// components/SimpleHoldToDimLight.jsx - Simplified working version
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { LightControlService } from "../Service/LightControlService";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const SimpleHoldToDimLight = ({ 
  name, 
  lightId, 
  isOn = false,
  value = 50,
  supportsDimming = true 
}) => {
  // Local state for immediate UI feedback
  const [localIsOn, setLocalIsOn] = useState(isOn);
  const [localBrightness, setLocalBrightness] = useState(value);
  const [isToggling, setIsToggling] = useState(false);
  const [isDimming, setIsDimming] = useState(false);
  const [dimmingDirection, setDimmingDirection] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs for hold-to-dim functionality
  const holdTimeoutRef = useRef(null);
  const rampingRef = useRef(false);
  const monitoringIntervalRef = useRef(null);

  // Light ID to hex prefix mapping
  const lightPrefixMap = {
    bath_light: '15',
    vibe_light: '16',
    vanity_light: '17',
    dinette_lights: '18',
    awning_lights: '19',
    kitchen_lights: '1A',
    bed_ovhd_light: '1B',
    shower_lights: '1C',
    under_cab_lights: '1D',
    hitch_lights: '1E',
    porch_lights: '1F',
    strip_lights: '20',
    left_reading_lights: '22',
    right_reading_lights: '23',
  };

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      rampingRef.current = false;
    };
  }, []);

  // Sync with global state from RV State Manager
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        const lightState = state.lights?.[lightId];
        if (lightState) {
          setLocalIsOn(lightState.isOn);
          setLocalBrightness(lightState.brightness || 0);
        }
      }
    });

    // Initialize from current state
    const currentState = rvStateManager.getCategoryState('lights')?.[lightId];
    if (currentState) {
      setLocalIsOn(currentState.isOn);
      setLocalBrightness(currentState.brightness || 0);
    }

    return unsubscribe;
  }, [lightId]);

  // Execute raw CAN command
  const executeRawCommand = async (command) => {
    try {
      console.log(`Executing: ${command}`);
      const result = await LightControlService._executeRawCommand(command);
      return result;
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
      throw error;
    }
  };

  // Handle tap (toggle on/off)
  const handleTap = async () => {
    if (isToggling || isDimming) return;

    try {
      setError(null);
      setIsToggling(true);
      
      if (localIsOn) {
        // Turn off
        console.log(`Turning off ${lightId}`);
        const result = await LightControlService.turnOffLight(lightId);
        
        if (result && result.success) {
          rvStateManager.updateLightState(lightId, false, 0);
          setLocalIsOn(false);
          setLocalBrightness(0);
        } else {
          setError(`Failed to turn off`);
        }
      } else {
        // Turn on
        console.log(`Turning on ${lightId}`);
        const result = await LightControlService.turnOnLight(lightId);
        
        if (result && result.success) {
          const brightness = 75; // Default brightness
          rvStateManager.updateLightState(lightId, true, brightness);
          setLocalIsOn(true);
          setLocalBrightness(brightness);
        } else {
          setError(`Failed to turn on`);
        }
      }
    } catch (error) {
      setError(error.message || 'Unknown error occurred');
      console.error(`Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Start dimming (hold down)
  const startDimming = async (direction) => {
    if (!supportsDimming || !localIsOn || isDimming) return;

    try {
      setError(null);
      setIsDimming(true);
      setDimmingDirection(direction);
      rampingRef.current = true;

      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      console.log(`🚀 Starting ${direction} dimming for ${lightId}`);

      // Use the working generic ramp command (0x15) that we know works
      const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
      await executeRawCommand(rampCommand);

      // Start monitoring for auto-stop
      startMonitoring(direction);

    } catch (error) {
      setError(`Dimming failed: ${error.message}`);
      console.error(`Error starting dimming:`, error);
      stopDimming();
    }
  };

  // Stop dimming
  const stopDimming = async () => {
    if (!rampingRef.current) return;

    try {
      rampingRef.current = false;
      
      // Clear monitoring
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }

      const prefix = lightPrefixMap[lightId];
      if (prefix) {
        // Send stop command
        const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
        await executeRawCommand(stopCommand);
        console.log(`🛑 Stopped dimming for ${lightId}`);
      }
    } catch (error) {
      console.error(`Error stopping dimming:`, error);
    } finally {
      setIsDimming(false);
      setDimmingDirection(null);
    }
  };

  // Monitor dimming progress
  const startMonitoring = (direction) => {
    let lastBrightness = localBrightness;
    let unchangedCount = 0;

    monitoringIntervalRef.current = setInterval(async () => {
      if (!rampingRef.current) return;

      try {
        // For now, just auto-stop after reasonable limits
        const currentBrightness = localBrightness;

        // Auto-stop at limits
        if (direction === 'down' && currentBrightness <= 10) {
          console.log(`Reached minimum brightness, stopping`);
          stopDimming();
          return;
        }
        
        if (direction === 'up' && currentBrightness >= 95) {
          console.log(`Reached maximum brightness, stopping`);
          stopDimming();
          return;
        }

        // Stop if brightness hasn't changed for a while (stuck)
        if (Math.abs(currentBrightness - lastBrightness) < 2) {
          unchangedCount++;
          if (unchangedCount >= 10) { // 1 second of no change
            console.log(`Brightness stuck, stopping`);
            stopDimming();
            return;
          }
        } else {
          unchangedCount = 0;
          lastBrightness = currentBrightness;
        }

      } catch (error) {
        console.error(`Error monitoring dimming:`, error);
        stopDimming();
      }
    }, 100);
  };

  // Handle button press and hold
  const handleDimButtonPress = (direction) => {
    console.log(`🖱️ Button press: ${direction}`);
    startDimming(direction);
  };

  const handleDimButtonRelease = (direction) => {
    console.log(`🖱️ Button release: ${direction}`);
    if (rampingRef.current) {
      stopDimming();
    }
  };

  // Get display color based on state
  const getDisplayColor = () => {
    if (error) return "#FF6B6B"; // Red for error
    if (isDimming) return "#FFB267"; // Orange while dimming
    if (localIsOn) return "#FFB267"; // Orange when on
    return "#666"; // Gray when off
  };

  // Get brightness text
  const getBrightnessText = () => {
    if (error) return "ERROR";
    if (isDimming) {
      return `${Math.round(localBrightness)}% ${dimmingDirection === 'up' ? '↗' : '↘'}`;
    }
    return localIsOn ? `${Math.round(localBrightness)}%` : "OFF";
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Light name and main button */}
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 5
      }}>
        <Text style={{ 
          color: getDisplayColor(), 
          fontSize: 14,
          flex: 1
        }}>
          {name}
        </Text>
        
        {/* Brightness indicator */}
        <Text style={{ 
          color: getDisplayColor(), 
          fontSize: 12,
          marginRight: 10,
          minWidth: 80,
          textAlign: 'center'
        }}>
          {getBrightnessText()}
        </Text>
        
        {/* Main toggle button */}
        <TouchableOpacity
          style={{
            backgroundColor: localIsOn ? "#FFB267" : "#444",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 15,
            minWidth: 50,
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onPress={handleTap}
          disabled={isToggling || isDimming}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={localIsOn ? "#000" : "#FFF"} />
          ) : (
            <Text style={{ 
              color: localIsOn ? "#000" : "#FFF", 
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {localIsOn ? "ON" : "OFF"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View style={{ marginTop: 5 }}>
          <Text style={{ 
            color: "#FF6B6B", 
            fontSize: 10,
            textAlign: 'center'
          }}>
            {error}
          </Text>
        </View>
      )}

      {/* Dimming controls (only show if dimming is supported and light is on) */}
      {supportsDimming && localIsOn && !error && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          marginTop: 10,
          paddingHorizontal: 20
        }}>
          {/* Dim Down Button */}
          <TouchableOpacity
            style={{
              backgroundColor: isDimming && dimmingDirection === 'down' ? "#FFB267" : "#444",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flex: 1,
              marginRight: 10,
              alignItems: 'center'
            }}
            onPressIn={() => handleDimButtonPress('down')}
            onPressOut={() => handleDimButtonRelease('down')}
            disabled={isDimming && dimmingDirection !== 'down'}
          >
            <Text style={{ 
              color: isDimming && dimmingDirection === 'down' ? "#000" : "#FFF",
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {isDimming && dimmingDirection === 'down' ? 'DIMMING ↘' : 'HOLD ↓'}
            </Text>
          </TouchableOpacity>
          
          {/* Dim Up Button */}
          <TouchableOpacity
            style={{
              backgroundColor: isDimming && dimmingDirection === 'up' ? "#FFB267" : "#444",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flex: 1,
              marginLeft: 10,
              alignItems: 'center'
            }}
            onPressIn={() => handleDimButtonPress('up')}
            onPressOut={() => handleDimButtonRelease('up')}
            disabled={isDimming && dimmingDirection !== 'up'}
          >
            <Text style={{ 
              color: isDimming && dimmingDirection === 'up' ? "#000" : "#FFF",
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {isDimming && dimmingDirection === 'up' ? 'DIMMING ↗' : 'HOLD ↑'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      {supportsDimming && localIsOn && !isDimming && !error && (
        <View style={{ marginTop: 5 }}>
          <Text style={{ 
            color: "#999", 
            fontSize: 10,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Hold dimming buttons to adjust brightness
          </Text>
        </View>
      )}
    </View>
  );
};

export default SimpleHoldToDimLight;