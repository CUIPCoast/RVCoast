// services/rvControlServices.js
import { RVControlService } from '../API/rvAPI';

/**
 * Service module for Awning control functionality
 */
export const AwningService = {
  /**
   * Extend the awning
   * @returns {Promise} Promise that resolves when command is sent
   */
  extendAwning: async () => {
    try {
      // Raw CAN command for extending awning
      const result = await RVControlService.executeRawCommand('19FEDB9F#09FFC8012D00FFFF');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to extend awning:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Retract the awning
   * @returns {Promise} Promise that resolves when command is sent
   */
  retractAwning: async () => {
    try {
      // Raw CAN command for retracting awning
      const result = await RVControlService.executeRawCommand('19FEDB9F#0AFFC8012D00FFFF');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to retract awning:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Stop the awning
   * @returns {Promise} Promise that resolves when command is sent
   */
  stopAwning: async () => {
    try {
      // Raw CAN command for stopping awning
      const result = await RVControlService.executeRawCommand('19FEDB9F#0BFFC8010100FFFF');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to stop awning:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Climate control functionality
 */
export const ClimateService = {
  /**
   * Set night mode
   * @returns {Promise} Promise that resolves when commands are sent
   */
  setNightMode: async () => {
    try {
      const commands = [
        '19FEF99F#01C1FFFFFFFFFFFF',
        '19FED99F#FF96AB0F0B00D1FF',
        '19FFE298#010100BA24BA2400'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to set night mode:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set dehumidify mode
   * @returns {Promise} Promise that resolves when commands are sent
   */
  setDehumidifyMode: async () => {
    try {
      const commands = [
        '19FEF99F#01C1FFFFFFFFFFFF',
        '19FED99F#FF96AB0F0A00D1FF',
        '19FFE298#010164A924A92400'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to set dehumidify mode:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle cooling
   * @returns {Promise} Promise that resolves when commands are sent
   */
  toggleCooling: async () => {
    try {
      const commands = [
        '19FEF99F#01C1FFFFFFFFFFFF',
        '19FED99F#FF96AB0F0100D1FF'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle cooling:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle toe kick heat
   * @returns {Promise} Promise that resolves when commands are sent
   */
  toggleToeKick: async () => {
    try {
      const commands = [
        '19FEF99F#01C2FFFFFFFFFFFF',
        '19FED99F#FF96AA0F0000D1FF',
        '19FFE298#100264A924A92400'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle toe kick:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle furnace
   * @returns {Promise} Promise that resolves when commands are sent
   */
  toggleFurnace: async () => {
    try {
      const commands = [
        '19FEF99F#01C0FFFFFFFFFFFF',
        '19FED99F#FF96AA0F0000D1FF',
        '19FFE298#0502008E24C42400'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle furnace:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Water system control
 */
export const WaterService = {
  /**
   * Toggle water pump
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleWaterPump: async () => {
    try {
      const result = await RVControlService.executeRawCommand('19FEDB9F#2CFFC805FF00FFFF');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle water pump:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle water heater
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleWaterHeater: async () => {
    try {
      const result = await RVControlService.executeRawCommand('19FEDB9F#2BFFC805FF00FFFF');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle water heater:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for lighting control
 */
export const LightingService = {
  /**
   * Toggle a specific light
   * @param {string} light - The light to toggle (e.g., 'kitchen', 'bedroom')
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleLight: async (light) => {
    try {
      // Map of lights to their respective command IDs
      const lightCommands = {
        kitchen: '19FEDB9F#01FFC8010100FFFF',
        bedroom: '19FEDB9F#02FFC8010100FFFF',
        bathroom: '19FEDB9F#03FFC8010100FFFF',
        // Add more lights as needed
      };
      
      if (!lightCommands[light]) {
        throw new Error(`Unknown light: ${light}`);
      }
      
      const result = await RVControlService.executeRawCommand(lightCommands[light]);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to toggle ${light} light:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set light brightness
   * @param {string} light - The light to adjust
   * @param {number} brightness - Brightness value (0-100)
   * @returns {Promise} Promise that resolves when command is sent
   */
  setLightBrightness: async (light, brightness) => {
    try {
      // Example implementation - actual command would depend on your system
      // This would need to be adapted to your specific CAN bus protocol
      
      // Convert 0-100 brightness to hex value (0-FF)
      const hexBrightness = Math.floor((brightness / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
      
      // Placeholder for a command that sets brightness
      // Format would be specific to your system
      const command = `19FEDB9F#04FFC801${hexBrightness}00FFFF`;
      
      const result = await RVControlService.executeRawCommand(command);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to set ${light} brightness:`, error);
      return { success: false, error: error.message };
    }
  }
};