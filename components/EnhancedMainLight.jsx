import React, { useState, useEffect } from 'react';
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

  // This useEffect syncs with parent component after initial render
  useEffect(() => {
    console.log(`Update for ${lightId}: isOn=${isOn}, value=${value}`);
    // Always update local state to match parent state
    setLocalIsOn(isOn);
    setLocalValue(isOn ? value : 0);
  }, [isOn, value]);

  // Handle slider value changes
  const handleValueChange = (newValue) => {
    // Only allow value changes if light is on 
    if (localIsOn) {
      setIsChanging(true);
      setLocalValue(newValue);
      
      // Update on/off state based on slider position
      if (newValue === 0 && localIsOn) {
        setLocalIsOn(false);
      } else if (newValue > 0 && !localIsOn) {
        setLocalIsOn(true);
      }
    } else {
      // If light is off, don't allow slider movement
      // Reset slider to 0
      setLocalValue(0);
    }
  };

  // Handle when sliding is complete
  const handleSlidingComplete = async () => {
    // Only proceed if we're not loading
    if (isLoading) return;
    
    if (!apiTested) {
      // First time interacting with slider - let's test connection
      const connectionSuccessful = await testApiConnection();
      if (!connectionSuccessful) {
        // Reset the slider value if connection failed
        setLocalValue(isOn ? value : 0);
        setLocalIsOn(isOn);
        setIsChanging(false);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      if (!supportsDimming) {
        // For non-dimmable lights, only toggle on/off
        const shouldBeOn = localValue > 0;
        if (shouldBeOn !== localIsOn) {
          const result = await LightControlService.toggleLight(lightId);
          if (result.success) {
            setLocalIsOn(shouldBeOn);
            onToggle(shouldBeOn);
          } else {
            // Revert back if the request failed
            setHasApiConnection(false);
            setLocalValue(isOn ? value : 0);
            setLocalIsOn(isOn);
          }
        }
      } else {
        // For dimmable lights, update brightness
        if (localValue === 0 && localIsOn) {
          // Turn off if slider is at 0
          const result = await LightControlService.toggleLight(lightId);
          if (result.success) {
            setLocalIsOn(false);
            onToggle(false);
          } else {
            setHasApiConnection(false);
            setLocalValue(value);
          }
        } else if (localValue > 0) {
          // Update brightness and ensure light is on
          if (!localIsOn) {
            const result = await LightControlService.toggleLight(lightId);
            if (result.success) {
              setLocalIsOn(true);
              onToggle(true);
            } else {
              setHasApiConnection(false);
              setLocalValue(0);
              setIsChanging(false);
              return;
            }
          }
          
          const result = await LightControlService.setBrightness(lightId, localValue);
          if (result.success) {
            onValueChange(localValue);
          } else {
            setHasApiConnection(false);
            setLocalValue(isOn ? value : 0);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to control ${name}:`, error);
      // Update API connection status if we got an error
      setHasApiConnection(false);
      // Reset to previous state
      setLocalValue(isOn ? value : 0);
      setLocalIsOn(isOn);
    } finally {
      setIsLoading(false);
      setIsChanging(false);
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
      // If we haven't tested API yet or previous test failed, try now
      if (!apiTested || !hasApiConnection) {
        const connectionSuccessful = await testApiConnection();
        if (!connectionSuccessful) {
          console.warn(`Cannot connect to light control system for ${name}`);
          return; // Exit early if connection test failed
        }
      }
      
      const result = await LightControlService.toggleLight(lightId);
      if (result.success) {
        const newState = !localIsOn;
        setLocalIsOn(newState);
        
        // Update slider value when toggling on/off
        if (!newState) {
          setLocalValue(0);
          onValueChange(0);
        } else if (newState && localValue === 0) {
          // When turning on, set to default value if slider was at 0
          const defaultValue = 50;
          setLocalValue(defaultValue);
          onValueChange(defaultValue);
          
          if (supportsDimming) {
            await LightControlService.setBrightness(lightId, defaultValue);
          }
        }
        
        onToggle(newState);
      } else {
        setHasApiConnection(false);
        console.warn(`Failed to toggle ${name}`);
      }
    } catch (error) {
      console.error(`Failed to toggle ${name}:`, error);
      setHasApiConnection(false);
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