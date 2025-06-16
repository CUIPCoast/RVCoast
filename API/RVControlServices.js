// services/rvControlServices.js
import { RVControlService } from '../API/rvAPI';

/**
 * Service module for Awning control functionality
 */
export const AwningService = {
  /**
   * Extend the awning using the correct CAN commands
   * @returns {Promise} Promise that resolves when command is sent
   */
  extendAwning: async () => {
    try {
      console.log('🏠 AwningService: Extending awning (Instance 9)');
      
      // First stop any retract operation
      await RVControlService.executeRawCommand('19FEDB9F#0AFF0003FF00FFFF');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send extend command: Instance 9, 100% power, command 1, 45 second duration
      const result = await RVControlService.executeRawCommand('19FEDB9F#09FFC8012D00FFFF');
      
      console.log('✅ Awning extend command sent successfully');
      return { success: true, result, command: 'extend', instance: 9 };
    } catch (error) {
      console.error('❌ Failed to extend awning:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Retract the awning using the correct CAN commands
   * @returns {Promise} Promise that resolves when command is sent
   */
  retractAwning: async () => {
    try {
      console.log('🏠 AwningService: Retracting awning (Instance 10)');
      
      // First stop any extend operation
      await RVControlService.executeRawCommand('19FEDB9F#09FF0003FF00FFFF');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send retract command: Instance 10, 100% power, command 1, 45 second duration
      const result = await RVControlService.executeRawCommand('19FEDB9F#0AFFC8012D00FFFF');
      
      console.log('✅ Awning retract command sent successfully');
      return { success: true, result, command: 'retract', instance: 10 };
    } catch (error) {
      console.error('❌ Failed to retract awning:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Stop the awning by stopping both motors
   * @returns {Promise} Promise that resolves when command is sent
   */
  stopAwning: async () => {
    try {
      console.log('🏠 AwningService: Stopping awning (Both instances)');
      
      // Stop extend motor (Instance 9)
      await RVControlService.executeRawCommand('19FEDB9F#09FF0003FF00FFFF');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Stop retract motor (Instance 10)  
      await RVControlService.executeRawCommand('19FEDB9F#0AFF0003FF00FFFF');
      
      console.log('✅ Awning stop commands sent successfully');
      return { success: true, command: 'stop', instances: [9, 10] };
    } catch (error) {
      console.error('❌ Failed to stop awning:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Emergency stop - immediate stop of all awning motors
   * @returns {Promise} Promise that resolves when command is sent
   */
  emergencyStop: async () => {
    try {
      console.log('🚨 AwningService: EMERGENCY STOP');
      
      // Send stop commands rapidly to both motors
      const commands = [
        '19FEDB9F#09FF0003FF00FFFF', // Stop extend
        '19FEDB9F#0AFF0003FF00FFFF', // Stop retract
        '19FEDB9F#09FF00040000FFFF', // Backup stop extend (command 4)
        '19FEDB9F#0AFF00040000FFFF'  // Backup stop retract (command 4)
      ];
      
      // Send all stop commands rapidly
      for (const command of commands) {
        try {
          await RVControlService.executeRawCommand(command);
        } catch (error) {
          console.warn(`Emergency stop command failed: ${command}`, error);
        }
      }
      
      console.log('✅ Emergency stop commands sent');
      return { success: true, command: 'emergency_stop' };
    } catch (error) {
      console.error('❌ Emergency stop failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Test awning motors individually (for diagnostic purposes)
   */
  testExtendMotor: async () => {
    try {
      console.log('🔧 Testing extend motor (Instance 9) - 5 second pulse');
      
      // Stop any existing operation
      await RVControlService.executeRawCommand('19FEDB9F#09FF0003FF00FFFF');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send test command: Instance 9, 50% power, command 1, 5 second duration
      await RVControlService.executeRawCommand('19FEDB9F#0964012D0500FFFF');
      
      console.log('✅ Extend motor test started (5 seconds)');
      return { success: true, test: 'extend_motor', duration: 5 };
    } catch (error) {
      console.error('❌ Extend motor test failed:', error);
      return { success: false, error: error.message };
    }
  },

  testRetractMotor: async () => {
    try {
      console.log('🔧 Testing retract motor (Instance 10) - 5 second pulse');
      
      // Stop any existing operation
      await RVControlService.executeRawCommand('19FEDB9F#0AFF0003FF00FFFF');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send test command: Instance 10, 50% power, command 1, 5 second duration
      await RVControlService.executeRawCommand('19FEDB9F#0A64012D0500FFFF');
      
      console.log('✅ Retract motor test started (5 seconds)');
      return { success: true, test: 'retract_motor', duration: 5 };
    } catch (error) {
      console.error('❌ Retract motor test failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get awning status by checking recent CAN traffic
   */
  getAwningStatus: async () => {
    try {
      // Try to get current status from the RV control service
      const status = await RVControlService.getStatus();
      
      return {
        success: true,
        canInterface: status.canInterface,
        timestamp: new Date().toISOString(),
        instances: {
          extend: 9,
          retract: 10
        },
        commands: {
          extend: '19FEDB9F#09FFC8012D00FFFF',
          retract: '19FEDB9F#0AFFC8012D00FFFF',
          stopExtend: '19FEDB9F#09FF0003FF00FFFF',
          stopRetract: '19FEDB9F#0AFF0003FF00FFFF'
        }
      };
    } catch (error) {
      console.error('❌ Failed to get awning status:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for convenience
export const {
  extendAwning,
  retractAwning,
  stopAwning,
  emergencyStop,
  testExtendMotor,
  testRetractMotor,
  getAwningStatus
} = AwningService;

/**
 * Service module for Water controls
 */
export const WaterService = {
  /**
   * Toggle water pump
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleWaterPump: async () => {
    try {
      // Using the predefined command from server.js
      const result = await RVControlService.executeCommand('water_pump_toggle');
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
      // Using the predefined command from server.js
      const result = await RVControlService.executeCommand('water_heater_toggle');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle water heater:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Climate control functionality
 */
export const ClimateService = {
  /**
   * Set Night Mode
   * @returns {Promise} Promise that resolves when command is sent
   */
  setNightMode: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('night_setting');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to set night mode:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set Dehumidify Mode
   * @returns {Promise} Promise that resolves when command is sent
   */
  setDehumidifyMode: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('dehumid_setting');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to set dehumidify mode:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle AC Cooling
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleCooling: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('cool_setting');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle cooling:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off cooling
   * @returns {Promise} Promise that resolves when command is sent
   */
  turnOffCooling: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('complete_cool_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn off cooling:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle toe kick
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleToeKick: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('toe_kick');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle toe kick:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off toe kick
   * @returns {Promise} Promise that resolves when command is sent
   */
  turnOffToeKick: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('toe_kick_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn off toe kick:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle Furnace
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleFurnace: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('furnace_on');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle furnace:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off Furnace
   * @returns {Promise} Promise that resolves when command is sent
   */
  turnOffFurnace: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('furnace_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn off furnace:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set Auto Mode
   * @returns {Promise} Promise that resolves when command is sent
   */
  setAutoMode: async () => {
    try {
      // Using the direct raw command approach for Auto mode
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
      return { success: false, error: error.message };
    }
  },

  /**
   * Set High Fan Speed
   * @returns {Promise} Promise that resolves when command is sent
   */
  setHighFanSpeed: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('high_fan');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to set high fan speed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Set Medium Fan Speed
   * @returns {Promise} Promise that resolves when command is sent
   */
  setMediumFanSpeed: async () => {
    try {
      // Using the command group from server.js
      const result = await RVControlService.executeCommand('medium_fan');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to set medium fan speed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Set Low Fan Speed
   * @returns {Promise} Promise that resolves when command is sent
   */
  setLowFanSpeed: async () => {
    try {
      // Using the direct raw command approach for Low fan speed
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
      return { success: false, error: error.message };
    }
  },

  /**
   * Increase Temperature
   * @returns {Promise} Promise that resolves when command is sent
   */
  increaseTemperature: async () => {
    try {
      const result = await RVControlService.executeCommand('temp_increase');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to increase temperature:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Decrease Temperature
   * @returns {Promise} Promise that resolves when command is sent
   */
  decreaseTemperature: async () => {
    try {
      const result = await RVControlService.executeCommand('temp_decrease');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to decrease temperature:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Light control functionality
 */
export const LightService = {
  /**
   * Toggle All Lights On
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
   * Toggle All Lights Off
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
   * Toggle individual lights
   * @param {string} lightCommand - The light command to execute
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleLight: async (lightCommand) => {
    try {
      const result = await RVControlService.executeCommand(lightCommand);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to toggle light (${lightCommand}):`, error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Fan control functionality
 */
export const FanService = {
  /**
   * Toggle Bathroom Fan
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleBathroomFan: async () => {
    try {
      const result = await RVControlService.executeCommand('bath_fan_toggle');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle bathroom fan:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle Bay Vent Fan
   * @returns {Promise} Promise that resolves when command is sent
   */
  toggleBayVentFan: async () => {
    try {
      const result = await RVControlService.executeCommand('bay_vent_fan_toggle');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to toggle bay vent fan:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Service module for Bar Lift control functionality
 */
export const BarLiftService = {
  /**
   * Move Bar Lift Up
   * @returns {Promise} Promise that resolves when command is sent
   */
  barLiftUp: async () => {
    try {
      const result = await RVControlService.executeCommand('bar_lift_up');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to lift bar up:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Move Bar Lift Down
   * @returns {Promise} Promise that resolves when command is sent
   */
  barLiftDown: async () => {
    try {
      const result = await RVControlService.executeCommand('bar_lift_down');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to lower bar down:', error);
      return { success: false, error: error.message };
    }
  }
};