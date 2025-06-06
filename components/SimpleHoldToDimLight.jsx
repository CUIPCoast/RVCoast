
// components/SimpleHoldToDimLight.jsx - Updated with circular buttons and no OFF text
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
          setError("Failed to turn off");
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
          setError("Failed to turn on");
        }
      }
    } catch (error) {
      setError(error.message || 'Unknown error occurred');
      console.error(`Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Start cycle dimming - determines direction automatically
  const startCycleDimming = async () => {
    if (!supportsDimming || !localIsOn || isDimming) return;

    try {
      setError(null);
      setIsDimming(true);
      rampingRef.current = true;

      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Determine direction based on current brightness (like Firefly tablet)
      let direction;
      if (localBrightness > 50) {
        direction = 'down'; // Start by dimming if bright
      } else {
        direction = 'up';   // Start by brightening if dim
      }

      setDimmingDirection(direction);

      console.log(`🔄 Starting cycle dimming for ${lightId} - direction: ${direction} (brightness: ${localBrightness}%)`);

      // Use the working generic ramp command that was working before
      const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
      await executeRawCommand(rampCommand);

      // Start monitoring for auto-stop and direction changes
      startMonitoring();

    } catch (error) {
      setError(`Dimming failed: ${error.message}`);
      console.error("Error starting cycle dimming:", error);
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
      console.error("Error stopping dimming:", error);
    } finally {
      setIsDimming(false);
      setDimmingDirection(null);
    }
  };

  // Monitor dimming progress - simplified version
  const startMonitoring = () => {
    let lastBrightness = localBrightness;
    let unchangedCount = 0;
    let checkCount = 0;

    monitoringIntervalRef.current = setInterval(async () => {
      if (!rampingRef.current) return;

      try {
        checkCount++;
        const currentBrightness = localBrightness;

        // Auto-stop at limits
        if (currentBrightness <= 5) {
          console.log("Reached minimum brightness, stopping");
          stopDimming();
          return;
        }
        
        if (currentBrightness >= 95) {
          console.log("Reached maximum brightness, stopping");
          stopDimming();
          return;
        }

        // Stop if brightness hasn't changed for a while (stuck)
        if (Math.abs(currentBrightness - lastBrightness) < 2) {
          unchangedCount++;
          if (unchangedCount >= 20) { // 2 seconds of no change
            console.log("Brightness stuck, stopping");
            stopDimming();
            return;
          }
        } else {
          unchangedCount = 0;
          lastBrightness = currentBrightness;
        }

        // Safety timeout
        if (checkCount >= 100) { // 10 seconds max
          console.log("Dimming timeout, stopping");
          stopDimming();
          return;
        }

      } catch (error) {
        console.error("Error monitoring dimming:", error);
        stopDimming();
      }
    }, 100);
  };

  // Handle cycle button press and release
  const handleCycleButtonPress = () => {
    console.log("🔄 Cycle button pressed");
    startCycleDimming();
  };

  const handleCycleButtonRelease = () => {
    console.log("🔄 Cycle button released");
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

  // Get brightness text - removed OFF text
  const getBrightnessText = () => {
    if (error) return "ERROR";
    if (isDimming) {
      return `${Math.round(localBrightness)}% ⟲`;
    }
    return localIsOn ? `${Math.round(localBrightness)}%` : "";
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
        
        {/* Circular toggle button */}
        <TouchableOpacity
          style={{
            backgroundColor: localIsOn ? "#FFB267" : "#666",
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: localIsOn ? "#FFB267" : "transparent",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: localIsOn ? 0.8 : 0,
            shadowRadius: localIsOn ? 8 : 0,
            elevation: localIsOn ? 8 : 0,
          }}
          onPress={handleTap}
          disabled={isToggling || isDimming}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={localIsOn ? "#000" : "#FFF"} />
          ) : null}
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

      {/* Single cycle dimming control */}
      {supportsDimming && localIsOn && !error && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center',
          marginTop: 10,
          paddingHorizontal: 20
        }}>
          {/* Single Cycle Button */}
          <TouchableOpacity
            style={{
              backgroundColor: isDimming ? "#FFB267" : "#444",
              paddingHorizontal: 30,
              paddingVertical: 12,
              borderRadius: 25,
              alignItems: 'center',
              minWidth: 200
            }}
            onPressIn={handleCycleButtonPress}
            onPressOut={handleCycleButtonRelease}
            disabled={false}
          >
            <Text style={{ 
              color: isDimming ? "#000" : "#FFF",
              fontSize: 14,
              fontWeight: 'bold'
            }}>
              {isDimming ? 'CYCLING ⟲' : 'HOLD TO CYCLE ⟲'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      
    </View>
  );
};

export default SimpleHoldToDimLight;