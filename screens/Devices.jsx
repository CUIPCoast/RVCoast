import React, { useState, useEffect } from "react";
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


import Ionicons from '@expo/vector-icons/Ionicons';
import ToggleTile from "../components/ToggleTile";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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

// Room tabs: icon + which light group they show
const ROOMS = [
  { tab: TABS.MAIN, group: 'main', icon: 'silverware-fork-knife' },
  { tab: TABS.BEDROOM, group: 'bedroom', icon: 'bed' },
  { tab: TABS.BATHROOM, group: 'bathroom', icon: 'shower' },
];

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
  const { water, toggleWaterPump, toggleWaterHeater } = useRVWater();

  // Fan control states using RV state manager
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);

  // Initialize fan states from RV state manager
  useEffect(() => {
    const fanState = rvStateManager.getCategoryState('fans');
    if (fanState.bathroomFan !== undefined) {
      setBathroomFanOn(fanState.bathroomFan);
    }
    if (fanState.bayVentFan !== undefined) {
      setBayVentFanOn(fanState.bayVentFan);
    }
  }, []);

  // Subscribe to fan state changes
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'fans') {
        if (state.fans.bathroomFan !== undefined) {
          setBathroomFanOn(state.fans.bathroomFan);
        }
        if (state.fans.bayVentFan !== undefined) {
          setBayVentFanOn(state.fans.bayVentFan);
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
  const toggleBathroomFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBathroomFanOn;

      // Update state first for immediate UI feedback
      setBathroomFanOn(newState);

      // Update RV state manager
      rvStateManager.updateState('fans', { bathroomFan: newState });

      const result = await FanService.toggleBathroomFan();

      if (result.success) {
        // Show status message
        setStatusMessage(`Bathroom fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bathroom fan:', result.error);

        // Revert state on error
        setBathroomFanOn(!newState);
        rvStateManager.updateState('fans', { bathroomFan: !newState });

        // Show error message
        setStatusMessage('Failed to toggle bathroom fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bathroom fan:', error);

      // Revert state on error
      const revertedState = !isBathroomFanOn;
      setBathroomFanOn(revertedState);
      rvStateManager.updateState('fans', { bathroomFan: revertedState });

      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle bay vent fan toggle with API integration
  const toggleBayVentFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBayVentFanOn;

      // Update state first for immediate UI feedback
      setBayVentFanOn(newState);

      // Update RV state manager
      rvStateManager.updateState('fans', { bayVentFan: newState });

      const result = await FanService.toggleBayVentFan();

      if (result.success) {
        // Show status message
        setStatusMessage(`Bay vent fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bay vent fan:', result.error);

        // Revert state on error
        setBayVentFanOn(!newState);
        rvStateManager.updateState('fans', { bayVentFan: !newState });

        // Show error message
        setStatusMessage('Failed to toggle bay vent fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bay vent fan:', error);

      // Revert state on error
      const revertedState = !isBayVentFanOn;
      setBayVentFanOn(revertedState);
      rvStateManager.updateState('fans', { bayVentFan: revertedState });

      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Water heater toggle with RV state management
  // Water heater toggle with improved state management
const handleWaterHeaterToggle = async () => {
  setIsLoading(true);

  try {
    // Get current state directly from the hook
    const currentState = water.heaterOn;
    const newState = !currentState;

    console.log(`Water heater toggle: ${currentState} -> ${newState}`);

    // Call the API first
    const result = await WaterService.toggleWaterHeater();

    if (result.success) {
      // Update RV state after successful API call - preserve pumpOn state
      rvStateManager.updateWaterState({
        heaterOn: newState,
        pumpOn: water.pumpOn, // Preserve the pump state
        lastUpdated: new Date().toISOString()
      });

      setStatusMessage(`Water heater ${newState ? 'turned on' : 'turned off'}`);
    } else {
      console.error('Failed to toggle water heater:', result.error);
      setStatusMessage('Failed to toggle water heater');
    }
  } catch (e) {
    console.error('Error toggling water heater:', e);
    setStatusMessage(`Error: ${e.message}`);
  } finally {
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 3000);
    setIsLoading(false);
  }
};

  const handleWaterPumpToggle = async () => {
  setIsLoading(true);

  try {
    // Get current state directly from the hook
    const currentState = water.pumpOn;
    const newState = !currentState;

    console.log(`Water pump toggle: ${currentState} -> ${newState}`);

    // Call the API first
    const result = await WaterService.toggleWaterPump();

    if (result.success) {
      // Update RV state after successful API call - preserve heaterOn state
      rvStateManager.updateWaterState({
        pumpOn: newState,
        heaterOn: water.heaterOn, // Preserve the heater state
        lastUpdated: new Date().toISOString()
      });

      setStatusMessage(`Water pump ${newState ? 'turned on' : 'turned off'}`);
    } else {
      console.error('Failed to toggle water pump:', result.error);
      setStatusMessage('Failed to toggle water pump');
    }
  } catch (e) {
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

  // Counts for the header summary and room tabs
  const countLightsOn = (ids) => ids.filter((id) => lightStates[id]).length;
  const allLightIds = Object.values(lightGroups).flat();

  const getSummary = () => {
    const parts = [];
    const lightsOn = countLightsOn(allLightIds);
    if (lightsOn > 0) parts.push(`${lightsOn} ${lightsOn === 1 ? 'light' : 'lights'} on`);
    if (water.pumpOn) parts.push('water pump running');
    if (water.heaterOn) parts.push('water heater on');
    if (isBathroomFanOn || isBayVentFanOn) parts.push('fans running');
    if (parts.length === 0) return 'Everything is switched off';
    const text = parts.join(', ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const QUICK_ACTIONS = [
    { key: 'awning', label: 'Awning', icon: 'awning-outline', onPress: () => setModalVisible(true) },
    { key: 'fan', label: 'Fan speed', icon: 'fan', onPress: () => setHeaterModalVisible(true) },
    { key: 'schedule', label: 'Schedule', icon: 'calendar-clock', onPress: () => setScheduleLightsModalVisible(true) },
    { key: 'add', label: 'Add device', icon: 'plus-circle-outline', onPress: () => setAddDeviceModalVisible(true) },
  ];

  // Lights section shared by every room tab: master bar + 2-column grid of hold-to-dim tiles
  const renderLightSection = (groupKey) => {
    const ids = lightGroups[groupKey];
    const roomOn = countLightsOn(ids);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lights</Text>
          <Text style={styles.sectionHint}>
            {supportsDimming ? 'Tap to switch, hold to dim' : 'Tap to switch'}
          </Text>
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
          onCount={countLightsOn(allLightIds)}
          total={allLightIds.length}
          style={styles.masterControl}
        />

        <Text style={styles.roomCount}>
          {roomOn > 0 ? `${roomOn} of ${ids.length} in this room on` : `${ids.length} lights in this room`}
        </Text>

        <View style={styles.lightGrid}>
          {ids.map((lightId) => (
            <SimpleHoldToDimLight
              key={lightId}
              name={lightDisplayNames[lightId] || lightId}
              lightId={lightId}
              value={localLightBrightness[lightId] || 0}
              isOn={lightStates[lightId] || false}
              supportsDimming={supportsDimming}
              style={styles.lightTile}
            />
          ))}
        </View>
      </View>
    );
  };

  // Room-specific appliances shown above the lights
  const renderRoomDevices = () => {
    if (selectedTab === TABS.BEDROOM) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Water</Text>
          <View style={styles.tileRow}>
            <ToggleTile
              label="Water Heater"
              icon="water-boiler"
              isOn={water.heaterOn}
              onPress={handleWaterHeaterToggle}
              disabled={isLoading}
              onText="Heating"
            />
            <ToggleTile
              label="Water Pump"
              icon="water-pump"
              isOn={water.pumpOn}
              onPress={handleWaterPumpToggle}
              disabled={isLoading}
            />
          </View>
        </View>
      );
    }
    if (selectedTab === TABS.BATHROOM) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Ventilation</Text>
          <View style={styles.tileRow}>
            <ToggleTile
              label="Bay Vent"
              icon="hvac"
              isOn={isBayVentFanOn}
              onPress={toggleBayVentFan}
              disabled={isLoading}
            />
            <ToggleTile
              label="Bath Fan"
              icon="fan"
              isOn={isBathroomFanOn}
              onPress={toggleBathroomFan}
              disabled={isLoading}
            />
          </View>
        </View>
      );
    }
    return null;
  };

  const roomGroupKey = ROOMS.find((room) => room.tab === selectedTab)?.group || 'main';

  return (
    <View style={styles.screen}>
      <ScrollView
        overScrollMode="never"
        contentContainerStyle={styles.scrollContent}
        decelerationRate={0.9}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.summary}>{getSummary()}</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={styles.quickIcon}>
                <MaterialCommunityIcons name={action.icon} size={26} color={Color.colorSandybrown} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Room selector */}
        <View style={styles.roomTabs}>
          {ROOMS.map((room) => {
            const active = selectedTab === room.tab;
            const onCount = countLightsOn(lightGroups[room.group]);
            return (
              <TouchableOpacity
                key={room.tab}
                style={[styles.roomTab, active && styles.roomTabActive]}
                onPress={() => setSelectedTab(room.tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons
                  name={room.icon}
                  size={18}
                  color={active ? '#1B1B1B' : '#9E9696'}
                />
                <Text style={[styles.roomTabText, active && styles.roomTabTextActive]}>{room.tab}</Text>
                {onCount > 0 && (
                  <View style={[styles.roomBadge, active && styles.roomBadgeActive]}>
                    <Text style={[styles.roomBadgeText, active && styles.roomBadgeTextActive]}>{onCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {renderRoomDevices()}
        {renderLightSection(roomGroupKey)}
      </ScrollView>

      {/* Status message */}
      {showStatus && (
        <View style={styles.toast} pointerEvents="none">
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={Color.colorSandybrown} />
          <Text style={styles.toastText}>{statusMessage}</Text>
        </View>
      )}

      <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
      <HeaterControlModal isVisible={isHeaterModalVisible} onClose={() => setHeaterModalVisible(false)} />
      <AddDeviceModal isVisible={isAddDeviceModalVisible} onClose={() => setAddDeviceModalVisible(false)} />
      <ScheduleLightsModal isVisible={isScheduleLightsModalVisible} onClose={() => setScheduleLightsModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.colorGray_200,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    color: Color.colorWhitesmoke_100,
    fontFamily: FontFamily.latoBold,
    letterSpacing: -0.5,
  },
  summary: {
    color: '#9E9696',
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.18)',
    paddingVertical: 14,
  },
  quickActionPressed: {
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    borderColor: 'rgba(255, 178, 103, 0.6)',
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2A2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: Color.white0,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
  },
  roomTabs: {
    flexDirection: 'row',
    backgroundColor: '#1B1B1B',
    borderRadius: 18,
    padding: 4,
    marginBottom: 20,
  },
  roomTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
  },
  roomTabActive: {
    backgroundColor: Color.colorSandybrown,
  },
  roomTabText: {
    color: '#9E9696',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
  },
  roomTabTextActive: {
    color: '#1B1B1B',
  },
  roomBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    marginLeft: 6,
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadgeActive: {
    backgroundColor: '#1B1B1B',
  },
  roomBadgeText: {
    color: Color.colorSandybrown,
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
  },
  roomBadgeTextActive: {
    color: Color.colorSandybrown,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Color.white0,
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
  },
  sectionTitleSpaced: {
    marginBottom: 12,
  },
  sectionHint: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  masterControl: {
    marginTop: 0,
    marginHorizontal: 0,
  },
  roomCount: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 16,
    marginBottom: 10,
  },
  lightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  lightTile: {
    width: '48%',
  },
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 27, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  toastText: {
    color: Color.white0,
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default Devices;
