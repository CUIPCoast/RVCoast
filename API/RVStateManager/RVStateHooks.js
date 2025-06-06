// RVStateHooks.js - React hooks for accessing RV state

import { useState, useEffect, useCallback } from 'react';
import rvStateManager from './RVStateManager';

// Hook to subscribe to all state changes
export function useRVState() {
  const [state, setState] = useState(rvStateManager.getState());
  
  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = rvStateManager.subscribe(({ state }) => {
      setState(state);
    });
    
    return unsubscribe;
  }, []);
  
  return state;
}

// Hook to subscribe to a specific category of state
export function useRVCategoryState(category) {
  const [categoryState, setCategoryState] = useState(
    rvStateManager.getCategoryState(category)
  );
  
  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = rvStateManager.subscribe(({ category: changedCategory, state }) => {
      // Only update if our category changed
      if (category === changedCategory) {
        setCategoryState(state[category]);
      }
    });
    
    return unsubscribe;
  }, [category]);
  
  return categoryState;
}

// Hook for light controls
export function useRVLights() {
  const lights = useRVCategoryState('lights');
  
  const toggleLight = useCallback((lightId) => {
    const currentState = rvStateManager.getCategoryState('lights')[lightId];
    const isCurrentlyOn = currentState ? currentState.isOn : false;
    
    rvStateManager.updateLightState(lightId, !isCurrentlyOn);
  }, []);
  
  const setLightBrightness = useCallback((lightId, brightness) => {
    const currentState = rvStateManager.getCategoryState('lights')[lightId];
    const isOn = currentState ? currentState.isOn : false;
    
    // Only set brightness if light is on
    if (isOn) {
      rvStateManager.updateLightState(lightId, true, brightness);
    }
  }, []);
  
  const turnAllLightsOn = useCallback(() => {
    const allLights = {};
    Object.keys(rvStateManager.getCategoryState('lights')).forEach(lightId => {
      allLights[lightId] = {
        isOn: true,
        brightness: 50, // Default brightness
        lastUpdated: new Date().toISOString()
      };
    });
    
    rvStateManager.updateState('lights', allLights);
  }, []);
  
  const turnAllLightsOff = useCallback(() => {
    const allLights = {};
    Object.keys(rvStateManager.getCategoryState('lights')).forEach(lightId => {
      allLights[lightId] = {
        isOn: false,
        brightness: 0,
        lastUpdated: new Date().toISOString()
      };
    });
    
    rvStateManager.updateState('lights', allLights);
  }, []);
  
  return {
    lights,
    toggleLight,
    setLightBrightness,
    turnAllLightsOn,
    turnAllLightsOff
  };
}

// Hook for climate control
export function useRVClimate() {
  const climate = useRVCategoryState('climate');
  
  const setTemperature = useCallback((temperature) => {
    rvStateManager.updateClimateState({ temperature });
  }, []);
  
  const toggleCooling = useCallback(() => {
    const currentState = rvStateManager.getCategoryState('climate');
    const isCurrentlyOn = currentState.coolingOn || false;
    
    rvStateManager.updateClimateState({ coolingOn: !isCurrentlyOn });
  }, []);
  
  const toggleHeating = useCallback(() => {
    const currentState = rvStateManager.getCategoryState('climate');
    const isCurrentlyOn = currentState.heatingOn || false;
    
    rvStateManager.updateClimateState({ heatingOn: !isCurrentlyOn });
  }, []);
  
  // Add other climate functions
  
  return {
    climate,
    setTemperature,
    toggleCooling,
    toggleHeating
  };
}

// Hook for water systems
export function useRVWater() {
  const water = useRVCategoryState('water');
  
  const toggleWaterPump = useCallback(() => {
    const currentState = rvStateManager.getCategoryState('water');
    const isCurrentlyOn = currentState.pumpOn || false;
    
    rvStateManager.updateWaterState({ pumpOn: !isCurrentlyOn });
  }, []);
  
  const toggleWaterHeater = useCallback(() => {
    const currentState = rvStateManager.getCategoryState('water');
    const isCurrentlyOn = currentState.heaterOn || false;
    
    rvStateManager.updateWaterState({ heaterOn: !isCurrentlyOn });
  }, []);
  
  // Add other water system functions
  
  return {
    water,
    toggleWaterPump,
    toggleWaterHeater
  };
}

// Add hooks for other systems as needed