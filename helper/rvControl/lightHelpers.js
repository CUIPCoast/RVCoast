// Light control helper functions
import { LightControlService } from '../../Service/LightControlService.js';
import rvStateManager from '../../API/RVStateManager/RVStateManager.js';

/**
 * Handle turning all lights on
 * @param {Array} allLights - Array of all light IDs
 * @param {function} setProcessing - Set processing state function
 * @param {function} showMessage - Show status message function
 * @returns {Promise<boolean>} - Success status
 */
export const handleAllLightsOn = async (allLights, setProcessing, showMessage) => {
  try {
    if (setProcessing) setProcessing(true);
    
    const result = await LightControlService.allLightsOn();
    
    if (result.success) {
      // Update RV State Manager for all lights
      allLights.forEach(lightId => {
        rvStateManager.updateLightState(lightId, true, 75); // Default to 75% brightness
      });
      
      if (showMessage) showMessage('All lights turned ON');
      return true;
    } else {
      if (showMessage) showMessage('Failed to turn all lights ON');
      return false;
    }
  } catch (error) {
    if (showMessage) showMessage(`Error: ${error.message}`);
    console.error('Error turning all lights on:', error);
    return false;
  } finally {
    if (setProcessing) setProcessing(false);
  }
};

/**
 * Handle turning all lights off
 * @param {Array} allLights - Array of all light IDs
 * @param {Set} activeDimmingLights - Set of currently dimming lights
 * @param {function} setActiveDimming - Set active dimming lights function
 * @param {function} setProcessing - Set processing state function
 * @param {function} showMessage - Show status message function
 * @returns {Promise<boolean>} - Success status
 */
export const handleAllLightsOff = async (allLights, activeDimmingLights, setActiveDimming, setProcessing, showMessage) => {
  try {
    if (setProcessing) setProcessing(true);
    
    // Cancel any active dimming operations first
    for (const lightId of activeDimmingLights) {
      try {
        await LightControlService.cancelDimming(lightId);
      } catch (cancelError) {
        console.warn(`Could not cancel dimming for ${lightId}:`, cancelError);
      }
    }
    if (setActiveDimming) setActiveDimming(new Set());
    
    const result = await LightControlService.allLightsOff();
    
    if (result.success) {
      // Update RV State Manager for all lights
      allLights.forEach(lightId => {
        rvStateManager.updateLightState(lightId, false, 0);
      });
      
      if (showMessage) showMessage('All lights turned OFF');
      return true;
    } else {
      if (showMessage) showMessage('Failed to turn all lights OFF');
      return false;
    }
  } catch (error) {
    if (showMessage) showMessage(`Error: ${error.message}`);
    console.error('Error turning all lights off:', error);
    return false;
  } finally {
    if (setProcessing) setProcessing(false);
  }
};

/**
 * Get user-friendly light display name
 * @param {string} lightId - Light ID from API
 * @returns {string} - User-friendly name
 */
export const getLightDisplayName = (lightId) => {
  const nameMap = {
    'kitchen_lights': 'Kitchen Lights',
    'bath_light': 'Bathroom Light',
    'bed_ovhd_light': 'Bedroom Overhead Light',
    'vibe_light': 'Vibe Light',
    'vanity_light': 'Vanity Light',
    'awning_lights': 'Awning Lights',
    'shower_lights': 'Shower Lights',
    'under_cab_lights': 'Under Cabinet Lights',
    'hitch_lights': 'Hitch Lights',
    'porch_lights': 'Porch Lights', 
    'left_reading_lights': 'Left Reading Light',
    'right_reading_lights': 'Right Reading Light',
    'dinette_lights': 'Dinette Lights',
    'strip_lights': 'Strip Lights'
  };
  
  return nameMap[lightId] || lightId;
};

/**
 * Group lights by category
 * @returns {Object} - Object with light groups
 */
export const getLightGroups = () => {
  return {
    kitchen: [
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
};