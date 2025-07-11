// components/SimpleHoldToDimLight.jsx - COMBINED TOGGLE/DIM VERSION
// Single button: Tap to toggle, Hold to cycle brightness
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
  
  // Refs for combined tap/hold functionality
  const holdTimeoutRef = useRef(null);
  const rampingRef = useRef(false);
  const monitoringIntervalRef = useRef(null);
  const pressStartTimeRef = useRef(null);
  const commandSequenceRef = useRef(null);
  const pressTypeRef = useRef(null); // 'tap' or 'hold'
  const touchActiveRef = useRef(false); // Track if touch is still active
  const keepAliveIntervalRef = useRef(null); // Keep dimming alive

  // Constants for timing
  const HOLD_DELAY = 500; // 500ms to distinguish between tap and hold
  const KEEP_ALIVE_INTERVAL = 2000; // Send keep-alive every 2 seconds

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
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      rampingRef.current = false;
      touchActiveRef.current = false;
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
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return result;
      } catch (error) {
        console.error(`Command failed on attempt ${attempt + 1}:`, error);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 2)));
        } else {
          throw error;
        }
      }
    }
  };

  // Toggle function for tap action
  const handleToggle = async () => {
    if (isToggling || isDimming) return;

    try {
      setError(null);
      setIsToggling(true);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      if (localIsOn) {
        // Turn OFF
        console.log(`🔴 Turning OFF ${lightId}`);
        const offCommand = `19FEDB9F#${prefix}FF0003FF00FFFF`;
        
        await executeCommandWithRetry(offCommand, 1, 100);
        
        rvStateManager.updateLightState(lightId, false, 0);
        setLocalIsOn(false);
        setLocalBrightness(0);
        
      } else {
        // Turn ON to 100% brightness
        console.log(`🟢 Turning ON ${lightId} to 100%`);
        
        const onCommand = `19FEDB9F#${prefix}FFC801FF00FFFF`;
        await executeCommandWithRetry(onCommand, 1, 100);
        
        // Backup command for guaranteed 100%
        try {
          const directBrightnessCommand = `19FEDB9F#${prefix}FFC800FF00FFFF`;
          await executeCommandWithRetry(directBrightnessCommand, 1, 100);
        } catch (backupError) {
          console.warn("Backup brightness command failed, continuing...");
        }
        
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

  // Start cycle dimming for hold action
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

      // Start ramp command
      const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
      await executeCommandWithRetry(rampCommand, 1, 50);

      // Start monitoring
      startMonitoring();

      // Start keep-alive mechanism to ensure continuous dimming
      startKeepAlive(prefix);

    } catch (error) {
      setError(`Dimming failed: ${error.message}`);
      console.error("❌ Error starting cycle dimming:", error);
      stopDimming();
    }
  };

  // Stop dimming
  const stopDimming = async () => {
    if (!rampingRef.current) return;

    try {
      rampingRef.current = false;
      touchActiveRef.current = false;
      
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }

      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }

      const prefix = lightPrefixMap[lightId];
      if (prefix) {
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

  // Monitoring function for dimming
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

        // Auto-stop at limits with better thresholds
        if (currentBrightness <= 5) {
          console.log("📉 Reached minimum brightness, stopping");
          stopDimming();
          return;
        }
        
        if (currentBrightness >= 95) {
          console.log("📈 Reached maximum brightness, stopping");
          stopDimming();
          return;
        }

        // More sensitive stuck detection - especially at higher brightness levels
        const brightnessChange = Math.abs(currentBrightness - lastBrightness);
        
        // Use different sensitivity based on brightness level
        let changeThreshold = 1;
        if (currentBrightness > 80) {
          changeThreshold = 0.5; // More sensitive at high brightness
        } else if (currentBrightness > 50) {
          changeThreshold = 0.8; // Moderately sensitive at medium brightness
        }
        
        if (brightnessChange < changeThreshold) {
          unchangedCount++;
          // More aggressive timeout at high brightness levels
          const maxUnchangedCount = currentBrightness > 70 ? 8 : 12;
          
          if (unchangedCount >= maxUnchangedCount) {
            console.log(`⏸️ Brightness stuck at ${currentBrightness}%, stopping`);
            stopDimming();
            return;
          }
        } else {
          unchangedCount = 0;
          lastBrightness = currentBrightness;
        }

        // Safety timeout
        if (timeSinceStart >= 15000) {
          console.log("⏰ Dimming timeout, stopping");
          stopDimming();
          return;
        }

      } catch (error) {
        console.error("❌ Error monitoring dimming:", error);
        stopDimming();
      }
    }, 100);
  };

  // Keep-alive mechanism to ensure continuous dimming
  const startKeepAlive = (prefix) => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    keepAliveIntervalRef.current = setInterval(async () => {
      // Only send keep-alive if we're still actively dimming and touch is active
      if (rampingRef.current && touchActiveRef.current && isDimming) {
        try {
          console.log(`🔄 Keep-alive: Refreshing ramp command for ${lightId}`);
          const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
          await executeCommandWithRetry(rampCommand, 1, 50);
        } catch (error) {
          console.error("❌ Keep-alive ramp command failed:", error);
          // Don't stop dimming on keep-alive failure, just log it
        }
      }
    }, KEEP_ALIVE_INTERVAL);
  };

  // Combined button press handler
  const handleButtonPressIn = () => {
    if (isToggling || isDimming) return;

    console.log("🔽 Button PRESS detected");
    touchActiveRef.current = true;
    pressStartTimeRef.current = Date.now();
    pressTypeRef.current = null;

    // Set timeout to distinguish between tap and hold
    holdTimeoutRef.current = setTimeout(() => {
      // This is a hold action
      pressTypeRef.current = 'hold';
      
      // Only start dimming if light is on and supports dimming AND touch is still active
      if (supportsDimming && localIsOn && touchActiveRef.current) {
        console.log("🔄 Hold detected - starting dimming");
        startCycleDimming();
      }
    }, HOLD_DELAY);
  };

  // Combined button release handler
  const handleButtonPressOut = () => {
    console.log("🔼 Button RELEASE detected");
    
    // Mark touch as no longer active
    touchActiveRef.current = false;
    
    // Clear the hold timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    const pressDuration = Date.now() - (pressStartTimeRef.current || 0);

    if (isDimming) {
      // Stop dimming if currently dimming
      console.log("🛑 Release during dimming - stopping");
      stopDimming();
    } else if (pressDuration < HOLD_DELAY && pressTypeRef.current !== 'hold') {
      // This was a tap action
      console.log("👆 Tap detected - toggling");
      handleToggle();
    }

    pressTypeRef.current = null;
  };

  // Handle touch cancel events (when finger moves off button)
  const handleTouchCancel = () => {
    console.log("❌ Touch cancelled - treating as release");
    handleButtonPressOut();
  };

  // Handle touch move events to maintain active state if still on button
  const handleTouchMove = (event) => {
    // This is a simplified check - in a real app you'd check if touch is still within button bounds
    // For now, we'll keep the touch active to prevent accidental cancellation
    if (!touchActiveRef.current && isDimming) {
      console.log("🔄 Touch moved but still dimming - keeping active");
      touchActiveRef.current = true;
    }
  };

  // Display functions
  const getDisplayColor = () => {
    if (error) return "#FF6B6B";
    if (isDimming) return "#FFB267";
    if (localIsOn) return "#FFB267";
    return "#666";
  };

  const getBrightnessText = () => {
    if (error) return "ERROR";
    if (isDimming) {
      return `${Math.round(localBrightness)}% ⟲`;
    }
    return localIsOn ? `${Math.round(localBrightness)}%` : "";
  };

  const getButtonText = () => {
    if (isDimming) return '⟲';
    if (isToggling) return '';
    return ''; // Remove the circle symbols
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Light name and combined button */}
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
        
        {/* Combined toggle/dim button */}
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
            borderWidth: isDimming ? 2 : 0,
            borderColor: isDimming ? "#FF8C00" : "transparent",
          }}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          onTouchCancel={handleTouchCancel}
          onTouchMove={handleTouchMove}
          disabled={false}
          activeOpacity={0.7}
          delayPressIn={0}
          delayPressOut={0}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={localIsOn ? "#000" : "#FFF"} />
          ) : isDimming ? (
            <Text style={{
              color: localIsOn ? "#000" : "#FFF",
              fontSize: 16,
              fontWeight: 'bold'
            }}>
              ⟲
            </Text>
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

      {/* Status indicator for dimming */}
      {isDimming && dimmingDirection && (
        <View style={{ marginTop: 5 }}>
          <Text style={{ 
            color: "#FFB267", 
            fontSize: 10,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Cycling {dimmingDirection.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Help text for new users */}
      {supportsDimming && localIsOn && !isDimming && !error && (
        <View style={{ marginTop: 5 }}>
          <Text style={{ 
            color: "#888", 
            fontSize: 9,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Tap: On/Off • Hold: Cycle brightness
          </Text>
        </View>
      )}
    </View>
  );
};

export default SimpleHoldToDimLight;