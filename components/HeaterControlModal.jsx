import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing, AccessibilityInfo } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontFamily } from "../GlobalStyles";
import { ClimateService } from "../API/RVControlServices";
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const ACCENT = '#FFB267';

// `speed` values are what the RV state and commands use; `label` is what users see.
const SPEED_OPTIONS = [
  { speed: 'Auto', label: 'Auto', icon: 'fan-auto', hint: 'Adjusts with the thermostat', spinMs: 1600 },
  { speed: 'Low', label: 'Low', icon: 'fan-speed-1', hint: 'Quiet, gentle airflow', spinMs: 2200 },
  { speed: 'Med', label: 'Medium', icon: 'fan-speed-2', hint: 'Balanced airflow', spinMs: 1100 },
  { speed: 'High', label: 'High', icon: 'fan-speed-3', hint: 'Maximum airflow', spinMs: 550 },
];

/**
 * Modal for controlling climate system fan speed settings
 *
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const HeaterControlModal = ({ isVisible, onClose }) => {
  // Use RV state management hook for climate data
  const { climate, setFanSpeed: updateFanSpeed } = useRVClimate();
  const insets = useSafeAreaInsets();

  // Local UI states
  const [selectedFanSpeed, setSelectedFanSpeed] = useState(null);
  const [isAutoModeActive, setIsAutoModeActive] = useState(false);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize from RV state when modal opens
  useEffect(() => {
    if (isVisible) {
      loadSavedStates();
    }
  }, [isVisible]);

  // Load saved states from RV state manager
  const loadSavedStates = async () => {
    try {
      const currentClimateState = rvStateManager.getCategoryState('climate');

      // Priority 1: Load from RV state manager
      if (currentClimateState.fanSpeed) {
        setSelectedFanSpeed(currentClimateState.fanSpeed);
      }

      if (currentClimateState.autoMode !== undefined) {
        setIsAutoModeActive(currentClimateState.autoMode);
      }

      // Priority 2: Fall back to AsyncStorage if RV state is empty
      if (!currentClimateState.fanSpeed) {
        const savedFanSpeed = await AsyncStorage.getItem('fanSpeed');
        if (savedFanSpeed !== null) {
          setSelectedFanSpeed(savedFanSpeed);
          rvStateManager.updateClimateState({ fanSpeed: savedFanSpeed });
        }
      }

      if (currentClimateState.autoMode === undefined) {
        const savedAutoMode = await AsyncStorage.getItem('autoModeState');
        if (savedAutoMode !== null) {
          const autoMode = JSON.parse(savedAutoMode);
          setIsAutoModeActive(autoMode);
          rvStateManager.updateClimateState({ autoMode });
        }
      }
    } catch (error) {
      console.error('Error loading saved states:', error);
      setErrorMessage('Failed to load saved settings');
    }
  };

  // Subscribe to external state changes
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.climate) {
        if (newState.climate.fanSpeed !== undefined && newState.climate.fanSpeed !== selectedFanSpeed) {
          setSelectedFanSpeed(newState.climate.fanSpeed);
        }
        if (newState.climate.autoMode !== undefined && newState.climate.autoMode !== isAutoModeActive) {
          setIsAutoModeActive(newState.climate.autoMode);
        }
      }
    });

    return unsubscribe;
  }, [selectedFanSpeed, isAutoModeActive]);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);


  // Set fan speed with RV state management
  const setFanSpeed = async (speed) => {
    if (selectedFanSpeed === speed) return;

    setIsLoading(true);
    const previousSpeed = selectedFanSpeed;
    const previousAutoMode = isAutoModeActive;

    try {
      // Update RV state manager immediately for UI responsiveness
      updateFanSpeed(speed);
      setSelectedFanSpeed(speed);
      setIsAutoModeActive(speed === 'Auto');

      let result;

      switch (speed) {
        case 'High':
          result = await ClimateService.setHighFanSpeed();
          break;
        case 'Med':
          result = await ClimateService.setMediumFanSpeed();
          break;
        case 'Low':
          // Using the direct raw command approach
          result = await setLowFanSpeed();
          break;
        case 'Auto':
          // Using direct raw command approach for auto setting
          result = await setAutoMode();
          break;
        default:
          setErrorMessage(`Unknown fan speed: ${speed}`);
          setIsLoading(false);
          return;
      }

      if (result && result.success) {
        // Save to AsyncStorage for backup
        await AsyncStorage.setItem('fanSpeed', speed);
        await AsyncStorage.setItem('autoModeState', JSON.stringify(speed === 'Auto'));

        // Show status message
        setStatusMessage(`Fan speed set to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);

        setErrorMessage(null);
      } else if (result) {
        // Revert state on API failure
        updateFanSpeed(previousSpeed);
        setSelectedFanSpeed(previousSpeed);
        setIsAutoModeActive(previousAutoMode);

        setErrorMessage(`Error setting fan speed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error setting fan speed to ${speed}:`, error);

      // Revert state on error
      updateFanSpeed(previousSpeed);
      setSelectedFanSpeed(previousSpeed);
      setIsAutoModeActive(previousAutoMode);

      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direct implementation of low fan speed using raw commands
  const setLowFanSpeed = async () => {
    try {
      // Attempt to execute the individual commands instead of the command group
      const commands = [
        '19FED99F#FF96AA0F3200D1FF', // low_fan_speed_1
        '195FCE98#AA00320000000000', // low_fan_speed_2
        '19FEF998#A110198A24AE19FF'  // low_fan_speed_3
      ];
      
      // Send each command individually using the raw command API
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set low fan speed:', error);
      return { 
        success: false, 
        error: error.message,
        details: 'Error sending raw fan speed commands. Check server logs for details.'
      };
    }
  };
  
  // Direct implementation of auto mode using raw commands
  const setAutoMode = async () => {
    try {
      // Auto setting commands from server.js
      const commands = [
        '19FEF99F#01C0FFFFFFFFFFFF', // auto_setting_on_1
        '19FED99F#FF96AA0F0000D1FF', // auto_setting_on_2
        '19FFE198#010064A924A92400'  // auto_setting_on_3
      ];
      
      // Send each command individually using the raw command API
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set auto mode:', error);
      return { 
        success: false, 
        error: error.message,
        details: 'Error sending raw auto mode commands. Check server logs for details.'
      };
    }
  };

  const activeSpeed = isAutoModeActive ? 'Auto' : selectedFanSpeed;
  const activeOption = SPEED_OPTIONS.find((o) => o.speed === activeSpeed);

  // Spinning fan preview: faster for higher speeds, still when nothing is set.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    let loop;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        spin.stopAnimation();
        spin.setValue(0);
        if (reduce || !isVisible || !activeOption) return;
        loop = Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: activeOption.spinMs, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [activeSpeed, isVisible]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close fan speed"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="fan" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Fan Speed</Text>
              <Text style={styles.subtitle}>
                {activeOption ? `Currently ${activeOption.label}` : 'Not set'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Fan preview */}
          <View style={styles.preview}>
            <View style={[styles.previewRing, activeOption && styles.previewRingOn]}>
              <Animated.View style={{ transform: [{ rotate }] }}>
                <MaterialCommunityIcons name="fan" size={72} color={activeOption ? ACCENT : '#6B6363'} />
              </Animated.View>
            </View>
            <Text style={styles.previewLabel}>{activeOption ? activeOption.label : 'Choose a speed'}</Text>
            <Text style={styles.previewHint}>{activeOption ? activeOption.hint : 'The fan follows the thermostat until you pick one'}</Text>
          </View>

          {/* Speed options */}
          <View style={styles.options} accessibilityRole="radiogroup">
            {SPEED_OPTIONS.map((option) => {
              const active = option.speed === activeSpeed;
              return (
                <TouchableOpacity
                  key={option.speed}
                  style={[styles.option, active && styles.optionActive, isLoading && styles.optionBusy]}
                  onPress={() => setFanSpeed(option.speed)}
                  disabled={isLoading}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option.label} fan speed`}
                  accessibilityState={{ checked: active, disabled: isLoading }}
                >
                  <MaterialCommunityIcons name={option.icon} size={26} color={active ? '#1B1B1B' : '#C9C1C1'} />
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status */}
          <View style={styles.statusBar}>
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.statusText}>Sending to RV…</Text>
              </>
            ) : errorMessage ? (
              <>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF6B6B" />
                <Text style={[styles.statusText, { color: '#FF6B6B' }]} numberOfLines={2}>{errorMessage}</Text>
              </>
            ) : showStatus ? (
              <>
                <MaterialCommunityIcons name="check-circle" size={18} color="#4ADE80" />
                <Text style={styles.statusText}>{statusMessage}</Text>
              </>
            ) : (
              <>
                <Ionicons name="information-circle-outline" size={18} color="#9E9696" />
                <Text style={[styles.statusText, { color: '#9E9696' }]}>Tap a speed to apply it</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#211D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
  },
  subtitle: {
    color: '#9E9696',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  previewRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRingOn: {
    borderColor: 'rgba(255, 178, 103, 0.45)',
    backgroundColor: 'rgba(255, 178, 103, 0.08)',
  },
  previewLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
    marginTop: 12,
  },
  previewHint: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 4,
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  option: {
    flex: 1,
    height: 84,
    borderRadius: 18,
    backgroundColor: '#2A2626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  optionBusy: {
    opacity: 0.6,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    marginTop: 6,
  },
  optionTextActive: {
    color: '#1B1B1B',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1B1B1B',
  },
  statusText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default HeaterControlModal;
