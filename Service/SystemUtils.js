// utils/SystemUtils.js
import { RVControlService } from '../API/rvAPI';

/**
 * Utility to handle system-wide functionality and status
 */
export const SystemUtils = {
  /**
   * Get the current system status
   * @returns {Promise<object>} System status information
   */
  getSystemStatus: async () => {
    try {
      const response = await RVControlService.getStatus();
      return {
        success: true,
        status: response.status,
        message: response.message,
        canInterface: response.canInterface
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get all available commands from the server
   * @returns {Promise<object>} Available commands
   */
  getAvailableCommands: async () => {
    try {
      const response = await RVControlService.getCommands();
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to get available commands:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Execute a raw CAN command - useful for testing or advanced usage
   * @param {string} canCommand - The raw CAN command to execute
   * @returns {Promise<object>} Result of the operation
   */
  executeRawCommand: async (canCommand) => {
    try {
      const response = await RVControlService.executeRawCommand(canCommand);
      return {
        success: true,
        result: response
      };
    } catch (error) {
      console.error('Failed to execute raw command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Check if the system supports a specific feature
   * @param {string} featureName - Name of the feature to check
   * @returns {Promise<object>} Feature support information
   */
  isFeatureSupported: async (featureName) => {
    try {
      // Get available commands to check if feature is supported
      const commands = await RVControlService.getCommands();
      
      // Check different features
      switch (featureName.toLowerCase()) {
        case 'dimming':
          // Currently no dimming support
          return {
            success: true,
            supported: false,
            message: "Dimming is not currently supported by the system."
          };
          
        case 'scenes':
          // Check if scene commands are available
          // This is a placeholder - actual implementation would depend on 
          // how scenes are implemented in the system
          return {
            success: true,
            supported: false,
            message: "Scene control is not currently supported by the system."
          };
          
        case 'climate':
          // Check if climate commands are available
          const hasClimateCommands = commands.data.groups.some(group => 
            ['night_setting', 'dehumid_setting', 'cool_setting', 'toe_kick', 'furnace_setting']
            .includes(group)
          );
          
          return {
            success: true,
            supported: hasClimateCommands,
            message: hasClimateCommands 
              ? "Climate control is supported by the system."
              : "Climate control is not supported by the system."
          };
          
        default:
          return {
            success: true,
            supported: false,
            message: `Unknown feature: ${featureName}`
          };
      }
    } catch (error) {
      console.error(`Failed to check support for feature ${featureName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get system configuration
   * @returns {object} System configuration information
   */
  getSystemConfiguration: () => {
    // This is a placeholder for system configuration
    // In a real implementation, this might retrieve configuration from storage or the server
    return {
      apiUrl: 'http://10.129.134.57:3000/api',
      supportsRawCommands: true,
      supportsDimming: false,
      debugMode: false,
      lightCategories: {
        kitchen: [
          'kitchen_lights',
          'dinette_lights',
          'under_cab_lights',
          'strip_lights'
        ],
        exterior: [
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
      }
    };
  }
};

export default SystemUtils;