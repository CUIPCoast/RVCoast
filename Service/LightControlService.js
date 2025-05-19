// Service/LightControlService.js
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
   * Set a light's brightness level
   * @param {string} lightId - The ID of the light
   * @param {number} percentage - Brightness percentage (0-100)
   * @returns {Promise} Promise that resolves when command is sent
   */
  setBrightness: async (lightId, percentage) => {
    try {
      // Convert percentage (0-100) to hex value (00-FA)
      // Note: The RV-C protocol uses 0-250 for 0-100% brightness
      const brightnessValue = Math.floor((percentage / 100) * 250).toString(16).padStart(2, '0').toUpperCase();
      
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
        'strip_lights': '20',
        'left_reading_lights': '22',
        'right_reading_lights': '23',
        'hitch_lights': '1E',
        'porch_lights': '1F'
      };
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Dimming is not supported for ${lightId}`);
      }
      
      // Command 00 is "Set Brightness" directly
      // Format: 19FEDB9F#[InstanceID]FF[Brightness]00FF00FFFF
      const brightnessCommand = `19FEDB9F#${prefix}FF${brightnessValue}00FF00FFFF`;
      
      // Send the command
      const result = await RVControlService.executeRawCommand(brightnessCommand);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to set brightness for light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off a light directly (without toggling)
   * @param {string} lightId - The ID of the light
   * @returns {Promise} Promise that resolves when command is sent
   */
  turnOffLight: async (lightId) => {
    try {
      // Use the brightness endpoint with level 0 to turn off light
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
      
      if (!result.status === 'success') {
        throw new Error(result.message || 'Failed to turn off light');
      }
      
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to turn off light (${lightId}) using API:`, error);
      
      // Fallback to using the raw command approach if server endpoint fails
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
          'strip_lights': '20',
          'left_reading_lights': '22',
          'right_reading_lights': '23',
          'hitch_lights': '1E',
          'porch_lights': '1F'
        };
        
        const prefix = lightPrefixMap[lightId];
        if (!prefix) {
          throw new Error(`Dimming is not supported for ${lightId}`);
        }
        
        // Construct and execute the raw CAN command for turning off
        const offCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
        const result = await RVControlService.executeRawCommand(offCommand);
        return { success: true, result };
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${lightId}:`, fallbackError);
        return { success: false, error: error.message };
      }
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
    return true; // Based on the PDF documentation, dimming is supported
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