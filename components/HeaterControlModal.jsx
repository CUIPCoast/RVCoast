import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Color, FontFamily } from "../GlobalStyles";
import { ClimateService } from "../API/RVControlServices";
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

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
    // Prevent clicking the same button
    if (speed === 'Auto' && isAutoModeActive) return;
    if (speed !== 'Auto' && selectedFanSpeed === speed && !isAutoModeActive) return;

    setIsLoading(true);
    const previousSpeed = selectedFanSpeed;
    const previousAutoMode = isAutoModeActive;

    try {
      // Update local state immediately
      if (speed === 'Auto') {
        setIsAutoModeActive(true);
        setSelectedFanSpeed('Auto'); // Store "Auto" instead of null for proper comparisons
      } else {
        setIsAutoModeActive(false); // Clear auto mode when setting manual speed
        setSelectedFanSpeed(speed);
      }

      // Update RV state manager
      rvStateManager.updateClimateState({
        fanSpeed: speed,
        autoMode: speed === 'Auto',
        lastUpdated: new Date().toISOString()
      });

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
        rvStateManager.updateClimateState({
          fanSpeed: previousSpeed,
          autoMode: previousAutoMode,
          lastUpdated: new Date().toISOString()
        });
        setSelectedFanSpeed(previousSpeed);
        setIsAutoModeActive(previousAutoMode);

        setErrorMessage(`Error setting fan speed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error setting fan speed to ${speed}:`, error);

      // Revert state on error
      rvStateManager.updateClimateState({
        fanSpeed: previousSpeed,
        autoMode: previousAutoMode,
        lastUpdated: new Date().toISOString()
      });
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

  // Function to render fan speed button
  const FanSpeedButton = ({ speed, isActive, onPress }) => {
    return (
      <TouchableOpacity
        style={[
          styles.fanSpeedButton,
          isActive ? styles.activeFanButton : {},
          isLoading ? styles.disabledButton : {}
        ]}
        onPress={() => onPress(speed)}
        disabled={isLoading}
      >
        <Text style={[styles.fanSpeedText, isActive ? styles.activeText : {}]}>
          {speed}
        </Text>
      </TouchableOpacity>
    );
  };


  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Fan Speed Control</Text>

          {/* Error message display */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Status message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFB267" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}

          {/* Fan Speed Selection */}
          <View style={styles.fanSpeedContainer}>
            <View style={styles.fanSpeedRow}>
              <FanSpeedButton
                speed="Auto"
                isActive={isAutoModeActive}
                onPress={setFanSpeed}
              />
              <FanSpeedButton
                speed="High"
                isActive={selectedFanSpeed === 'High' && !isAutoModeActive}
                onPress={setFanSpeed}
              />
            </View>
            <View style={styles.fanSpeedRow}>
              <FanSpeedButton
                speed="Med"
                isActive={selectedFanSpeed === 'Med' && !isAutoModeActive}
                onPress={setFanSpeed}
              />
              <FanSpeedButton
                speed="Low"
                isActive={selectedFanSpeed === 'Low' && !isAutoModeActive}
                onPress={setFanSpeed}
              />
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 420,
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalTitle: {
    fontSize: 32,
    fontFamily: FontFamily.latoBold,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  fanSpeedContainer: {
    marginBottom: 20,
  },
  fanSpeedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fanSpeedButton: {
    flex: 1,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 18,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activeFanButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FFD4A8',
    shadowColor: '#FFB267',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fanSpeedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeText: {
    color: '#1a1a1a',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  statusContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusText: {
    color: '#6EE7B7',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 12,
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
  },
});

export default HeaterControlModal;