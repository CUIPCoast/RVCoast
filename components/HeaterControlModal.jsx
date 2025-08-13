import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Color } from "../GlobalStyles";
import { ClimateService } from "../API/RVControlServices";
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Modal for controlling toe kick heater and cooling settings
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const HeaterControlModal = ({ isVisible, onClose }) => {
  // Mode states
  const [isCoolSettingOn, setCoolSettingOn] = useState(false);
  const [isToeKickOn, setToeKickOn] = useState(false);
  
  // Fan speed states
  const [selectedFanSpeed, setSelectedFanSpeed] = useState(null);
  const [isAutoModeActive, setIsAutoModeActive] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Current temperature
  const [currentTemp, setCurrentTemp] = useState(75);

  // Load saved states when component mounts
  useEffect(() => {
    if (isVisible) {
      loadSavedStates();
    }
  }, [isVisible]);

  // Load saved states from AsyncStorage
  const loadSavedStates = async () => {
    try {
      // Load toe kick state
      const savedToeKickState = await AsyncStorage.getItem('toeKickState');
      if (savedToeKickState !== null) {
        setToeKickOn(JSON.parse(savedToeKickState));
      }
      
      // Load cooling state
      const savedCoolingState = await AsyncStorage.getItem('coolingState');
      if (savedCoolingState !== null) {
        setCoolSettingOn(JSON.parse(savedCoolingState));
      }
      
      // Load fan speed state
      const savedFanSpeed = await AsyncStorage.getItem('fanSpeed');
      if (savedFanSpeed !== null) {
        setSelectedFanSpeed(savedFanSpeed);
      }
      
      // Load auto mode state
      const savedAutoMode = await AsyncStorage.getItem('autoModeState');
      if (savedAutoMode !== null) {
        setIsAutoModeActive(JSON.parse(savedAutoMode));
      }
    } catch (error) {
      console.error('Error loading saved states:', error);
      setErrorMessage('Failed to load saved settings');
    }
  };

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Toggle toe kick
  const toggleToeKick = async () => {
    setIsLoading(true);
    try {
      // Use ClimateService to toggle the toe kick
      const result = await ClimateService.toggleToeKick();
      if (result.success) {
        const newState = !isToeKickOn;
        setToeKickOn(newState);
        
        // Save state to AsyncStorage
        await AsyncStorage.setItem('toeKickState', JSON.stringify(newState));
        
        // Show status message
        setStatusMessage(`Toe kick heater ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to toggle toe kick: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling toe kick:', error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle cool setting
  const toggleCoolSetting = async () => {
    setIsLoading(true);
    try {
      // Use ClimateService to toggle the cooling
      const result = await ClimateService.toggleCooling();
      if (result.success) {
        const newState = !isCoolSettingOn;
        setCoolSettingOn(newState);
        
        // Save state to AsyncStorage
        await AsyncStorage.setItem('coolingState', JSON.stringify(newState));
        
        // Show status message
        setStatusMessage(`Cooling ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to toggle cooling: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling cooling:', error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Set fan speed
  const setFanSpeed = async (speed) => {
    if (selectedFanSpeed === speed) return;
    
    setIsLoading(true);
    try {
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
        // Update fan speed state
        setSelectedFanSpeed(speed);
        
        // Update auto mode state
        if (speed === 'Auto') {
          setIsAutoModeActive(true);
          await AsyncStorage.setItem('autoModeState', JSON.stringify(true));
        } else {
          setIsAutoModeActive(false);
          await AsyncStorage.setItem('autoModeState', JSON.stringify(false));
        }
        
        // Save the fan speed setting
        await AsyncStorage.setItem('fanSpeed', speed);
        
        // Show status message
        setStatusMessage(`Fan speed set to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else if (result) {
        setErrorMessage(`Error setting fan speed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error setting fan speed to ${speed}:`, error);
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

  // Function to render mode button (Cooling/Toe Kick)
  const ModeButton = ({ title, icon, isActive, onPress }) => {
    return (
      <TouchableOpacity
        style={[
          styles.modeButton,
          title === 'Cooling' && isActive ? styles.coolingActive : {},
          title === 'Toe Kick' && isActive ? styles.toeKickActive : {},
          isLoading ? styles.disabledButton : {}
        ]}
        onPress={onPress}
        disabled={isLoading}
      >
        <Text style={[styles.modeButtonText, isActive ? styles.activeText : {}]}>
          {title}
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
          <Text style={styles.modalTitle}>Climate Control Settings</Text>
          <Text style={styles.currentTemp}>Current temperature: {currentTemp}°F</Text>

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

          {/* Mode Selection */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Mode</Text>
          </View>
          
          <View style={styles.modeContainer}>
            <ModeButton
              title="Cooling"
              isActive={isCoolSettingOn}
              onPress={toggleCoolSetting}
            />
            <ModeButton
              title="Toe Kick"
              isActive={isToeKickOn}
              onPress={toggleToeKick}
            />
          </View>

          {/* Fan Speed Selection */}
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Fan Speed</Text>
          </View>
          
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

          {/* Bottom Spacing */}
          <View style={styles.buttonSpacing} />

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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  currentTemp: {
    fontSize: 16,
    color: Color.white0,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitleText: {
    color: Color.white0,
    fontSize: 16,
    fontWeight: '600',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  coolingActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
  },
  toeKickActive: {
    backgroundColor: '#ef4444',
    borderColor: '#f87171',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
  },
  modeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fanSpeedContainer: {
    marginBottom: 10,
  },
  fanSpeedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fanSpeedButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  activeFanButton: {
    backgroundColor: '#10b981',
    borderColor: '#34d399',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
  },
  fanSpeedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonSpacing: {
    height: 10, // Add some space before the close button
  },
  closeButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fb923c',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'red',
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginBottom: 15,
    alignSelf: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loadingText: {
    color: 'white',
    marginLeft: 10,
  },
});

export default HeaterControlModal;