// components/HoldToDimLight.jsx - Hold-to-dim button implementation
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, PanResponder } from "react-native";
import { LightControlService } from "../Service/LightControlService";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const HoldToDimLight = ({ 
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
  const [dimmingDirection, setDimmingDirection] = useState(null); // 'up' or 'down'
  const [error, setError] = useState(null);
  
  // Refs for hold-to-dim functionality
  const holdTimeoutRef = useRef(null);
  const rampingRef = useRef(false);
  const startBrightnessRef = useRef(50);
  const targetBrightnessRef = useRef(50);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
          setError(`Failed to turn off: ${result?.error || 'Unknown error'}`);
        }
      } else {
        // Turn on to previous brightness or 75%
        const targetBrightness = localBrightness > 20 ? localBrightness : 75;
        console.log(`Turning on ${lightId} to ${targetBrightness}%`);
        
        const result = await LightControlService.turnOnLight(lightId);
        
        if (result && result.success) {
          rvStateManager.updateLightState(lightId, true, targetBrightness);
          setLocalIsOn(true);
          setLocalBrightness(targetBrightness);
        } else {
          setError(`Failed to turn on: ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      setError(error.message || 'Unknown error occurred');
      console.error(`Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Start ramping in a direction
  const startRamping = async (direction) => {
    if (!supportsDimming || !localIsOn || isDimming) return;

    try {
      setError(null);
      setIsDimming(true);
      setDimmingDirection(direction);
      rampingRef.current = true;
      startBrightnessRef.current = localBrightness;

      console.log(`Starting ramp ${direction} for ${lightId} from ${localBrightness}%`);

      // Start the ramp command (command 15 = ramp)
      const prefix = getLightPrefix(lightId);
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
      await LightControlService._executeRawCommand(rampCommand);

      // Monitor the ramping with progress updates
      monitorRamping(direction);
    } catch (error) {
      setError(`Dimming error: ${error.message}`);
      console.error(`Error starting ramp for ${lightId}:`, error);
      stopRamping();
    }
  };

  // Stop ramping
  const stopRamping = async () => {
    if (!rampingRef.current) return;

    try {
      rampingRef.current = false;
      
      const prefix = getLightPrefix(lightId);
      if (prefix) {
        // Send stop command (command 4 = stop)
        const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
        await LightControlService._executeRawCommand(stopCommand);
        console.log(`Stopped ramping for ${lightId} at ${localBrightness}%`);
      }
    } catch (error) {
      console.error(`Error stopping ramp for ${lightId}:`, error);
    } finally {
      setIsDimming(false);
      setDimmingDirection(null);
    }
  };

  // Monitor ramping progress
  const monitorRamping = async (direction) => {
    let lastBrightness = startBrightnessRef.current;
    let stuckCount = 0;
    const maxStuckChecks = 20; // Stop if brightness doesn't change for 2 seconds

    const checkProgress = async () => {
      if (!rampingRef.current) return;

      try {
        // Get current brightness from CAN bus or state
        const currentBrightness = await getCurrentBrightness();
        
        // Update local state with current brightness
        setLocalBrightness(currentBrightness);
        rvStateManager.updateLightState(lightId, currentBrightness > 0, currentBrightness);

        // Check if brightness stopped changing
        if (Math.abs(currentBrightness - lastBrightness) < 1) {
          stuckCount++;
          if (stuckCount >= maxStuckChecks) {
            console.log(`Brightness stuck at ${currentBrightness}%, stopping ramp`);
            stopRamping();
            return;
          }
        } else {
          stuckCount = 0;
          lastBrightness = currentBrightness;
        }

        // Check for minimum/maximum limits
        if (direction === 'down' && currentBrightness <= 10) {
          console.log(`Reached minimum brightness, stopping ramp`);
          stopRamping();
          return;
        }
        
        if (direction === 'up' && currentBrightness >= 95) {
          console.log(`Reached maximum brightness, stopping ramp`);
          stopRamping();
          return;
        }

        // Continue monitoring
        if (rampingRef.current) {
          setTimeout(checkProgress, 100);
        }
      } catch (error) {
        console.error(`Error monitoring ramp progress:`, error);
        stopRamping();
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkProgress, 200);
  };

  // Get current brightness (simplified version)
  const getCurrentBrightness = async () => {
    try {
      // Try to get from state manager first
      const currentState = rvStateManager.getCategoryState('lights')?.[lightId];
      if (currentState && currentState.brightness !== undefined) {
        return currentState.brightness;
      }
      
      // Fallback to last known brightness
      return localBrightness;
    } catch (error) {
      return localBrightness;
    }
  };

  // Get light prefix for CAN commands
  const getLightPrefix = (lightId) => {
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
    return lightPrefixMap[lightId];
  };

  // Create pan responder for hold-to-dim functionality
  const createDimPanResponder = (direction) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      
      onPanResponderGrant: () => {
        // Start ramping after a short delay to distinguish from tap
        holdTimeoutRef.current = setTimeout(() => {
          startRamping(direction);
        }, 200);
      },
      
      onPanResponderRelease: () => {
        // Clear timeout and stop ramping
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        if (rampingRef.current) {
          stopRamping();
        }
      },
      
      onPanResponderTerminate: () => {
        // Handle interruption
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        if (rampingRef.current) {
          stopRamping();
        }
      }
    });
  };

  const dimUpResponder = createDimPanResponder('up');
  const dimDownResponder = createDimPanResponder('down');

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
          <View
            style={{
              backgroundColor: isDimming && dimmingDirection === 'down' ? "#FFB267" : "#444",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flex: 1,
              marginRight: 10,
              alignItems: 'center'
            }}
            {...dimDownResponder.panHandlers}
          >
            <Text style={{ 
              color: isDimming && dimmingDirection === 'down' ? "#000" : "#FFF",
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {isDimming && dimmingDirection === 'down' ? 'DIMMING ↘' : 'HOLD TO DIM ↓'}
            </Text>
          </View>
          
          {/* Dim Up Button */}
          <View
            style={{
              backgroundColor: isDimming && dimmingDirection === 'up' ? "#FFB267" : "#444",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flex: 1,
              marginLeft: 10,
              alignItems: 'center'
            }}
            {...dimUpResponder.panHandlers}
          >
            <Text style={{ 
              color: isDimming && dimmingDirection === 'up' ? "#000" : "#FFF",
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {isDimming && dimmingDirection === 'up' ? 'DIMMING ↗' : 'HOLD TO DIM ↑'}
            </Text>
          </View>
        </View>
      )}

      {/* Instructions (show once) */}
      {supportsDimming && localIsOn && !isDimming && !error && (
        <View style={{ marginTop: 5 }}>
          <Text style={{ 
            color: "#999", 
            fontSize: 10,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Tap to toggle • Hold dimming buttons to adjust brightness
          </Text>
        </View>
      )}
    </View>
  );
};

export default HoldToDimLight;