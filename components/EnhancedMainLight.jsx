// components/EnhancedMainLight.jsx - Fixed with better error handling
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import Slider from "@react-native-community/slider";
import { LightControlService } from "../Service/LightControlService";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const EnhancedMainLight = ({ 
  name, 
  lightId, 
  min = 0, 
  max = 100, 
  isOn = false,
  value = 50,
  supportsDimming = true 
}) => {
  // Local state for immediate UI feedback
  const [localIsOn, setLocalIsOn] = useState(isOn);
  const [localBrightness, setLocalBrightness] = useState(value);
  const [isToggling, setIsToggling] = useState(false);
  const [isDimming, setIsDimming] = useState(false);
  const [dimmingProgress, setDimmingProgress] = useState(null);
  const [error, setError] = useState(null);
  
  // Track last executed brightness to prevent unnecessary commands
  const [lastExecutedBrightness, setLastExecutedBrightness] = useState(value);
  
  // Debouncing for slider changes
  const sliderTimeout = useRef(null);
  const lastSliderChange = useRef(Date.now());

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
      setLastExecutedBrightness(currentState.brightness || 0);
    }

    return unsubscribe;
  }, [lightId]);

  // Validate that LightControlService methods exist
  const validateService = () => {
    if (!LightControlService) {
      throw new Error('LightControlService is not available');
    }
    
    const requiredMethods = ['turnOnLight', 'turnOffLight', 'setBrightness', 'cancelDimming'];
    const missingMethods = requiredMethods.filter(method => 
      typeof LightControlService[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      throw new Error(`LightControlService missing methods: ${missingMethods.join(', ')}`);
    }
  };

  // Handle toggle (on/off)
  const handleToggle = async () => {
    if (isToggling || isDimming) return;

    try {
      validateService();
      setError(null);
      setIsToggling(true);
      
      if (localIsOn) {
        // Turn off
        console.log(`Turning off ${lightId}`);
        const result = await LightControlService.turnOffLight(lightId);
        
        if (result && result.success) {
          // Update RV State Manager
          rvStateManager.updateLightState(lightId, false, 0);
          setLocalIsOn(false);
          setLocalBrightness(0);
          setLastExecutedBrightness(0);
        } else {
          const errorMsg = result?.error || 'Unknown error occurred';
          setError(`Failed to turn off: ${errorMsg}`);
          console.error(`Failed to turn off ${name}:`, errorMsg);
        }
      } else {
        // Turn on to previous brightness or 100%
        const targetBrightness = lastExecutedBrightness > 0 ? lastExecutedBrightness : 100;
        console.log(`Turning on ${lightId} to ${targetBrightness}%`);
        
        if (supportsDimming && targetBrightness < 100) {
          // Use ramp dimming to restore previous brightness
          await handleBrightnessChange(targetBrightness, true);
        } else {
          // Turn on to full brightness
          const result = await LightControlService.turnOnLight(lightId);
          
          if (result && result.success) {
            // Update RV State Manager
            rvStateManager.updateLightState(lightId, true, 100);
            setLocalIsOn(true);
            setLocalBrightness(100);
            setLastExecutedBrightness(100);
          } else {
            const errorMsg = result?.error || 'Unknown error occurred';
            setError(`Failed to turn on: ${errorMsg}`);
            console.error(`Failed to turn on ${name}:`, errorMsg);
          }
        }
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error occurred';
      setError(errorMsg);
      console.error(`Error toggling ${lightId}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  // Handle brightness changes with debouncing and ramp dimming
  const handleBrightnessChange = async (newBrightness, immediate = false) => {
    if (!supportsDimming) return;
    
    try {
      validateService();
      setError(null);
    } catch (validationError) {
      setError(validationError.message);
      console.error('Service validation failed:', validationError);
      return;
    }
    
    // Update local state immediately for smooth UI
    setLocalBrightness(newBrightness);
    lastSliderChange.current = Date.now();

    // Clear existing timeout
    if (sliderTimeout.current) {
      clearTimeout(sliderTimeout.current);
    }

    // Set up new timeout for debounced execution
    const delay = immediate ? 0 : 500; // 500ms debounce for slider, immediate for programmatic changes
    
    sliderTimeout.current = setTimeout(async () => {
      // Skip if brightness hasn't actually changed significantly
      if (Math.abs(newBrightness - lastExecutedBrightness) < 2 && !immediate) {
        return;
      }

      // Skip if another brightness change is in progress
      if (isDimming && !immediate) {
        return;
      }

      try {
        setIsDimming(true);
        setDimmingProgress({ current: localBrightness, target: newBrightness });
        
        console.log(`Setting ${lightId} brightness to ${newBrightness}% using ramp dimming`);

        // Progress callback for ramp dimming
        const onProgress = (currentBrightness, targetBrightness) => {
          setDimmingProgress({ current: currentBrightness, target: targetBrightness });
          
          // Update local brightness to show progress
          setLocalBrightness(currentBrightness);
          
          // Update RV State Manager with progress
          rvStateManager.updateLightState(lightId, currentBrightness > 0, currentBrightness);
        };

        // Execute ramp dimming
        const result = await LightControlService.setBrightness(lightId, newBrightness, onProgress);
        
        if (result && result.success) {
          const finalBrightness = result.brightness || newBrightness;
          
          // Update final state
          rvStateManager.updateLightState(lightId, finalBrightness > 0, finalBrightness);
          setLocalIsOn(finalBrightness > 0);
          setLocalBrightness(finalBrightness);
          setLastExecutedBrightness(finalBrightness);
          
          console.log(`Successfully set ${lightId} to ${finalBrightness}%`);
          
          if (result.limitReached) {
            console.log(`Brightness limit reached for ${lightId}`);
          }
        } else {
          const errorMsg = result?.error || 'Unknown error occurred';
          setError(`Dimming failed: ${errorMsg}`);
          console.error(`Failed to set brightness for ${lightId}:`, errorMsg);
          
          // Revert to last known good state
          const currentState = rvStateManager.getCategoryState('lights')?.[lightId];
          if (currentState) {
            setLocalBrightness(currentState.brightness || 0);
          }
        }
      } catch (error) {
        const errorMsg = error.message || 'Unknown error occurred';
        setError(`Dimming error: ${errorMsg}`);
        console.error(`Error setting brightness for ${lightId}:`, error);
      } finally {
        setIsDimming(false);
        setDimmingProgress(null);
      }
    }, delay);
  };

  // Handle slider value changes (with debouncing)
  const handleSliderChange = (value) => {
    if (!supportsDimming) return;
    
    const roundedValue = Math.round(value);
    handleBrightnessChange(roundedValue);
  };

  // Cancel active dimming operation
  const handleCancelDimming = async () => {
    if (isDimming) {
      try {
        validateService();
        await LightControlService.cancelDimming(lightId);
        setIsDimming(false);
        setDimmingProgress(null);
        setError(null);
      } catch (error) {
        const errorMsg = error.message || 'Unknown error occurred';
        setError(`Cancel failed: ${errorMsg}`);
        console.error(`Error cancelling dimming for ${lightId}:`, error);
      }
    }
  };

  // Get display color based on state
  const getDisplayColor = () => {
    if (error) return "#FF6B6B"; // Red for error
    if (isDimming) return "#FFB267"; // Orange while dimming
    if (localIsOn) return "#FFB267"; // Orange when on
    return "#666"; // Gray when off
  };

  // Get brightness percentage for display
  const getBrightnessText = () => {
    if (error) return "ERROR";
    if (isDimming && dimmingProgress) {
      return `${Math.round(dimmingProgress.current)}% → ${dimmingProgress.target}%`;
    }
    return localIsOn ? `${Math.round(localBrightness)}%` : "OFF";
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Light name and toggle button */}
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: supportsDimming ? 10 : 0
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
          minWidth: 60,
          textAlign: 'center'
        }}>
          {getBrightnessText()}
        </Text>
        
        {/* Toggle button with loading state */}
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
          onPress={handleToggle}
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

      {/* Dimming slider (only show if dimming is supported and light is on) */}
      {supportsDimming && localIsOn && !error && (
        <View style={{ marginTop: 5 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Slider
              style={{ 
                flex: 1, 
                height: 30,
                marginRight: 10
              }}
              minimumValue={1} // Don't allow 0 via slider (use toggle for off)
              maximumValue={max}
              value={localBrightness}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={isDimming ? "#FFB267" : "#FFB267"}
              maximumTrackTintColor="#444"
              thumbStyle={{
                backgroundColor: isDimming ? "#FFB267" : "#FFB267",
                width: 20,
                height: 20
              }}
              disabled={isDimming || isToggling}
            />
            
            {/* Cancel dimming button (show when dimming) */}
            {isDimming && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#666",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 10
                }}
                onPress={handleCancelDimming}
              >
                <Text style={{ color: "#FFF", fontSize: 10 }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Progress indicator when dimming */}
          {isDimming && dimmingProgress && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'center', 
              marginTop: 5 
            }}>
              <ActivityIndicator size="small" color="#FFB267" />
              <Text style={{ 
                color: "#FFB267", 
                fontSize: 10, 
                marginLeft: 5 
              }}>
                Dimming to {dimmingProgress.target}%...
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default EnhancedMainLight;