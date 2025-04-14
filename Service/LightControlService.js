// services/LightControlService.js
import { RVControlService } from '../API/rvAPI';

/**
 * Service module for Light control functionality
 */
export const LightControlService = {
  /**
   * Toggle a specific light
   * @param {string} lightName - Name of the light to toggle
   * @returns {Promise<Object>} Promise that resolves with result
   */
  toggleLight: async (lightName) => {
    try {
      const result = await RVControlService.executeCommand(`${lightName}_toggle`);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to toggle ${lightName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn all lights on
   * @returns {Promise<Object>} Promise that resolves with result
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
   * @returns {Promise<Object>} Promise that resolves with result
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
   * Get all available lights
   * @returns {Array<string>} Array of light names
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
  },

  /**
   * Checks if light control supports dimming
   * Currently returns false as the CAN commands for dimming are not implemented
   * @returns {boolean} Whether dimming is supported
   */
  supportsDimming: () => {
    // Currently no dimming support in the CAN commands
    return false;
  },
  
  /**
   * Set the brightness level for a light (placeholder for future implementation)
   * @param {string} lightName - Name of the light
   * @param {number} level - Brightness level (0-100)
   * @returns {Promise<Object>} Promise that resolves with result
   */
  setBrightness: async (lightName, level) => {
    // This is a placeholder function for future implementation
    // Currently, we don't have dimming support, so we just toggle lights on/off
    try {
      // If level is 0, make sure light is off, otherwise make sure it's on
      // This approach assumes we don't know the current state of the light
      // A more robust approach would track light states
      
      // This is a mock implementation since we don't have actual dimming commands
      const isOn = level > 0;
      console.log(`Setting ${lightName} to ${isOn ? 'ON' : 'OFF'} (brightness: ${level})`);
      
      // For now, just toggle the light if needed
      const result = await RVControlService.executeCommand(`${lightName}_toggle`);
      return { 
        success: true, 
        result,
        message: `Note: Dimming is not yet supported. The light was toggled ${isOn ? 'on' : 'off'}.`
      };
    } catch (error) {
      console.error(`Failed to set brightness for ${lightName}:`, error);
      return { success: false, error: error.message };
    }
  }
};

export default LightControlService;