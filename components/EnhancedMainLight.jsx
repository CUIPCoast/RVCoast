import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Slider } from 'react-native-elements';
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
  const [localValue, setLocalValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  const [localIsOn, setLocalIsOn] = useState(isOn);
  
  // Update local value when prop changes
  useEffect(() => {
    if (!isChanging) {
      setLocalValue(value);
    }
  }, [value]);
  
  // Update local on state when prop changes
  useEffect(() => {
    setLocalIsOn(isOn);
  }, [isOn]);

  // Handle slider value change
  const handleValueChange = (newValue) => {
    setIsChanging(true);
    setLocalValue(newValue);
    
    // If the value goes to 0, consider the light off
    if (newValue === 0 && localIsOn) {
      setLocalIsOn(false);
    } 
    // If the value increases from 0, consider the light on
    else if (newValue > 0 && !localIsOn) {
      setLocalIsOn(true);
    }
  };

  // Handle slider done
  const handleSlidingComplete = async () => {
    setIsChanging(false);
    
    // Call parent handler with new value
    onValueChange(localValue);
    
    // If dimming is not supported, we toggle the light based on slider value
    if (!supportsDimming) {
      const shouldBeOn = localValue > 0;
      
      // Only toggle if the state needs to change
      if (shouldBeOn !== localIsOn) {
        try {
          await LightControlService.toggleLight(lightId);
          setLocalIsOn(shouldBeOn);
          onToggle(shouldBeOn);
        } catch (error) {
          console.error(`Failed to toggle ${name}:`, error);
        }
      }
    } else {
      // If dimming is supported (future implementation)
      try {
        await LightControlService.setBrightness(lightId, localValue);
      } catch (error) {
        console.error(`Failed to set brightness for ${name}:`, error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <TouchableOpacity 
          style={[styles.statusIndicator, { backgroundColor: localIsOn ? '#FFB267' : '#666' }]}
          onPress={async () => {
            try {
              await LightControlService.toggleLight(lightId);
              const newState = !localIsOn;
              setLocalIsOn(newState);
              onToggle(newState);
              
              // If turning off, set slider to 0
              if (!newState) {
                setLocalValue(0);
                onValueChange(0);
              } 
              // If turning on and value is 0, set to a default value
              else if (newState && localValue === 0) {
                setLocalValue(50);
                onValueChange(50);
              }
            } catch (error) {
              console.error(`Failed to toggle ${name}:`, error);
            }
          }}
        />
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
        thumbStyle={[
          styles.customThumb, 
          { backgroundColor: localIsOn ? '#F8F8F8' : '#999' }
        ]}
        trackStyle={styles.trackStyle}
        containerStyle={styles.sliderContainer}
        accessibilityLabel={`${name} slider`}
        accessibilityValue={{ min, max, now: localValue }}
        disabled={!supportsDimming && !localIsOn}
      />
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
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sliderContainer: {
    width: '100%',
    height: 6,
    borderRadius: 6,
  },
  trackStyle: {
    height: 3,
    borderRadius: 6,
    marginBottom: 10,
    top: 15,
    shadowColor: '#FFB267',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  customThumb: {
    paddingTop: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: '#6B6869',
    borderWidth: 4,
  },
});

export default EnhancedMainLight;