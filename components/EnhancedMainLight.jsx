import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { LightControlService } from '../Service/LightControlService';

const EnhancedMainLight = ({
  name,
  lightId,
  min = 0,
  max = 100,
  value = 0,
  isOn = false,
  onToggle = () => {},
  onValueChange = () => {},
  supportsDimming = false,
}) => {
  // Initialize with appropriate states
  const [localValue, setLocalValue] = useState(isOn ? value : 0);
  const [isChanging, setIsChanging] = useState(false);
  const [localIsOn, setLocalIsOn] = useState(isOn);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiConnection, setHasApiConnection] = useState(true); // Assume connection is good until proven otherwise
  const [apiTested, setApiTested] = useState(false);

  // Add a ref to track previous value
  const prevValueRef = useRef(value);
  
  // Add debounce timer ref
  const debounceTimerRef = useRef(null);

  // This useEffect syncs with parent component after initial render
  useEffect(() => {
    setLocalIsOn(isOn);
    // Only update value if light is on
    if (isOn) {
      setLocalValue(value);
    } else {
      setLocalValue(0);
    }
  }, [isOn, value]);

  // Handle slider value changes
  // Handle slider value changes - make this smoother
  const handleValueChange = (newValue) => {
    // Only update value - don't change on/off state during sliding
    if (localIsOn) {
      setLocalValue(newValue);
    }
  };

  // Handle when sliding is complete with better API handling
  const handleSlidingComplete = async () => {
    if (isLoading || !localIsOn) return;
    
    setIsLoading(true);
    try {
      // Only handle dimming if the light is already on
      if (supportsDimming) {
        const result = await LightControlService.setBrightness(lightId, localValue);
        if (result.success) {
          onValueChange(localValue);
        } else {
          // Reset to previous value on error
          setLocalValue(value);
        }
      }
    } catch (error) {
      console.error(`Failed to set brightness for ${name}:`, error);
      setLocalValue(value);
    } finally {
      setIsLoading(false);
    }
  };

  // Test API connection without showing errors to user
  const testApiConnection = async () => {
    try {
      const result = await LightControlService.toggleLight(lightId);
      // Immediately toggle back
      if (result.success) {
        await LightControlService.toggleLight(lightId);
      }
      
      setHasApiConnection(result.success);
      setApiTested(true);
      return result.success;
    } catch (error) {
      console.warn(`API connection test failed for ${name}:`, error);
      setHasApiConnection(false);
      setApiTested(true);
      return false;
    }
  };

  // Handle toggle button press
  const handleToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await LightControlService.toggleLight(lightId);
      if (result.success) {
        const newState = !localIsOn;
        setLocalIsOn(newState);
        
        // If turning on, set to default brightness
        if (newState) {
          const defaultValue = localValue > 0 ? localValue : 50;
          setLocalValue(defaultValue);
          
          // If dimming is supported, set the brightness
          if (supportsDimming) {
            await LightControlService.setBrightness(lightId, defaultValue);
            onValueChange(defaultValue);
          }
        } else {
          // Light turned off
          setLocalValue(0);
          onValueChange(0);
        }
        
        // Notify parent
        onToggle(newState);
      }
    } catch (error) {
      console.error(`Failed to toggle ${name}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if slider should be disabled
  const isSliderDisabled = isLoading || !localIsOn || (!supportsDimming && localIsOn);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFB267" />
        ) : (
          <TouchableOpacity 
            style={[
              styles.statusIndicator, 
              { backgroundColor: localIsOn ? '#FFB267' : '#666' }
            ]}
            onPress={handleToggle}
          />
        )}
      </View>

      <Slider
        value={localValue}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumValue={min}
        maximumValue={max}
        step={1}
        minimumTrackTintColor={localIsOn ? "#FFB267" : "#666"}
        maximumTrackTintColor="#333"
        thumbTintColor={localIsOn ? '#F8F8F8' : '#999'}
        style={styles.sliderContainer}
        disabled={isSliderDisabled}
      />
      
      {!hasApiConnection && apiTested && !isLoading && (
        <Text style={styles.errorText}>Connection error</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sliderContainer: {
    width: '100%',
    height: 40,
  },
  disabledSlider: {
    opacity: 0.5,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  }
});

export default EnhancedMainLight;