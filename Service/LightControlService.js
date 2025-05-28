// Service/LightControlService.js - Fixed version with proper method definitions
import { RVControlService } from '../API/rvAPI';

// Make the API base URL accessible
RVControlService.baseURL = 'http://192.168.8.200:3000/api';

// Store active dimming operations to prevent conflicts
const activeDimmingOperations = new Map();

export const LightControlService = {
  /**
   * Toggle a light on or off
   * @param {string} lightId
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
   * Turn on a light to full brightness
   * @param {string} lightId
   */
  turnOnLight: async (lightId) => {
    try {
      const lightPrefixMap = {
        bath_light: '15',
        vibe_light: '16',
        vanity_light: '17',
        dinette_lights: '18',
        awning_lights: '19',
        kitchen_lights: '1A',
        bed_ovhd_light: '1B',
        shower_lights: '1C',
        under_cab_lights: '1D',
        hitch_lights: '1E',
        porch_lights: '1F',
        strip_lights: '20',
        left_reading_lights: '22',
        right_reading_lights: '23',
      };
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) throw new Error(`Unknown light: ${lightId}`);

      // Use command 1 (ON) to turn light to 100%: XXFFC801FF00FFFF
      const onCmd = `19FEDB9F#${prefix}FFC801FF00FFFF`;
      console.log(`→ Turning ON ${lightId} → ${onCmd}`);

      const result = await RVControlService.executeRawCommand(onCmd);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to turn on light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off a light
   * @param {string} lightId
   */
  turnOffLight: async (lightId) => {
    try {
      // Cancel any active dimming operation first
      if (activeDimmingOperations.has(lightId)) {
        activeDimmingOperations.delete(lightId);
      }

      const lightPrefixMap = {
        bath_light: '15',
        vibe_light: '16',
        vanity_light: '17',
        dinette_lights: '18',
        awning_lights: '19',
        kitchen_lights: '1A',
        bed_ovhd_light: '1B',
        shower_lights: '1C',
        under_cab_lights: '1D',
        hitch_lights: '1E',
        porch_lights: '1F',
        strip_lights: '20',
        left_reading_lights: '22',
        right_reading_lights: '23',
      };
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) throw new Error(`Unknown light: ${lightId}`);

      // Use command 3 (OFF): XXFF0003FF00FFFF
      const offCmd = `19FEDB9F#${prefix}FF0003FF00FFFF`;
      console.log(`→ Turning OFF ${lightId} → ${offCmd}`);

      const result = await RVControlService.executeRawCommand(offCmd);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to turn off light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set a light's brightness using Firefly's ramp system
   * @param {string} lightId
   * @param {number} targetPercentage 0–100
   * @param {function} onProgress Optional callback for progress updates
   */
  setBrightness: async (lightId, targetPercentage, onProgress = null) => {
    try {
      // Prevent multiple dimming operations on the same light
      if (activeDimmingOperations.has(lightId)) {
        console.log(`Dimming operation already in progress for ${lightId}`);
        return { success: false, error: 'Dimming operation already in progress' };
      }

      // Map logical ID to Firefly instance hex
      const lightPrefixMap = {
        bath_light: '15',
        vibe_light: '16', 
        vanity_light: '17',
        dinette_lights: '18',
        awning_lights: '19',
        kitchen_lights: '1A',
        bed_ovhd_light: '1B',
        shower_lights: '1C',
        under_cab_lights: '1D',
        hitch_lights: '1E',
        porch_lights: '1F',
        strip_lights: '20',
        left_reading_lights: '22',
        right_reading_lights: '23',
      };

      const prefix = lightPrefixMap[lightId];
      if (!prefix) throw new Error(`Unknown light: ${lightId}`);

      // Handle turning off
      if (targetPercentage <= 0) {
        return await this.turnOffLight(lightId);
      }

      // Ensure light is on first if targeting a brightness > 0
      if (targetPercentage > 0) {
        await this.turnOnLight(lightId);
        // Small delay to ensure light is on before dimming
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`→ Starting ramp dimming for ${lightId} to ${targetPercentage}%`);

      // Mark this light as having an active dimming operation
      activeDimmingOperations.set(lightId, {
        targetPercentage,
        startTime: Date.now(),
        onProgress
      });

      try {
        // Start the ramping process
        const result = await this._performRampDimming(lightId, prefix, targetPercentage, onProgress);
        return result;
      } finally {
        // Always clean up the active operation
        activeDimmingOperations.delete(lightId);
      }

    } catch (error) {
      console.error(`Failed to set brightness for ${lightId}:`, error);
      activeDimmingOperations.delete(lightId);
      return { success: false, error: error.message };
    }
  },

  /**
   * Perform the actual ramp dimming using Firefly commands
   * @private
   */
  _performRampDimming: async (lightId, prefix, targetPercentage, onProgress) => {
    // Get current brightness by monitoring CAN bus
    let currentBrightness = await this._getCurrentBrightness(lightId);
    console.log(`Current brightness for ${lightId}: ${currentBrightness}%`);

    // If we're already at the target, no need to ramp
    if (Math.abs(currentBrightness - targetPercentage) <= 2) {
      console.log(`${lightId} already at target brightness`);
      return { success: true, brightness: currentBrightness };
    }

    // Determine ramp direction
    const rampingUp = targetPercentage > currentBrightness;
    console.log(`${lightId}: Ramping ${rampingUp ? 'UP' : 'DOWN'} from ${currentBrightness}% to ${targetPercentage}%`);

    // Build ramp command: XXFF00150000FFFF (command 21 = 0x15 = ramp)
    const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
    
    // Start ramping
    console.log(`→ Starting ramp: ${rampCommand}`);
    await RVControlService.executeRawCommand(rampCommand);

    // Monitor brightness and stop when we reach target
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      const maxDimmingTime = 10000; // 10 second timeout
      const monitorInterval = 100; // Check every 100ms

      const monitor = async () => {
        try {
          // Check if operation was cancelled
          if (!activeDimmingOperations.has(lightId)) {
            console.log(`Dimming operation cancelled for ${lightId}`);
            await this._stopRamping(prefix);
            resolve({ success: false, error: 'Operation cancelled' });
            return;
          }

          // Check timeout
          if (Date.now() - startTime > maxDimmingTime) {
            console.log(`Dimming timeout for ${lightId}`);
            await this._stopRamping(prefix);
            resolve({ success: false, error: 'Dimming timeout' });
            return;
          }

          // Get current brightness
          const newBrightness = await this._getCurrentBrightness(lightId);
          
          // Call progress callback if provided
          if (onProgress) {
            onProgress(newBrightness, targetPercentage);
          }

          // Check if we've reached the target (within 2% tolerance)
          const reachedTarget = Math.abs(newBrightness - targetPercentage) <= 2;
          
          // Also check if we've overshot the target
          const overshot = rampingUp ? 
            (newBrightness >= targetPercentage) : 
            (newBrightness <= targetPercentage);

          if (reachedTarget || overshot) {
            console.log(`→ Target reached for ${lightId}: ${newBrightness}% (target: ${targetPercentage}%)`);
            
            // Stop ramping
            await this._stopRamping(prefix);
            
            resolve({ 
              success: true, 
              brightness: newBrightness,
              targetReached: true 
            });
            return;
          }

          // Check if brightness stopped changing (might be at min/max)
          if (Math.abs(newBrightness - currentBrightness) < 1) {
            // Brightness hasn't changed significantly, might be at limit
            const timeSinceLastChange = Date.now() - startTime;
            if (timeSinceLastChange > 2000) { // 2 seconds without change
              console.log(`→ Brightness stopped changing for ${lightId} at ${newBrightness}%`);
              await this._stopRamping(prefix);
              resolve({ 
                success: true, 
                brightness: newBrightness,
                limitReached: true 
              });
              return;
            }
          }

          currentBrightness = newBrightness;

          // Continue monitoring
          setTimeout(monitor, monitorInterval);

        } catch (error) {
          console.error(`Error monitoring dimming for ${lightId}:`, error);
          await this._stopRamping(prefix);
          resolve({ success: false, error: error.message });
        }
      };

      // Start monitoring
      setTimeout(monitor, monitorInterval);
    });
  },

  /**
   * Stop ramping by sending stop command
   * @private
   */
  _stopRamping: async (prefix) => {
    try {
      // Build stop command: XXFF00040000FFFF (command 4 = 0x04 = stop)
      const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
      console.log(`→ Stopping ramp: ${stopCommand}`);
      await RVControlService.executeRawCommand(stopCommand);
      
      // Small delay to ensure stop command is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error stopping ramp:', error);
      throw error;
    }
  },

  /**
   * Get current brightness by querying the CAN bus or using cached state
   * @private
   */
  _getCurrentBrightness: async (lightId) => {
    try {
      // Try to get from RV State Manager first
      try {
        const rvStateManager = require('../API/RVStateManager/RVStateManager').default;
        const lightState = rvStateManager.getCategoryState('lights')[lightId];
        
        if (lightState && lightState.brightness !== undefined) {
          return lightState.brightness;
        }
      } catch (stateError) {
        console.warn('Could not access RV State Manager:', stateError.message);
      }

      // Fallback: try to fetch from CAN monitoring API
      try {
        const response = await fetch(`${RVControlService.baseURL}/dimming-updates?limit=5`);
        if (response.ok) {
          const data = await response.json();
          const update = data.updates?.find(u => u.lightId === lightId);
          if (update) {
            return update.brightness;
          }
        }
      } catch (apiError) {
        console.warn('Could not fetch brightness from API:', apiError.message);
      }

      // Default assumption: if we can't determine brightness, assume 50% if on, 0% if off
      return 50; // Conservative default

    } catch (error) {
      console.warn(`Could not get current brightness for ${lightId}:`, error.message);
      return 0; // Default to 0 if we can't determine
    }
  },

  /**
   * Cancel an active dimming operation
   * @param {string} lightId
   */
  cancelDimming: async (lightId) => {
    if (activeDimmingOperations.has(lightId)) {
      const operation = activeDimmingOperations.get(lightId);
      activeDimmingOperations.delete(lightId);
      
      // Stop the ramping
      const lightPrefixMap = {
        bath_light: '15', vibe_light: '16', vanity_light: '17',
        dinette_lights: '18', awning_lights: '19', kitchen_lights: '1A',
        bed_ovhd_light: '1B', shower_lights: '1C', under_cab_lights: '1D',
        hitch_lights: '1E', porch_lights: '1F', strip_lights: '20',
        left_reading_lights: '22', right_reading_lights: '23',
      };
      
      const prefix = lightPrefixMap[lightId];
      if (prefix) {
        await this._stopRamping(prefix);
      }
      
      console.log(`Cancelled dimming operation for ${lightId}`);
      return { success: true, cancelled: true };
    }
    
    return { success: true, message: 'No active dimming operation' };
  },

  /**
   * Get active dimming operations (for debugging)
   */
  getActiveDimmingOperations: () => {
    const operations = {};
    for (const [lightId, operation] of activeDimmingOperations.entries()) {
      operations[lightId] = {
        targetPercentage: operation.targetPercentage,
        duration: Date.now() - operation.startTime
      };
    }
    return operations;
  },

  allLightsOn: async () => {
    try {
      const result = await RVControlService.executeCommand('all_lights_on');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn all lights on:', error);
      return { success: false, error: error.message };
    }
  },

  allLightsOff: async () => {
    try {
      // Cancel all active dimming operations
      for (const lightId of activeDimmingOperations.keys()) {
        await this.cancelDimming(lightId);
      }
      
      const result = await RVControlService.executeCommand('all_lights_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn all lights off:', error);
      return { success: false, error: error.message };
    }
  },

  supportsDimming: () => true, // Now we support ramping-based dimming!

  getAllLights: () => [
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
    'strip_lights',
  ],
};

export default LightControlService;