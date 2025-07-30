// Climate control helper functions
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClimateService } from '../../API/RVControlServices.js';
import { RVControlService } from '../../API/rvAPI.js';
import rvStateManager from '../../API/RVStateManager/RVStateManager.js';

/**
 * Handle cooling toggle with state management
 * @param {boolean} currentState - Current cooling state
 * @param {function} setProcessing - Set processing state function
 * @param {function} showMessage - Show status message function
 * @returns {Promise<boolean>} - New cooling state
 */
export const handleCoolingToggle = async (currentState, setProcessing, showMessage) => {
  if (setProcessing) setProcessing(true);
  const newCoolingState = !currentState;
  
  try {
    // Update RV state first for immediate UI feedback
    rvStateManager.updateClimateState({ 
      coolingOn: newCoolingState,
      lastUpdated: new Date().toISOString()
    });
    
    // Execute API command
    if (newCoolingState) {
      await ClimateService.toggleCooling();
    } else {
      await ClimateService.turnOffCooling();
    }
    
    console.log(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
    
    // Update AsyncStorage for backwards compatibility
    await AsyncStorage.setItem('coolingState', JSON.stringify(newCoolingState));
    
    if (showMessage) {
      showMessage(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
    }
    
    return newCoolingState;
  } catch (error) {
    console.error('Error toggling cooling:', error);
    
    // Revert state on error
    rvStateManager.updateClimateState({ 
      coolingOn: !newCoolingState,
      lastUpdated: new Date().toISOString()
    });
    
    if (showMessage) {
      showMessage('Failed to toggle cooling');
    }
    
    throw error;
  } finally {
    if (setProcessing) setProcessing(false);
  }
};

/**
 * Handle toe kick toggle with state management
 * @param {boolean} currentState - Current toe kick state
 * @param {function} setProcessing - Set processing state function
 * @param {function} showMessage - Show status message function
 * @returns {Promise<boolean>} - New toe kick state
 */
export const handleToeKickToggle = async (currentState, setProcessing, showMessage) => {
  if (setProcessing) setProcessing(true);
  const newToeKickState = !currentState;
  
  try {
    // Update RV state first for immediate UI feedback
    rvStateManager.updateClimateState({ 
      toeKickOn: newToeKickState,
      lastUpdated: new Date().toISOString()
    });
    
    // Execute API command
    if (newToeKickState) {
      await ClimateService.toggleToeKick();
    } else {
      await ClimateService.turnOffToeKick();
    }
    
    console.log(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
    
    // Update AsyncStorage for backwards compatibility
    await AsyncStorage.setItem('toeKickState', JSON.stringify(newToeKickState));
    
    if (showMessage) {
      showMessage(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
    }
    
    return newToeKickState;
  } catch (error) {
    console.error('Error toggling toe kick:', error);
    
    // Revert state on error
    rvStateManager.updateClimateState({ 
      toeKickOn: !newToeKickState,
      lastUpdated: new Date().toISOString()
    });
    
    if (showMessage) {
      showMessage('Failed to toggle toe kick');
    }
    
    throw error;
  } finally {
    if (setProcessing) setProcessing(false);
  }
};

/**
 * Handle temperature change with debounce
 * @param {number} newTemp - New temperature
 * @param {number} lastTemp - Last temperature
 * @param {boolean} isClimateActive - Whether climate control is active
 * @param {function} setProcessing - Set processing state function
 * @param {function} showMessage - Show status message function
 * @returns {Promise<void>}
 */
export const handleTemperatureChange = async (newTemp, lastTemp, isClimateActive, setProcessing, showMessage) => {
  if (newTemp === lastTemp || !isClimateActive) return;
  if (setProcessing) setProcessing(true);
  
  try {
    // Determine if we need to increase or decrease temperature
    if (newTemp > lastTemp) {
      // Send temperature increase command based on the difference
      const steps = newTemp - lastTemp;
      for (let i = 0; i < steps; i++) {
        await ClimateService.increaseTemperature();
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(`Temperature increased to ${newTemp}°F`);
    } else {
      // Send temperature decrease command based on the difference
      const steps = lastTemp - newTemp;
      for (let i = 0; i < steps; i++) {
        await ClimateService.decreaseTemperature();
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(`Temperature decreased to ${newTemp}°F`);
    }
    
    // Update AsyncStorage for backwards compatibility
    await AsyncStorage.setItem('temperature', newTemp.toString());
    
    // Update RV state with confirmed temperature
    rvStateManager.updateClimateState({ 
      temperature: newTemp,
      lastUpdated: new Date().toISOString()
    });
    
    if (showMessage) {
      showMessage(`Temperature set to ${newTemp}°F`);
    }
    
  } catch (error) {
    console.error('Failed to change temperature:', error);
    
    // Revert to last successful temperature
    rvStateManager.updateClimateState({ 
      temperature: lastTemp,
      lastUpdated: new Date().toISOString()
    });
    
    if (showMessage) {
      showMessage('Failed to change temperature');
    }
    
    throw error;
  } finally {
    if (setProcessing) setProcessing(false);
  }
};

/**
 * Set low fan speed using raw commands
 * @returns {Promise<Object>} - Result object
 */
export const setLowFanSpeed = async () => {
  try {
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

/**
 * Set auto mode using raw commands
 * @returns {Promise<Object>} - Result object
 */
export const setAutoMode = async () => {
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