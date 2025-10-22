import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable, TouchableOpacity, Image, ScrollView, Modal, Button, ActivityIndicator, Animated } from "react-native";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";

import useScreenSize from "../helper/useScreenSize.jsx";
import AwningControlModal from "../components/AwningControlModal";
import HeaterControlModal from "../components/HeaterControlModal";
import AddDeviceModal from "../components/AddDeviceModal";
import ScheduleLightsModal from "../components/ScheduleLightsModal";
import { LightService, FanService, WaterService } from "../API/RVControlServices"; 
import MasterLightControl from "../components/MasterLightControl.jsx";
import { Feather as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FanButton from "../components/FanButton";
import WaterButton from "../components/WaterButton";


import Ionicons from '@expo/vector-icons/Ionicons';

// Import RV State Management hooks
import { useRVLights, useRVWater } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { LightControlService } from "../Service/LightControlService.js";

import {
  Padding,
  Border,
  Color,
  FontFamily,
  FontSize,
} from "../GlobalStyles";

const TABS = {
  MAIN: "Main",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
};

// Light IDs to display names mapping
const lightDisplayNames = {
  'kitchen_lights': 'Kitchen Light',
  'bath_light': 'Bathroom Light',
  'bed_ovhd_light': 'Bed Light',
  'vibe_light': 'Accent Light',
  'vanity_light': 'Vanity Light',
  'awning_lights': 'Awning Lights',
  'shower_lights': 'Shower Light',
  'under_cab_lights': 'Cabinet Light',
  'hitch_lights': 'Hitch Light',
  'porch_lights': 'Porch Light', 
  'left_reading_lights': 'Left Reading Light',
  'right_reading_lights': 'Right Reading Light',
  'dinette_lights': 'Dining Light',
  'strip_lights': 'Strip Light',
  'wardrobe_lights': 'Wardrobe Light'
};

// Light groups by category - Updated to match LightScreenTablet structure
const lightGroups = {
  main: [
    'kitchen_lights',
    'dinette_lights', 
    'under_cab_lights',
    'strip_lights',
    'awning_lights',
    'porch_lights',
    'hitch_lights'
  ],
  bedroom: [
    'bed_ovhd_light',
    'left_reading_lights',
    'right_reading_lights',
    'vibe_light'
  ],
  bathroom: [
    'bath_light',
    'vanity_light',
    'shower_lights'
  ]
};


const Devices = () => {
  const [isOn, setIsOn] = useState(false);
  const isTablet = useScreenSize();
  const [selectedTab, setSelectedTab] = useState(TABS.MAIN);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHeaterModalVisible, setHeaterModalVisible] = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [isAddDeviceModalVisible, setAddDeviceModalVisible] = useState(false);
  const [isScheduleLightsModalVisible, setScheduleLightsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use RV State Management hooks
  const { lights, toggleLight, setLightBrightness: updateLightBrightness, turnAllLightsOn, turnAllLightsOff } = useRVLights();

  // Water button states with RVStateManager for cross-screen sync (similar to Vents.jsx pattern)
  const [isWaterHeaterOn, setWaterHeaterOn] = useState(false);
  const [isWaterPumpOn, setWaterPumpOn] = useState(false);

  // Use refs to track previous values and prevent unnecessary effects
  const prevWaterHeaterRef = useRef(false);
  const prevWaterPumpRef = useRef(false);
  const isWaterInitializedRef = useRef(false);

  // Initialize water states from AsyncStorage and RVStateManager on mount (similar to Vents.jsx pattern)
  useEffect(() => {
    const initializeWaterState = async () => {
      try {
        // First try to load from AsyncStorage
        const savedWaterHeater = await AsyncStorage.getItem('waterHeaterState');
        const savedWaterPump = await AsyncStorage.getItem('waterPumpState');

        if (savedWaterHeater != null) {
          const state = JSON.parse(savedWaterHeater);
          setWaterHeaterOn(state);
          prevWaterHeaterRef.current = state;
          rvStateManager.updateState('water', {
            heaterOn: { isOn: state, lastUpdated: new Date().toISOString() }
          });
        }
        if (savedWaterPump != null) {
          const state = JSON.parse(savedWaterPump);
          setWaterPumpOn(state);
          prevWaterPumpRef.current = state;
          rvStateManager.updateState('water', {
            pumpOn: { isOn: state, lastUpdated: new Date().toISOString() }
          });
        }

        // Also check RVStateManager in case it has newer data
        const waterState = rvStateManager.getCategoryState('water');
        if (waterState.heaterOn?.isOn !== undefined && savedWaterHeater == null) {
          setWaterHeaterOn(waterState.heaterOn.isOn);
          prevWaterHeaterRef.current = waterState.heaterOn.isOn;
        }
        if (waterState.pumpOn?.isOn !== undefined && savedWaterPump == null) {
          setWaterPumpOn(waterState.pumpOn.isOn);
          prevWaterPumpRef.current = waterState.pumpOn.isOn;
        }

        isWaterInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing water state:', error);
        isWaterInitializedRef.current = true;
      }
    };

    initializeWaterState();
  }, []);

  // Subscribe to external water state changes (from MainScreen.jsx)
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (!isWaterInitializedRef.current) return; // Don't process until initialized

      if (newState.water) {
        // External water control changes handled silently
        if (newState.water.heaterOn?.isOn !== undefined &&
            newState.water.heaterOn.isOn !== prevWaterHeaterRef.current) {
          console.log('Devices: External water heater change detected:', newState.water.heaterOn.isOn);
          setWaterHeaterOn(newState.water.heaterOn.isOn);
          prevWaterHeaterRef.current = newState.water.heaterOn.isOn;
        }

        if (newState.water.pumpOn?.isOn !== undefined &&
            newState.water.pumpOn.isOn !== prevWaterPumpRef.current) {
          console.log('Devices: External water pump change detected:', newState.water.pumpOn.isOn);
          setWaterPumpOn(newState.water.pumpOn.isOn);
          prevWaterPumpRef.current = newState.water.pumpOn.isOn;
        }
      }
    });

    return unsubscribe;
  }, []);

  // Persist water state changes to AsyncStorage
  useEffect(() => {
    if (!isWaterInitializedRef.current) return; // Don't persist until initialized

    const persistWaterState = async () => {
      try {
        await AsyncStorage.multiSet([
          ['waterHeaterState', JSON.stringify(isWaterHeaterOn)],
          ['waterPumpState', JSON.stringify(isWaterPumpOn)],
        ]);
      } catch (error) {
        console.error('Error persisting water state:', error);
      }
    };

    persistWaterState();

    // Update refs to track current values
    prevWaterHeaterRef.current = isWaterHeaterOn;
    prevWaterPumpRef.current = isWaterPumpOn;
  }, [isWaterHeaterOn, isWaterPumpOn]);

  // Fan control states with RVStateManager for cross-screen sync
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);

  // Use refs to track previous values and prevent unnecessary effects
  const prevBathroomFanRef = useRef(isBathroomFanOn);
  const prevBayVentFanRef = useRef(isBayVentFanOn);
  const isVentInitializedRef = useRef(false);

  // Initialize vent fan states from RVStateManager on mount
  useEffect(() => {
    const initializeVentState = async () => {
      try {
        const fanState = rvStateManager.getCategoryState('fans');

        if (fanState.bathroomFan?.isOn !== undefined) {
          setBathroomFanOn(fanState.bathroomFan.isOn);
          prevBathroomFanRef.current = fanState.bathroomFan.isOn;
        }
        if (fanState.bayVentFan?.isOn !== undefined) {
          setBayVentFanOn(fanState.bayVentFan.isOn);
          prevBayVentFanRef.current = fanState.bayVentFan.isOn;
        }
        isVentInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing vent fan state:', error);
        isVentInitializedRef.current = true;
      }
    };

    initializeVentState();
  }, []);

  // Subscribe to external vent fan state changes (from Vents.jsx)
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (!isVentInitializedRef.current) return; // Don't process until initialized

      if (newState.fans) {
        // External fan control changes handled silently
        if (newState.fans.bathroomFan?.isOn !== undefined &&
            newState.fans.bathroomFan.isOn !== prevBathroomFanRef.current) {
          console.log('Devices: External bathroom fan change detected:', newState.fans.bathroomFan.isOn);
          setBathroomFanOn(newState.fans.bathroomFan.isOn);
          prevBathroomFanRef.current = newState.fans.bathroomFan.isOn;
        }

        if (newState.fans.bayVentFan?.isOn !== undefined &&
            newState.fans.bayVentFan.isOn !== prevBayVentFanRef.current) {
          console.log('Devices: External bay vent fan change detected:', newState.fans.bayVentFan.isOn);
          setBayVentFanOn(newState.fans.bayVentFan.isOn);
          prevBayVentFanRef.current = newState.fans.bayVentFan.isOn;
        }
      }
    });

    return unsubscribe;
  }, []);
  
  // State for API operation status
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  // State for individual light states - now managed by RV state manager
  const [lightStates, setLightStates] = useState({});
  const [localLightBrightness, setLocalLightBrightness] = useState({});
  
  // State for master light switch - independent from individual lights
  const [masterLightOn, setMasterLightOn] = useState(false);

  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();

  // Initialize light states from RV state manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get current light state from RV state manager
        const currentLightState = rvStateManager.getCategoryState('lights');
        const currentWaterState = rvStateManager.getCategoryState('water');
        
        // Combine all light groups to get all lights
        const allLights = [
          ...lightGroups.main,
          ...lightGroups.bedroom,
          ...lightGroups.bathroom
        ];
        
        // Remove duplicates
        const uniqueLights = [...new Set(allLights)];
        
        // Initialize from RV state manager or set defaults
        const initialLightStates = {};
        const initialLightBrightness = {};
        
        uniqueLights.forEach(lightId => {
          if (currentLightState[lightId]) {
            initialLightStates[lightId] = currentLightState[lightId].isOn || false;
            initialLightBrightness[lightId] = currentLightState[lightId].brightness || 50;
          } else {
            initialLightStates[lightId] = false;
            initialLightBrightness[lightId] = 50;
            // Initialize in RV state manager
            rvStateManager.updateLightState(lightId, false, 50);
          }
        });
        
        setLightStates(initialLightStates);
        setLocalLightBrightness(initialLightBrightness);
        
        // Set master light state based on any lights being on
        const anyLightOn = Object.values(initialLightStates).some(state => state);
        setMasterLightOn(anyLightOn);
        
        // Fall back to AsyncStorage for backwards compatibility and sync to RV state
        try {
          const savedLightStates = await AsyncStorage.getItem('lightStates');
          const savedSliderValues = await AsyncStorage.getItem('sliderValues');
          
          if (savedLightStates) {
            const savedStates = JSON.parse(savedLightStates);
            // Update RV state manager with saved states
            Object.entries(savedStates).forEach(([lightId, isOn]) => {
              const brightness = initialLightBrightness[lightId] || 50;
              rvStateManager.updateLightState(lightId, isOn, brightness);
            });
            setLightStates(savedStates);
          }
          
          if (savedSliderValues) {
            const savedValues = JSON.parse(savedSliderValues);
            // Update RV state manager with saved values
            Object.entries(savedValues).forEach(([lightId, brightness]) => {
              const isOn = initialLightStates[lightId] || false;
              rvStateManager.updateLightState(lightId, isOn, brightness);
            });
            setLocalLightBrightness(savedValues);
          }
        } catch (error) {
          console.error('Error loading saved light states from AsyncStorage:', error);
        }
        
      } catch (error) {
        console.error('Error initializing Devices state:', error);
      }
    };
    
    initializeState();
  }, []);

  // Subscribe to RV State Manager for light states
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        const currentLights = state.lights || {};
        const newLightStates = {};
        const newLightBrightness = {};
        
        Object.entries(currentLights).forEach(([lightId, lightState]) => {
          newLightStates[lightId] = lightState.isOn;
          newLightBrightness[lightId] = lightState.brightness || 0;
        });
        
        setLightStates(newLightStates);
        setLocalLightBrightness(newLightBrightness);
      }
    });

    // Initialize light states on component mount
    const currentLights = rvStateManager.getCategoryState('lights');
    const initialLightStates = {};
    const initialLightBrightness = {};
    
    Object.entries(currentLights).forEach(([lightId, lightState]) => {
      initialLightStates[lightId] = lightState ? lightState.isOn : false;
      initialLightBrightness[lightId] = lightState ? lightState.brightness || 0 : 0;
    });
    
    setLightStates(initialLightStates);
    setLocalLightBrightness(initialLightBrightness);

    return unsubscribe;
  }, []);

  // Subscribe to external state changes from RV state manager
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.lights) {
        // Update local state when external light changes occur
        const updatedLightStates = {};
        const updatedLightBrightness = {};
        let hasChanges = false;
        
        Object.entries(newState.lights).forEach(([lightId, lightData]) => {
          if (lightData.isOn !== lightStates[lightId] || lightData.brightness !== localLightBrightness[lightId]) {
            updatedLightStates[lightId] = lightData.isOn;
            updatedLightBrightness[lightId] = lightData.brightness;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          setLightStates(prev => ({ ...prev, ...updatedLightStates }));
          setLocalLightBrightness(prev => ({ ...prev, ...updatedLightBrightness }));
          
          // External light changes handled silently
        }
      }
      
      if (newState.water) {
        // External water system changes handled silently
      }
    });
    
    return unsubscribe;
  }, [lightStates, localLightBrightness]);

  // Sync light states to AsyncStorage when they change (backwards compatibility)
  useEffect(() => {
    const saveLightStates = async () => {
      try {
        await AsyncStorage.setItem('lightStates', JSON.stringify(lightStates));
        await AsyncStorage.setItem('sliderValues', JSON.stringify(localLightBrightness));
      } catch (error) {
        console.error('Error saving light states:', error);
      }
    };
    
    // Only save if states have been initialized (not empty objects)
    if (Object.keys(lightStates).length > 0) {
      saveLightStates();
    }
  }, [lightStates, localLightBrightness]);

  // Show status message helper
  const showStatusMessage = (message, duration = 3000) => {
    setStatusMessage(message);
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), duration);
  };

  // Handle bathroom fan toggle with API integration
  // Handle bathroom fan toggle with RVStateManager sync
  const toggleBathroomFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBathroomFanOn;

      // Optimistic UI update
      setBathroomFanOn(newState);
      prevBathroomFanRef.current = newState;

      // Update RV state manager for cross-screen sync
      rvStateManager.updateState('fans', {
        bathroomFan: {
          isOn: newState,
          lastUpdated: new Date().toISOString()
        }
      });

      const result = await FanService.toggleBathroomFan();

      if (result.success) {
        // Show status message
        setStatusMessage(`Bathroom fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bathroom fan:', result.error);

        // Revert on error
        setBathroomFanOn(!newState);
        prevBathroomFanRef.current = !newState;
        rvStateManager.updateState('fans', {
          bathroomFan: {
            isOn: !newState,
            lastUpdated: new Date().toISOString()
          }
        });

        // Show error message
        setStatusMessage('Failed to toggle bathroom fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bathroom fan:', error);

      // Revert on error
      const revertedState = !isBathroomFanOn;
      setBathroomFanOn(revertedState);
      prevBathroomFanRef.current = revertedState;
      rvStateManager.updateState('fans', {
        bathroomFan: {
          isOn: revertedState,
          lastUpdated: new Date().toISOString()
        }
      });

      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle bay vent fan toggle with RVStateManager sync
  const toggleBayVentFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBayVentFanOn;

      // Optimistic UI update
      setBayVentFanOn(newState);
      prevBayVentFanRef.current = newState;

      // Update RV state manager for cross-screen sync
      rvStateManager.updateState('fans', {
        bayVentFan: {
          isOn: newState,
          lastUpdated: new Date().toISOString()
        }
      });

      const result = await FanService.toggleBayVentFan();

      if (result.success) {
        // Show status message
        setStatusMessage(`Bay vent fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bay vent fan:', result.error);

        // Revert on error
        setBayVentFanOn(!newState);
        prevBayVentFanRef.current = !newState;
        rvStateManager.updateState('fans', {
          bayVentFan: {
            isOn: !newState,
            lastUpdated: new Date().toISOString()
          }
        });

        // Show error message
        setStatusMessage('Failed to toggle bay vent fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bay vent fan:', error);

      // Revert on error
      const revertedState = !isBayVentFanOn;
      setBayVentFanOn(revertedState);
      prevBayVentFanRef.current = revertedState;
      rvStateManager.updateState('fans', {
        bayVentFan: {
          isOn: revertedState,
          lastUpdated: new Date().toISOString()
        }
      });

      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Water heater toggle with RVStateManager sync (similar to Vents.jsx toggleFan pattern)
  const handleWaterHeaterToggle = async () => {
    if (isLoading) return; // Prevent multiple concurrent requests

    setIsLoading(true);
    const newState = !isWaterHeaterOn;

    try {
      // Optimistic UI update
      setWaterHeaterOn(newState);
      prevWaterHeaterRef.current = newState;

      // Update RV state manager for cross-screen sync
      rvStateManager.updateState('water', {
        heaterOn: {
          isOn: newState,
          lastUpdated: new Date().toISOString()
        }
      });

      // Call the API
      const result = await WaterService.toggleWaterHeater();

      if (result.success) {
        setStatusMessage(`Water heater ${newState ? 'turned on' : 'turned off'}`);
      } else {
        // Revert on error
        setWaterHeaterOn(!newState);
        prevWaterHeaterRef.current = !newState;
        rvStateManager.updateState('water', {
          heaterOn: {
            isOn: !newState,
            lastUpdated: new Date().toISOString()
          }
        });

        console.error('Failed to toggle water heater:', result.error);
        setStatusMessage('Failed to toggle water heater');
      }
    } catch (e) {
      // Revert on error
      const revertedState = !isWaterHeaterOn;
      setWaterHeaterOn(revertedState);
      prevWaterHeaterRef.current = revertedState;
      rvStateManager.updateState('water', {
        heaterOn: {
          isOn: revertedState,
          lastUpdated: new Date().toISOString()
        }
      });

      console.error('Error toggling water heater:', e);
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  // Water pump toggle with RVStateManager sync (similar to Vents.jsx toggleFan pattern)
  const handleWaterPumpToggle = async () => {
    if (isLoading) return; // Prevent multiple concurrent requests

    setIsLoading(true);
    const newState = !isWaterPumpOn;

    try {
      // Optimistic UI update
      setWaterPumpOn(newState);
      prevWaterPumpRef.current = newState;

      // Update RV state manager for cross-screen sync
      rvStateManager.updateState('water', {
        pumpOn: {
          isOn: newState,
          lastUpdated: new Date().toISOString()
        }
      });

      // Call the API
      const result = await WaterService.toggleWaterPump();

      if (result.success) {
        setStatusMessage(`Water pump ${newState ? 'turned on' : 'turned off'}`);
      } else {
        // Revert on error
        setWaterPumpOn(!newState);
        prevWaterPumpRef.current = !newState;
        rvStateManager.updateState('water', {
          pumpOn: {
            isOn: !newState,
            lastUpdated: new Date().toISOString()
          }
        });

        console.error('Failed to toggle water pump:', result.error);
        setStatusMessage('Failed to toggle water pump');
      }
    } catch (e) {
      // Revert on error
      const revertedState = !isWaterPumpOn;
      setWaterPumpOn(revertedState);
      prevWaterPumpRef.current = revertedState;
      rvStateManager.updateState('water', {
        pumpOn: {
          isOn: revertedState,
          lastUpdated: new Date().toISOString()
        }
      });

      console.error('Error toggling water pump:', e);
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  // Master light toggle handler - updated to use LightControlService like LightScreenTablet
  const handleMasterLightToggle = async (isOn) => {
    try {
      setIsLoading(true);
      console.log(`Master light toggle called with isOn=${isOn}`);
      
      if (isOn) {
        // Turn on all lights using LightControlService
        const result = await LightControlService.allLightsOn();
        
        if (result.success) {
          // Update RV state manager for all lights
          allLights.forEach(lightId => {
            rvStateManager.updateLightState(lightId, true, 75); // Default to 75% brightness
          });
          
          setMasterLightOn(true);
          showStatusMessage('All lights turned ON');
        } else {
          showStatusMessage('Failed to turn all lights ON');
        }
      } else {
        // Turn off all lights using LightControlService
        const result = await LightControlService.allLightsOff();
        
        if (result.success) {
          // Update RV state manager for all lights
          allLights.forEach(lightId => {
            rvStateManager.updateLightState(lightId, false, 0);
          });
          
          setMasterLightOn(false);
          showStatusMessage('All lights turned OFF');
        } else {
          showStatusMessage('Failed to turn all lights OFF');
        }
      }
    } catch (error) {
      showStatusMessage(`Error: ${error.message}`);
      console.error('Error controlling master lights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    if (selectedTab === TABS.MAIN) {
      return (
        <>
          <View className="flex-row items-center justify-between mx-16 h-28">
            <View className="items-center bg-brown-300 ">
              <Pressable onPress={() => setModalVisible(true)}>
                <Image
                  source={require("../assets/trailer.png")}
                  className="h-20 w-24 mb-1"
                />
              </Pressable>
              <Text className="text-white text-base">
                Awning Controls
              </Text>
            </View>
          
            <View className="items-center">
              <Pressable onPress={() => setHeaterModalVisible(true)}>
                <Image
                  source={require("../assets/image-21.png")}
                  contentFit="cover"
                />
              </Pressable>
              <Text className="text-white text-base">
                Fan Controls
              </Text>
            </View>
          </View>
          
          {/* Master Light Toggle */}
          <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
          
          <View style={styles.divider} />
          
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.main.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}
          </ScrollView>
        </>
      );
    } else if (selectedTab === TABS.BEDROOM) {
      return (
        <>
        {/* ───── Water Controls (Bedroom Tab) ───── */}
         <View style={[styles.fanControlsContainer, { flexDirection: 'column', paddingHorizontal: 20 }]}>
           <WaterButton
             type="heater"
             isOn={isWaterHeaterOn}
             onPress={handleWaterHeaterToggle}
             loading={isLoading}
             compact={true}
           />
           <WaterButton
             type="pump"
             isOn={isWaterPumpOn}
             onPress={handleWaterPumpToggle}
             loading={isLoading}
             compact={true}
           />
         </View>
         
         <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
          
          <View style={styles.divider} />
          
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.bedroom.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}
          </ScrollView>
        </>
      );
    } else if (selectedTab === TABS.BATHROOM) {
      return (
        <View className="">
          <View style={[styles.fanControlsContainer, { flexDirection: 'column', paddingHorizontal: 20 }]}>
        <FanButton
          compact={true}
          isOn={isBayVentFanOn}
          onPress={toggleBayVentFan}
          iconName="sun"
          label="Bay Vent"
          loading={isLoading}
        />
        <FanButton
          compact={true}
          isOn={isBathroomFanOn}
          onPress={toggleBathroomFan}
          iconName="wind"
          label="Bath Fan"
          loading={isLoading}
        />
      </View>
    
          {/* Light Master Control */}
          <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
    
          {/* Divider */}
          <View style={styles.divider} />
    
          {/* Light Controls with SimpleHoldToDimLight */}
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.bathroom.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}
          </ScrollView>
        </View>
      );
    }
  };

  var logo = <Image
    className="h-20 w-20 mb-4 mx-14"
    source={require("../assets/WifiTablet.png")}
  />;

  return (
    <View>
      <ScrollView 
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom:120 }} 
        decelerationRate={0.9}
        className="bg-brown"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.devices1}>Devices</Text>
        </View>
        
        <View>
          <View style={styles.tabContainer}>
            {Object.values(TABS).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderTabContent()}
        </View>

        {/* Awning Control Modal */}
        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />

        {/* Heater Control Modal */}
        <HeaterControlModal isVisible={isHeaterModalVisible} onClose={() => setHeaterModalVisible(false)} />

        {/* Add Device Modal */}
        <AddDeviceModal isVisible={isAddDeviceModalVisible} onClose={() => setAddDeviceModalVisible(false)} />

        {/* Schedule Lights Modal */}
        <ScheduleLightsModal isVisible={isScheduleLightsModalVisible} onClose={() => setScheduleLightsModalVisible(false)} />

        {/* Status message */}
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusMessageText}>{statusMessage}</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer} className="bg-brown py-5">
        <TouchableOpacity
          style={styles.whiteButton}
          onPress={() => setScheduleLightsModalVisible(true)}
        >
          <Text style={styles.whiteButtonText}>Schedule Lights</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.orangeButton}
          onPress={() => setAddDeviceModalVisible(true)}
        >
          <Text style={styles.orangeButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  masterLightContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 15,
  },
  masterLightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterLightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterLightIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  masterLightText: {
    color: 'white',
    fontSize: 16,
  },
  masterLightRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
    marginHorizontal: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
  },
  whiteButton: {
    backgroundColor: 'white',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  whiteButtonText: {
    color: 'black',
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
  },
  orangeButton: {
    backgroundColor: '#FFB267',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  orangeButtonText: {
    color: '#1B1B1B',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: "bold",
    marginBottom: 10,
  },
  screenContainer: {
    marginTop: 10,
    flex: 1,
    paddingHorizontal: 20,
  },
  porchLightContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.85,
    shadowRadius: 5.84,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 16,
  },
  ellipseIcon: {
    left: 30,
    width: 22,
    height: 22,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 24,
  },
  devices1: {
    fontSize: 32,
    color: Color.colorWhitesmoke_100,
    fontFamily: FontFamily.latoBold,
    fontWeight: "700",
    textAlign: "left",
    top: 20,
    left: 8,
    letterSpacing: -0.5,
  },
  wifisolar: {
    fontSize: FontSize.textXSM_size,
    color: Color.white0,
    top: 30,
    right: 20,
  },
  hiDrax: {
    color: Color.white0,
    lineHeight: 24,
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 28,
    marginTop: 10,
    top: 30,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    marginBottom: 20,
    marginTop: 30,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    borderBottomWidth: 0,
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: Color.colorSandybrown,
  },
  tabContentText: {
    fontSize: FontSize.size_mid,
    color: Color.white0,
    textAlign: "center",
    marginTop: 20,
  },
  FanControls: {
    marginRight: 20,
    marginBottom: 10,
    color: Color.white0,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.latoRegular,
    fontWeight: "500",
    textAlign: "center",
  },
  fanButtonContainer: {
    width: 100,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    
  },
  fanButtonOn: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  fanButtonOff: {
    backgroundColor: "#FF6B6B",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  disabledButton: {
    opacity: 0.7,
  },
  
  fanControlsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },

   waterControlButton: {
    width: 140,
    height: 140,
    borderRadius: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    backgroundColor: '#8AB9F1',
    borderWidth: 2,
    borderColor: '#66B2FF',
    shadowColor: '#66B2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  waterControlButtonActive: {
    backgroundColor: '#005BB5',
    borderColor: '#99CCFF',
  },
  waterControlButtonInactive: {
    backgroundColor: '#002147',
    borderColor: '#224E7A',
  },
  waterIconCircleActive: {
    backgroundColor: '#66B2FF',
  },
  waterIconCircleInactive: {
    backgroundColor: '#003153',
    borderWidth: 1,
    borderColor: '#224E7A',
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
    marginHorizontal: 40,
    zIndex: 1000,
  },
  statusMessageText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Fan Controls - Modern Style
fanControlsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 20,
  paddingHorizontal: 10,
},
modernFanButton: {
  width: 140,
  height: 140,
  borderRadius: 16,
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 15,
  marginHorizontal: 10,
  shadowColor: '#66B2FF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 12,
  elevation: 8,
  elevation: 6,
  borderWidth: 1,
},
fanButtonActive: {
  backgroundColor: '#27303F',
  borderColor: '#4F7BFA',
},
fanButtonInactive: {
  backgroundColor: '#1E242E',
  borderColor: '#323845',
},
fanIconContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},
fanIconCircle: {
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
},
iconCircleActive: {
  backgroundColor: '#4F7BFA',
},
iconCircleInactive: {
  backgroundColor: '#2D333F',
  borderWidth: 1,
  borderColor: '#3D4452',
},
fanButtonLabel: {
  color: '#FFFFFF',
  fontSize: 16,
  fontFamily: FontFamily.latoRegular,
  fontWeight: '600',
  marginBottom: 8,
},
statusIndicator: {
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  minWidth: 46,
  alignItems: 'center',
},
statusActive: {
  backgroundColor: '#4F7BFA',
},
statusInactive: {
  backgroundColor: '#323845',
},
statusText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontFamily: FontFamily.latoRegular,
  fontWeight: '700',
},
disabledButton: {
  opacity: 0.6,
},

// Modern Water Button Styles
modernWaterButton: {
  width: 140,
  height: 140,
  borderRadius: 16,
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 15,
  marginHorizontal: 10,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
  borderWidth: 2,
},
waterButtonActive: {
  backgroundColor: '#1E88E5', // Bright blue when active
  borderColor: '#42A5F5',
  shadowColor: '#1E88E5',
},
waterButtonInactive: {
  backgroundColor: '#263238', // Dark gray when inactive
  borderColor: '#37474F',
  shadowColor: '#000',
},
waterIconContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},
waterIconCircle: {
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
},
waterIconCircleActive: {
  backgroundColor: '#42A5F5', // Light blue circle when active
},
waterIconCircleInactive: {
  backgroundColor: '#37474F', // Dark gray circle when inactive
  borderWidth: 1,
  borderColor: '#455A64',
},
waterButtonLabel: {
  fontSize: 14,
  fontFamily: FontFamily.latoRegular,
  fontWeight: '600',
  marginBottom: 8,
  textAlign: 'center',
},
waterStatusIndicator: {
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  minWidth: 46,
  alignItems: 'center',
},
waterStatusActive: {
  backgroundColor: '#42A5F5', // Blue status when active
},
waterStatusInactive: {
  backgroundColor: '#37474F', // Gray status when inactive
  borderWidth: 1,
  borderColor: '#455A64',
},
waterStatusText: {
  fontSize: 12,
  fontFamily: FontFamily.latoRegular,
  fontWeight: '700',
},

// Mobile Fan Buttons - Circular Design
mobileFanContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 20,
  gap: 16,
},
mobileFanButton: {
  width: 120,
  height: 120,
  borderRadius: 60,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  borderWidth: 2,
  position: 'relative',
},
mobileFanActive: {
  backgroundColor: '#667eea',
  borderColor: '#764ba2',
},
mobileFanInactive: {
  backgroundColor: '#2c3e50',
  borderColor: '#34495e',
},
mobileFanIconCircle: {
  width: 64,
  height: 64,
  borderRadius: 32,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
  borderWidth: 1.5,
},
mobileIconActive: {
  backgroundColor: 'rgba(255, 255, 255, 0.25)',
  borderColor: 'rgba(255, 255, 255, 0.4)',
},
mobileIconInactive: {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  borderColor: 'rgba(255, 255, 255, 0.15)',
},
mobileFanLabel: {
  fontSize: 13,
  fontFamily: FontFamily.latoBold,
  fontWeight: '700',
  textAlign: 'center',
  marginBottom: 4,
  letterSpacing: 0.3,
},
mobileFanStatusDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginTop: 4,
  shadowColor: '#4ade80',
  shadowOpacity: 0.8,
  shadowRadius: 4,
  elevation: 3,
},
mobileLoadingIndicator: {
  position: 'absolute',
  top: 8,
  right: 8,
},

});


export default Devices;