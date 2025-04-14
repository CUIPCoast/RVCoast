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
// Updated ClimateService with fan control functions
export const ClimateService = {
  // Existing methods stay the same
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
  },

  setHighFanSpeed: async () => {
    try {
      // Execute all three high fan speed commands in sequence
      const commands = [
        '19FED99F#FF96AA0FC800D1FF',
        '195FCE98#AA00C80000000000',
        '19FEF998#A110C88A24AE19FF'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to set high fan speed:', error);
      return { success: false, error: error.message };
    }
  },
  
  setMediumFanSpeed: async () => {
    try {
      // Execute all three medium fan speed commands in sequence
      const commands = [
        '19FED99F#FF96AA0F6400D1FF',
        '195FCE98#AA00640000000000',
        '19FEF998#A110328A24AE19FF'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to set medium fan speed:', error);
      return { success: false, error: error.message };
    }
  },
  
  setLowFanSpeed: async () => {
    try {
      // Placeholder for low fan speed commands - these will need to be updated when available
      console.log('Low fan speed commands not yet available');
      
      // Return success for now, but this is a placeholder
      return { success: true, message: 'Low fan speed commands not yet implemented' };
    } catch (error) {
      console.error('Failed to set low fan speed:', error);
      return { success: false, error: error.message };
    }
  }
};