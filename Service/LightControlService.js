// Service/LightControlService.js - Optimized for Firefly RV-C System
import { RVControlService } from '../API/rvAPI';

// Make the API base URL accessible
RVControlService.baseURL = 'http://192.168.8.200:3000/api';

export const LightControlService = {
  /**
   * Toggle a light on or off
   * @param {string} lightId - The ID of the light to toggle
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleLight: async (lightId) => {
    try {
      const toggleCommand = `${lightId}_toggle`;
      const result = await RVControlService.executeCommand(toggleCommand);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to toggle light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set a light's brightness level - FIXED version matching Firefly protocol
   * @param {string} lightId - The ID of the light
   * @param {number} percentage - Brightness percentage (0-100)
   * @returns {Promise} Promise that resolves when command is sent
   */
  setBrightness: async (lightId, percentage) => {
    try {
      // Validate percentage
      if (percentage <= 0) {
        // If percentage is 0 or negative, turn off the light
        return await LightControlService.turnOffLight(lightId);
      }
      
      // Map of light IDs to their corresponding command prefix (hexadecimal instance ID)
      const lightPrefixMap = {
        'bath_light': '15',
        'vibe_light': '16',
        'vanity_light': '17',
        'dinette_lights': '18', 
        'awning_lights': '19',
        'kitchen_lights': '1A',
        'bed_ovhd_light': '1B',
        'shower_lights': '1C',
        'under_cab_lights': '1D',
        'hitch_lights': '1E',
        'porch_lights': '1F',
        'strip_lights': '20',
        'left_reading_lights': '22',
        'right_reading_lights': '23'
      };
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }
      
      // *** IMPORTANT: From your documentation, Firefly only supports 1-50% brightness ***
      // Scale 0-100% UI range to actual 1-50% range supported by hardware
      let dimLevel = Math.max(1, Math.min(50, Math.round(percentage / 2)));
      
      // Convert to hex, ensuring two characters with leading zero if needed
      const hexValue = dimLevel.toString(16).padStart(2, '0').toUpperCase();
      
      // *** CRITICAL: Use exact Firefly dimming command format ***
      // Format from your documentation: XXFF00YYZZZZ0000FFFF
      // XX = Instance ID (light ID)
      // YY = Brightness value (01-32 hex, for 1-50%)
      // ZZZZ = Command code (0000)
      const brightnessCommand = `19FEDB9F#${prefix}FF00${hexValue}0000FFFF`;
      
      console.log(`Setting ${lightId} brightness to ${dimLevel}% (${hexValue} hex) with command: ${brightnessCommand}`);
      
      // Try using the API endpoint first
      try {
        const response = await fetch(`${RVControlService.baseURL}/brightness`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lightId: lightId,
            level: dimLevel
          }),
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          return { success: true, result };
        } else {
          throw new Error(result.message || 'API endpoint failed');
        }
      } catch (apiError) {
        console.warn(`API endpoint failed, falling back to raw command: ${apiError.message}`);
        
        // Fall back to raw command if API endpoint fails
        const result = await RVControlService.executeRawCommand(brightnessCommand);
        return { success: true, result };
      }
    } catch (error) {
      console.error(`Failed to set brightness for light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off a light directly
   * @param {string} lightId - The ID of the light
   * @returns {Promise} Promise that resolves when command is sent
   */
  turnOffLight: async (lightId) => {
    try {
      // Map of light IDs to their corresponding command prefix
      const lightPrefixMap = {
        'bath_light': '15',
        'vibe_light': '16',
        'vanity_light': '17',
        'dinette_lights': '18', 
        'awning_lights': '19',
        'kitchen_lights': '1A',
        'bed_ovhd_light': '1B',
        'shower_lights': '1C',
        'under_cab_lights': '1D',
        'hitch_lights': '1E',
        'porch_lights': '1F',
        'strip_lights': '20',
        'left_reading_lights': '22',
        'right_reading_lights': '23'
      };
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }
      
      // Use the exact Firefly "Off only" command from your documentation
      const offCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
      
      console.log(`Turning off ${lightId} with command: ${offCommand}`);
      
      // Try using the API endpoint first
      try {
        const response = await fetch(`${RVControlService.baseURL}/brightness`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lightId: lightId,
            level: 0
          }),
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          return { success: true, result };
        } else {
          throw new Error(result.message || 'API endpoint failed');
        }
      } catch (apiError) {
        console.warn(`API endpoint failed, falling back to raw command: ${apiError.message}`);
        
        // Fall back to raw command if API endpoint fails
        const result = await RVControlService.executeRawCommand(offCommand);
        return { success: true, result };
      }
    } catch (error) {
      console.error(`Failed to turn off light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn all lights on
   * @returns {Promise} Promise that resolves when command is sent
   */
  allLightsOn: async () => {
    try {
      const result = await RVControlService.executeCommand('all_lights_on');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn all lights on:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn all lights off
   * @returns {Promise} Promise that resolves when command is sent
   */
  allLightsOff: async () => {
    try {
      const result = await RVControlService.executeCommand('all_lights_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn all lights off:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if dimming is supported for the system
   * @returns {boolean} True if dimming is supported
   */
  supportsDimming: () => {
    return true; // Based on the Firefly documentation, dimming is supported
  },

  /**
   * Get all available light IDs
   * @returns {Array} Array of light IDs
   */
  getAllLights: () => {
    return [
      'kitchen_lights',
      'bath_light',
      'bed_ovhd_light',
      'vibe_light',
      'vanity_light',
      'awning_lights',
      'shower_lights',
      'under_cab_lights',
      'hitch_lights',
      'porch_lights',
      'left_reading_lights',
      'right_reading_lights',
      'dinette_lights',
      'strip_lights'
    ];
  }
};

export default LightControlService;