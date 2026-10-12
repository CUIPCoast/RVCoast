// screens/LightScreenTablet.jsx - Room cards of hold-to-dim light tiles with a master control bar
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";
import MasterLightControl from "../components/MasterLightControl.jsx";
import TabletHeader from "../components/TabletHeader";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { handleAllLightsOn, handleAllLightsOff, getLightDisplayName, getLightGroups, showStatusMessage } from "../helper";
import { Color, FontFamily } from "../GlobalStyles";

const ROOMS = [
  { key: "kitchen", title: "Kitchen & Living", icon: "sofa-outline", columns: 3, flex: 1.5 },
  { key: "bedroom", title: "Bedroom", icon: "bed-outline", columns: 2, flex: 1 },
  { key: "bathroom", title: "Bathroom", icon: "shower", columns: 2, flex: 1 },
];

const ImprovedLightScreenTablet = () => {
  // State for loading and operations
  const [isLoading, setIsLoading] = useState(false);
  const [activeDimmingLights, setActiveDimmingLights] = useState(new Set());

  // State for master light switch - independent from individual lights
  const [masterLightOn, setMasterLightOn] = useState(false);

  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  // Get all available lights
  const allLights = LightControlService.getAllLights();

  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();

  // Individual light states from RV State Manager
  const [lightStates, setLightStates] = useState({});
  const [lightBrightness, setLightBrightness] = useState({});

  // Subscribe to RV State Manager for light states (but don't affect master)
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
        setLightBrightness(newLightBrightness);

        // Master state is now independent - don't update based on individual lights
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
    setLightBrightness(initialLightBrightness);

    return unsubscribe;
  }, []);

  // Subscribe to CAN bus updates
  useEffect(() => {
    const subscription = CANBusMonitor.subscribeToDimmingUpdates((updates) => {
      Object.entries(updates).forEach(([lightId, updateData]) => {
        const brightness = updateData.brightness || 0;
        const isOn = updateData.isOn || brightness > 0;

        // Update RV State Manager
        rvStateManager.updateLightState(lightId, isOn, brightness);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Turn all lights on
  const handleAllLightsOnPress = async () => {
    const success = await handleAllLightsOn(
      allLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(true);
    }
  };

  // Turn all lights off
  const handleAllLightsOffPress = async () => {
    const success = await handleAllLightsOff(
      allLights,
      activeDimmingLights,
      setActiveDimmingLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(false);
    }
  };

  // Group lights by category
  const lightGroups = getLightGroups();
  const groupedLights = ROOMS.flatMap((room) => lightGroups[room.key] || []);
  const countOn = (ids) => ids.filter((id) => lightStates[id]).length;

  const renderRoom = (room) => {
    const ids = lightGroups[room.key] || [];
    const onCount = countOn(ids);
    const tileWidth = `${(100 - (room.columns - 1) * 3) / room.columns}%`;

    return (
      <View key={room.key} style={[styles.roomCard, { flex: room.flex }]}>
        <View style={styles.roomHeader}>
          <View style={[styles.roomIcon, onCount > 0 && styles.roomIconOn]}>
            <MaterialCommunityIcons name={room.icon} size={20} color={onCount > 0 ? Color.colorSandybrown : '#9E9696'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roomTitle}>{room.title}</Text>
            <Text style={styles.roomSubtitle}>
              {onCount > 0 ? `${onCount} of ${ids.length} on` : `${ids.length} lights · all off`}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.tileGrid}
          showsVerticalScrollIndicator={false}
        >
          {ids.map((lightId) => (
            <SimpleHoldToDimLight
              key={lightId}
              name={getLightDisplayName(lightId)}
              lightId={lightId}
              value={lightBrightness[lightId] || 0}
              isOn={lightStates[lightId] || false}
              supportsDimming={supportsDimming}
              style={{ width: tileWidth }}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TabletHeader style={styles.header} />

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.screenTitle}>Lighting</Text>
          <Text style={styles.screenHint}>
            {supportsDimming ? "Tap a light to switch it · hold to dim" : "Tap a light to switch it"}
          </Text>
        </View>
        <MasterLightControl
          isOn={masterLightOn}
          onToggleOn={handleAllLightsOnPress}
          onToggleOff={handleAllLightsOffPress}
          isLoading={isLoading}
          onCount={countOn(groupedLights)}
          total={groupedLights.length}
          style={styles.master}
        />
      </View>

      {/* Room cards */}
      <View style={styles.rooms}>
        {ROOMS.map(renderRoom)}
      </View>

      {/* Status message overlay */}
      {showStatus && (
        <View style={styles.toast} pointerEvents="none">
          <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={Color.colorSandybrown} />
          <Text style={styles.toastText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    marginHorizontal: -20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  screenTitle: {
    color: Color.white0,
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
  },
  screenHint: {
    color: '#9E9696',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  master: {
    width: 440,
    marginTop: 0,
    marginHorizontal: 0,
    backgroundColor: '#211D1D',
  },
  rooms: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  roomCard: {
    backgroundColor: '#211D1D',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  roomIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomIconOn: {
    borderColor: 'rgba(255, 178, 103, 0.35)',
  },
  roomTitle: {
    color: Color.white0,
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
  },
  roomSubtitle: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 1,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 4,
  },
  toast: {
    position: 'absolute',
    bottom: 28,
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
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default ImprovedLightScreenTablet;
