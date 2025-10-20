// components/SimpleHoldToDimLight.jsx - FIXED VERSION
// Single button: Tap to toggle, Hold to dim (up/down based on current brightness)
// Uses DC Dimmer Command 2 protocol: Command 13 (Ramp Up), Command 14 (Ramp Down), Command 04 (Stop)
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { LightControlService } from "../Service/LightControlService";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { FontFamily } from "../GlobalStyles";

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
  const pressStartTimeRef = useRef(null);
  const pressTypeRef = useRef(null); // 'tap' or 'hold'
  const touchActiveRef = useRef(false); // Track if touch is still active
  const lastBrightnessRef = useRef(value); // Track last known brightness

  // Constants for timing
  const HOLD_DELAY = 500; // 500ms to distinguish between tap and hold

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
      rampingRef.current = false;
      touchActiveRef.current = false;
    };
  }, []);

  // Sync with global state from RV State Manager
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        const lightState = state.lights?.[lightId];
        // Only block updates during active dimming to prevent interference
        // But allow updates when not dimming so state persists on navigation
        if (lightState) {
          if (!isDimming) {
            setLocalIsOn(lightState.isOn);
            setLocalBrightness(lightState.brightness || 0);
            lastBrightnessRef.current = lightState.brightness || 0;
          } else {
            // During dimming, only update lastBrightnessRef to track latest value
            lastBrightnessRef.current = lightState.brightness || 0;
          }
        }
      }
    });

    // Initialize from current state on mount/navigation
    const currentState = rvStateManager.getCategoryState('lights')?.[lightId];
    if (currentState) {
      setLocalIsOn(currentState.isOn);
      setLocalBrightness(currentState.brightness || 0);
      lastBrightnessRef.current = currentState.brightness || 0;
    }

    return unsubscribe;
  }, [lightId, isDimming]);

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
        lastBrightnessRef.current = 0;
        
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
        lastBrightnessRef.current = targetBrightness;
      }
      
    } catch (error) {
      setError(`Toggle failed: ${error.message}`);
      console.error(`❌ Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Start cycle dimming - continuously dim down to 0%, then back up to 100%
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

      // Start from current brightness and go down
      let currentBrightness = localBrightness;
      let direction = 'down';
      setDimmingDirection(direction);

      console.log(`🔄 Starting dimming cycle for ${lightId} - starting at ${currentBrightness}%`);

      // Start the dimming loop
      const dimmingLoop = async () => {
        while (rampingRef.current && touchActiveRef.current) {
          try {
            // Calculate next brightness value
            if (direction === 'down') {
              currentBrightness -= 2; // Decrease by 2% each step
              if (currentBrightness <= 0) {
                currentBrightness = 0;
                direction = 'up'; // Switch to brightening
                setDimmingDirection('up');
                console.log('📉 Reached 0%, switching to brighten');
              }
            } else {
              currentBrightness += 2; // Increase by 2% each step
              if (currentBrightness >= 100) {
                currentBrightness = 100;
                direction = 'down'; // Switch back to dimming
                setDimmingDirection('down');
                console.log('📈 Reached 100%, switching to dim');
              }
            }

            // Convert percentage to 0-200 range (0xC8 = 200 = 100%)
            const brightnessValue = Math.round((currentBrightness / 100) * 200);
            const brightnessHex = brightnessValue.toString(16).padStart(2, '0').toUpperCase();

            // Send set level command (Command 00 = Set Level)
            const command = `19FEDB9F#${prefix}FF${brightnessHex}000000FFFF`;
            await executeCommandWithRetry(command, 0, 0);

            // CRITICAL: Force ON state at all brightness levels during dimming
            // This prevents the button from turning off when brightness goes below 30%
            setLocalIsOn(true);
            setLocalBrightness(currentBrightness);
            lastBrightnessRef.current = currentBrightness;

            // Update state manager periodically but not too frequently
            // Update every 5 steps (every 10% change) to keep state in sync
            if (Math.round(currentBrightness) % 10 === 0 || currentBrightness === 0 || currentBrightness === 100) {
              rvStateManager.updateLightState(lightId, true, currentBrightness);
            }

            // Wait before next step (50ms = ~20 steps per second)
            await new Promise(resolve => setTimeout(resolve, 50));

          } catch (error) {
            console.error('❌ Error in dimming loop:', error);
            break;
          }
        }

        // Clean up when loop exits
        if (!rampingRef.current || !touchActiveRef.current) {
          console.log('🛑 Dimming loop stopped');
        }
      };

      // Start the loop
      dimmingLoop();

    } catch (error) {
      setError(`Dimming failed: ${error.message}`);
      console.error("❌ Error starting dimming:", error);
      stopDimming();
    }
  };

  // Stop dimming
  const stopDimming = async () => {
    if (!rampingRef.current) return;

    try {
      console.log(`🛑 Stopping dimming for ${lightId} at ${localBrightness.toFixed(1)}%`);
      rampingRef.current = false;
      touchActiveRef.current = false;

      // Ensure the light stays ON at the final brightness level
      const finalBrightness = localBrightness;
      if (finalBrightness > 0) {
        setLocalIsOn(true);
        rvStateManager.updateLightState(lightId, true, finalBrightness);
        lastBrightnessRef.current = finalBrightness;
      }

    } catch (error) {
      console.error("❌ Error stopping dimming:", error);
    } finally {
      setIsDimming(false);
      setDimmingDirection(null);
    }
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
    console.log("❌ Touch cancelled - stopping dimming and treating as release");
    touchActiveRef.current = false;
    if (isDimming) {
      stopDimming();
    }
    handleButtonPressOut();
  };

  // IMPROVED touch move handler to maintain dimming
  const handleTouchMove = (event) => {
    // Keep touch active during dimming to prevent interruption
    if (isDimming && rampingRef.current) {
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
          flex: 1,
          fontFamily: FontFamily.latoRegular
        }}>
          {name}
        </Text>
        
        {/* Brightness indicator */}
        <Text style={{
          color: getDisplayColor(),
          fontSize: 12,
          marginRight: 15, // Increased margin to push button left
          minWidth: 80,
          textAlign: 'center',
          fontFamily: FontFamily.latoBold
        }}>
          {getBrightnessText()}
        </Text>
        
        {/* Combined toggle/dim button - MOVED LEFT */}
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
            marginRight: 10,
            marginTop: 15,
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
              fontFamily: FontFamily.latoRegular,
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
            textAlign: 'center',
            fontFamily: FontFamily.latoRegular
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
            fontStyle: 'italic',
            fontFamily: FontFamily.latoRegular
          }}>
            Cycling {dimmingDirection.toUpperCase()} • Hold to continue
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
            fontStyle: 'italic',
            fontFamily: FontFamily.latoLight
          }}>
            Tap: On/Off • Hold: Cycle brightness
          </Text>
        </View>
      )}
    </View>
  );
};

export default SimpleHoldToDimLight;