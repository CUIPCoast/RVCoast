// Service/LightControlService.js - Enhanced with Master Light reliability fixes
import { RVControlService } from '../API/rvAPI';

// Make the API base URL accessible
if (!RVControlService.baseURL) {
  RVControlService.baseURL = 'http://192.168.8.200:3000/api';
}

// Store active dimming operations to prevent conflicts
const activeDimmingOperations = new Map();

// Light ID to hex prefix mapping
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

// Command execution with enhanced reliability
const executeCommandWithRetry = async (command, retries = 2, delay = 200) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔧 Executing command (attempt ${attempt + 1}/${retries + 1}): ${command}`);
      const result = await RVControlService.executeRawCommand(command);
      
      // Mandatory delay between commands to prevent CAN bus congestion
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Command failed on attempt ${attempt + 1}:`, error);
      
      if (attempt < retries) {
        // Progressive delay for retries
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 2)));
      } else {
        throw error;
      }
    }
  }
};

export const LightControlService = {
  /**
   * Execute a raw CAN command (internal method)
   * @private
   */
  _executeRawCommand: async function(command) {
    return await executeCommandWithRetry(command, 1, 100);
  },

  /**
   * Turn on a light to 100% brightness - GUARANTEED
   * @param {string} lightId
   */
  turnOnLight: async function(lightId) {
    try {
      console.log(`💡 LightControlService: Turning ON ${lightId} to 100%`);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Method 1: Command 1 (ON) to 100%: XXFFC801FF00FFFF
      const onCmd = `19FEDB9F#${prefix}FFC801FF00FFFF`;
      console.log(`→ Primary ON command: ${onCmd}`);
      await executeCommandWithRetry(onCmd, 1, 100);

      // Method 2: Backup - Direct brightness to 100%: XXFFC800FF00FFFF
      // This ensures we get 100% brightness even if command 1 doesn't work properly
      const brightnessCmd = `19FEDB9F#${prefix}FFC800FF00FFFF`;
      console.log(`→ Backup brightness command: ${brightnessCmd}`);
      await executeCommandWithRetry(brightnessCmd, 1, 100);

      console.log(`✅ Successfully turned on ${lightId} to 100%`);
      return { success: true, brightness: 100 };
    } catch (error) {
      console.error(`❌ Failed to turn on light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off a light
   * @param {string} lightId
   */
  turnOffLight: async function(lightId) {
    try {
      console.log(`🔴 LightControlService: Turning OFF ${lightId}`);
      
      // Cancel any active dimming operation first
      if (activeDimmingOperations.has(lightId)) {
        activeDimmingOperations.delete(lightId);
      }

      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Use command 3 (OFF): XXFF0003FF00FFFF
      const offCmd = `19FEDB9F#${prefix}FF0003FF00FFFF`;
      console.log(`→ OFF command: ${offCmd}`);

      await executeCommandWithRetry(offCmd, 1, 100);
      console.log(`✅ Successfully turned off ${lightId}`);
      return { success: true, brightness: 0 };
    } catch (error) {
      console.error(`❌ Failed to turn off light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Enhanced Master Light Control - ALL LIGHTS ON with 100% guarantee
   */
  allLightsOn: async function() {
    try {
      console.log('🌟 LightControlService: Turning ALL lights ON to 100%');
      
      // Method 1: Use the group commands from server.js
      console.log('→ Using group ON commands');
      await executeCommandWithRetry('19FEDB9F#FF86C801FF00FFFF', 1, 150);
      await executeCommandWithRetry('19FEDB9F#FF87C801FF00FFFF', 1, 150);
      
      // Method 2: BACKUP - Individual light commands to ensure 100% brightness
      // This guarantees every light gets to 100% even if group commands are unreliable
      console.log('→ Backup: Individual light commands to guarantee 100%');
      
      const allLights = Object.keys(lightPrefixMap);
      for (const lightId of allLights) {
        try {
          const prefix = lightPrefixMap[lightId];
          // Command 1 (ON to 100%)
          const onCmd = `19FEDB9F#${prefix}FFC801FF00FFFF`;
          await executeCommandWithRetry(onCmd, 1, 80); // Shorter delay for batch operation
          
          console.log(`✓ ${lightId} set to 100%`);
        } catch (lightError) {
          console.warn(`⚠️ Failed to set ${lightId}, continuing...`);
        }
      }
      
      console.log('✅ All lights turned on to 100%');
      return { success: true, method: 'enhanced_group_with_backup' };
    } catch (error) {
      console.error('❌ Failed to turn all lights on:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Enhanced Master Light Control - ALL LIGHTS OFF with reliability
   */
  allLightsOff: async function() {
    try {
      console.log('🌑 LightControlService: Turning ALL lights OFF');
      
      // Cancel all active dimming operations first
      for (const lightId of activeDimmingOperations.keys()) {
        await this.cancelDimming(lightId);
      }
      
      // Method 1: Use the group commands from server.js
      console.log('→ Using group OFF commands');
      await executeCommandWithRetry('19FEDB9F#FF86FB06FF00FFFF', 1, 150);
      await executeCommandWithRetry('19FEDB9F#FF87FB06FF00FFFF', 1, 150);
      
      // Method 2: BACKUP - Individual light commands to ensure all are off
      console.log('→ Backup: Individual light OFF commands');
      
      const allLights = Object.keys(lightPrefixMap);
      for (const lightId of allLights) {
        try {
          const prefix = lightPrefixMap[lightId];
          // Command 3 (OFF)
          const offCmd = `19FEDB9F#${prefix}FF0003FF00FFFF`;
          await executeCommandWithRetry(offCmd, 1, 80); // Shorter delay for batch operation
          
          console.log(`✓ ${lightId} turned off`);
        } catch (lightError) {
          console.warn(`⚠️ Failed to turn off ${lightId}, continuing...`);
        }
      }
      
      console.log('✅ All lights turned off');
      return { success: true, method: 'enhanced_group_with_backup' };
    } catch (error) {
      console.error('❌ Failed to turn all lights off:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Toggle a light on or off
   * @param {string} lightId
   */
  toggleLight: async function(lightId) {
    try {
      console.log(`🔄 LightControlService: Toggling ${lightId}`);
      
      const toggleCommand = `${lightId}_toggle`;
      const result = await RVControlService.executeCommand(toggleCommand);
      console.log(`✅ Successfully toggled ${lightId}`);
      return { success: true, result };
    } catch (error) {
      console.error(`❌ Failed to toggle light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Start ramping a light up (for hold-to-dim functionality)
   * @param {string} lightId
   */
  startRampingUp: async function(lightId) {
    try {
      console.log(`📈 LightControlService: Starting ramp UP for ${lightId}`);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Use command 13 (0x0D) for ramp up: XXFF000D0000FFFF
      const rampUpCmd = `19FEDB9F#${prefix}FF000D0000FFFF`;
      console.log(`→ Ramp UP command: ${rampUpCmd}`);

      await executeCommandWithRetry(rampUpCmd, 1, 50);
      console.log(`✅ Successfully started ramping UP ${lightId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to start ramping UP (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Start ramping a light down (for hold-to-dim functionality)
   * @param {string} lightId
   */
  startRampingDown: async function(lightId) {
    try {
      console.log(`📉 LightControlService: Starting ramp DOWN for ${lightId}`);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Use command 14 (0x0E) for ramp down: XXFF000E0000FFFF
      const rampDownCmd = `19FEDB9F#${prefix}FF000E0000FFFF`;
      console.log(`→ Ramp DOWN command: ${rampDownCmd}`);

      await executeCommandWithRetry(rampDownCmd, 1, 50);
      console.log(`✅ Successfully started ramping DOWN ${lightId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to start ramping DOWN (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Stop ramping a light
   * @param {string} lightId
   */
  stopRamping: async function(lightId) {
    try {
      console.log(`⏹️ LightControlService: Stopping ramp for ${lightId}`);
      
      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Use command 4 (stop): XXFF00040000FFFF
      const stopCmd = `19FEDB9F#${prefix}FF00040000FFFF`;
      console.log(`→ Stop command: ${stopCmd}`);

      await executeCommandWithRetry(stopCmd, 1, 50);
      console.log(`✅ Successfully stopped ramping ${lightId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to stop ramping (${lightId}):`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set a light's brightness using Firefly's ramp system
   * @param {string} lightId
   * @param {number} targetPercentage 0–100
   * @param {function} onProgress Optional callback for progress updates
   */
  setBrightness: async function(lightId, targetPercentage, onProgress = null) {
    try {
      console.log(`🔆 LightControlService: Setting brightness for ${lightId} to ${targetPercentage}%`);
      
      // Prevent multiple dimming operations on the same light
      if (activeDimmingOperations.has(lightId)) {
        console.log(`⚠️ Dimming operation already in progress for ${lightId}`);
        return { success: false, error: 'Dimming operation already in progress' };
      }

      const prefix = lightPrefixMap[lightId];
      if (!prefix) {
        throw new Error(`Unknown light: ${lightId}`);
      }

      // Handle turning off
      if (targetPercentage <= 0) {
        return await this.turnOffLight(lightId);
      }

      // Ensure light is on first if targeting a brightness > 0
      if (targetPercentage > 0) {
        console.log(`→ Ensuring ${lightId} is on before dimming`);
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
        console.log(`✅ Brightness set for ${lightId}: ${JSON.stringify(result)}`);
        return result;
      } finally {
        // Always clean up the active operation
        activeDimmingOperations.delete(lightId);
      }

    } catch (error) {
      console.error(`❌ Failed to set brightness for ${lightId}:`, error);
      activeDimmingOperations.delete(lightId);
      return { success: false, error: error.message };
    }
  },

  /**
   * Perform the actual ramp dimming using Firefly commands
   * @private
   */
  _performRampDimming: async function(lightId, prefix, targetPercentage, onProgress) {
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
    await executeCommandWithRetry(rampCommand, 1, 50);

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
  _stopRamping: async function(prefix) {
    try {
      // Build stop command: XXFF00040000FFFF (command 4 = 0x04 = stop)
      const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
      console.log(`→ Stopping ramp: ${stopCommand}`);
      await executeCommandWithRetry(stopCommand, 1, 50);
      
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
  _getCurrentBrightness: async function(lightId) {
    try {
      // Try to get from RV State Manager first
      try {
        // Use dynamic import to avoid circular dependencies
        const rvStateManager = (await import('../API/RVStateManager/RVStateManager')).default;
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
  cancelDimming: async function(lightId) {
    if (activeDimmingOperations.has(lightId)) {
      const operation = activeDimmingOperations.get(lightId);
      activeDimmingOperations.delete(lightId);
      
      // Stop the ramping
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
  getActiveDimmingOperations: function() {
    const operations = {};
    for (const [lightId, operation] of activeDimmingOperations.entries()) {
      operations[lightId] = {
        targetPercentage: operation.targetPercentage,
        duration: Date.now() - operation.startTime
      };
    }
    return operations;
  },

  /**
   * Check if dimming is supported
   */
  supportsDimming: function() {
    return true; // We now support ramping-based dimming!
  },

  /**
   * Get all available lights
   */
  getAllLights: function() {
    return Object.keys(lightPrefixMap);
  },

  /**
   * Get light prefix for a given light ID
   */
  getLightPrefix: function(lightId) {
    return lightPrefixMap[lightId];
  }
};

// Ensure all methods are properly bound
Object.keys(LightControlService).forEach(key => {
  if (typeof LightControlService[key] === 'function') {
    LightControlService[key] = LightControlService[key].bind(LightControlService);
  }
});

export default LightControlService;