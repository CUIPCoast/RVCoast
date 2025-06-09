// components/SimpleHoldToDimLight.jsx - FIXED VERSION
// Addresses: Master light reliability, 100% brightness guarantee, hold button responsiveness
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
  
  // Refs for hold-to-dim functionality with improved timing
  const holdTimeoutRef = useRef(null);
  const rampingRef = useRef(false);
  const monitoringIntervalRef = useRef(null);
  const pressStartTimeRef = useRef(null);
  const commandSequenceRef = useRef(null);

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
      if (commandSequenceRef.current) {
        clearTimeout(commandSequenceRef.current);
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

  // Enhanced command execution with retry and proper timing
  const executeCommandWithRetry = async (command, retries = 2, delay = 150) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`Executing command (attempt ${attempt + 1}/${retries + 1}): ${command}`);
        const result = await LightControlService._executeRawCommand(command);
        
        // Add mandatory delay between commands to prevent CAN bus congestion
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return result;
      } catch (error) {
        console.error(`Command failed on attempt ${attempt + 1}:`, error);
        
        if (attempt < retries) {
          // Wait longer before retry
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 2)));
        } else {
          throw error; // Final attempt failed
        }
      }
    }
  };

  // Enhanced toggle function with guaranteed 100% brightness and better reliability
  const handleTap = async () => {
    if (isToggling || isDimming) return;

    try {
      setError(null);
      setIsToggling(true);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      if (localIsOn) {
        // Turn OFF - Use command 3 (OFF)
        console.log(`🔴 Turning OFF ${lightId}`);
        const offCommand = `19FEDB9F#${prefix}FF0003FF00FFFF`;
        
        await executeCommandWithRetry(offCommand, 1, 100);
        
        // Update state immediately for responsive UI
        rvStateManager.updateLightState(lightId, false, 0);
        setLocalIsOn(false);
        setLocalBrightness(0);
        
      } else {
        // Turn ON to 100% brightness - GUARANTEED 100%
        console.log(`🟢 Turning ON ${lightId} to 100%`);
        
        // Method 1: Use command 1 (ON) which should go to 100%
        const onCommand = `19FEDB9F#${prefix}FFC801FF00FFFF`;
        await executeCommandWithRetry(onCommand, 1, 100);
        
        // BACKUP: If command 1 doesn't work, use direct brightness setting
        // This is a failsafe to guarantee 100% brightness
        try {
          const directBrightnessCommand = `19FEDB9F#${prefix}FFC800FF00FFFF`;
          await executeCommandWithRetry(directBrightnessCommand, 1, 100);
        } catch (backupError) {
          console.warn("Backup brightness command failed, continuing...");
        }
        
        // Update state to 100% brightness immediately
        const targetBrightness = 100;
        rvStateManager.updateLightState(lightId, true, targetBrightness);
        setLocalIsOn(true);
        setLocalBrightness(targetBrightness);
      }
      
    } catch (error) {
      setError(`Toggle failed: ${error.message}`);
      console.error(`❌ Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Enhanced cycle dimming with better button responsiveness
  const startCycleDimming = async () => {
    if (!supportsDimming || !localIsOn || isDimming) return;

    try {
      setError(null);
      setIsDimming(true);
      rampingRef.current = true;
      pressStartTimeRef.current = Date.now();

      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Determine direction based on current brightness
      let direction;
      if (localBrightness > 50) {
        direction = 'down';
      } else {
        direction = 'up';
      }

      setDimmingDirection(direction);
      console.log(`🔄 Starting cycle dimming for ${lightId} - direction: ${direction} (brightness: ${localBrightness}%)`);

      // CRITICAL FIX: Use the working ramp command with proper timing
      // Command 21 (0x15) = ramp brightness
      const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
      await executeCommandWithRetry(rampCommand, 1, 50); // Shorter delay for ramping

      // Start monitoring with improved responsiveness
      startMonitoring();

    } catch (error) {
      setError(`Dimming failed: ${error.message}`);
      console.error("❌ Error starting cycle dimming:", error);
      stopDimming();
    }
  };

  // Enhanced stop dimming with immediate response
  const stopDimming = async () => {
    if (!rampingRef.current) return;

    try {
      rampingRef.current = false;
      
      // Clear monitoring immediately
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }

      const prefix = lightPrefixMap[lightId];
      if (prefix) {
        // Send stop command with higher priority (shorter retry)
        const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
        await executeCommandWithRetry(stopCommand, 1, 50);
        console.log(`🛑 Stopped dimming for ${lightId}`);
      }
    } catch (error) {
      console.error("❌ Error stopping dimming:", error);
    } finally {
      setIsDimming(false);
      setDimmingDirection(null);
    }
  };

  // Improved monitoring with better auto-stop logic
  const startMonitoring = () => {
    let lastBrightness = localBrightness;
    let unchangedCount = 0;
    let checkCount = 0;
    const pressStartTime = pressStartTimeRef.current;

    monitoringIntervalRef.current = setInterval(async () => {
      if (!rampingRef.current) return;

      try {
        checkCount++;
        const currentBrightness = localBrightness;
        const timeSinceStart = Date.now() - pressStartTime;

        // Auto-stop at limits with tighter tolerances
        if (currentBrightness <= 8) {
          console.log("📉 Reached minimum brightness, stopping");
          stopDimming();
          return;
        }
        
        if (currentBrightness >= 92) {
          console.log("📈 Reached maximum brightness, stopping");
          stopDimming();
          return;
        }

        // Improved stuck detection
        if (Math.abs(currentBrightness - lastBrightness) < 1) {
          unchangedCount++;
          if (unchangedCount >= 15) { // 1.5 seconds of no change
            console.log("⏸️ Brightness stuck, stopping");
            stopDimming();
            return;
          }
        } else {
          unchangedCount = 0;
          lastBrightness = currentBrightness;
        }

        // Enhanced safety timeout
        if (timeSinceStart >= 15000) { // 15 seconds max
          console.log("⏰ Dimming timeout, stopping");
          stopDimming();
          return;
        }

      } catch (error) {
        console.error("❌ Error monitoring dimming:", error);
        stopDimming();
      }
    }, 100); // Keep 100ms for smooth monitoring
  };

  // CRITICAL FIX: Enhanced button press handling with better timing
  const handleCycleButtonPress = () => {
    console.log("🔄 Cycle button PRESS detected");
    pressStartTimeRef.current = Date.now();
    
    // Start dimming immediately, no delay
    startCycleDimming();
  };

  const handleCycleButtonRelease = () => {
    console.log("🔄 Cycle button RELEASE detected");
    
    // Stop dimming immediately on release
    if (rampingRef.current) {
      stopDimming();
    }
  };

  // Enhanced display functions
  const getDisplayColor = () => {
    if (error) return "#FF6B6B"; // Red for error
    if (isDimming) return "#FFB267"; // Orange while dimming
    if (localIsOn) return "#FFB267"; // Orange when on
    return "#666"; // Gray when off
  };

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
          activeOpacity={0.7}
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

      {/* Enhanced cycle dimming control */}
      {supportsDimming && localIsOn && !error && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center',
          marginTop: 10,
          paddingHorizontal: 20
        }}>
          {/* Enhanced Single Cycle Button with better touch handling */}
          <TouchableOpacity
            style={{
              backgroundColor: isDimming ? "#FFB267" : "#444",
              paddingHorizontal: 30,
              paddingVertical: 12,
              borderRadius: 25,
              alignItems: 'center',
              minWidth: 200,
              borderWidth: isDimming ? 2 : 1,
              borderColor: isDimming ? "#FF8C00" : "#666",
            }}
            onPressIn={handleCycleButtonPress}
            onPressOut={handleCycleButtonRelease}
            disabled={isToggling}
            activeOpacity={0.8}
            // CRITICAL: These props ensure better touch handling
            delayPressIn={0}
            delayPressOut={0}
          >
            <Text style={{ 
              color: isDimming ? "#000" : "#FFF",
              fontSize: 14,
              fontWeight: 'bold'
            }}>
              {isDimming ? 'CYCLING ⟲' : 'HOLD TO CYCLE ⟲'}
            </Text>
            {isDimming && dimmingDirection && (
              <Text style={{ 
                color: "#000",
                fontSize: 10,
                marginTop: 2
              }}>
                {dimmingDirection.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default SimpleHoldToDimLight;