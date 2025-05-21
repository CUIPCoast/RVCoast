// Service/LightControlService.js - Optimized for Firefly RV-C System
import { RVControlService } from '../API/rvAPI';

// Make the API base URL accessible
RVControlService.baseURL = 'http://192.168.8.200:3000/api';

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
   * Set a light’s brightness (0–100% UI → 1–50% Firefly)
   * @param {string} lightId
   * @param {number} percentage 0–100
   */
  setBrightness: async (lightId, percentage) => {
    try {
      // if off or zero, send an “off” command
      if (percentage <= 0) {
        return await LightControlService.turnOffLight(lightId);
      }

      // map your logical ID to Firefly’s instance hex
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

      // UI 0–100 → Firefly 1–50
      const brightnessLevel = Math.max(
        1,
        Math.min(50, Math.round((percentage / 100) * 50))
      );
      const hexValue = brightnessLevel
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();

      // build exact Firefly dim command: XXFF00YY0000FFFF
      const command = `19FEDB9F#${prefix}FF00${hexValue}0000FFFF`;
      console.log(`→ Setting ${lightId} to ${brightnessLevel}% → ${command}`);

      // try your HTTP API first
      try {
        const resp = await fetch(`${RVControlService.baseURL}/brightness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lightId, level: brightnessLevel }),
        });
        const json = await resp.json();
        if (json.status === 'success') {
          return { success: true, result: json };
        }
        throw new Error(json.message || 'API failed');
      } catch {
        // fallback to raw CAN
        const result = await RVControlService.executeRawCommand(command);
        return { success: true, result };
      }
    } catch (error) {
      console.error(`Failed to set brightness for ${lightId}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Turn off a light
   * @param {string} lightId
   */
  turnOffLight: async (lightId) => {
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

      // Firefly “off” command trailer is FF00040000FFFF
      const offCmd = `19FEDB9F#${prefix}FF00040000FFFF`;
      console.log(`→ Turning OFF ${lightId} → ${offCmd}`);

      // try HTTP API
      try {
        const resp = await fetch(`${RVControlService.baseURL}/brightness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lightId, level: 0 }),
        });
        const json = await resp.json();
        if (json.status === 'success') {
          return { success: true, result: json };
        }
        throw new Error(json.message || 'API failed');
      } catch {
        // fallback raw CAN
        const result = await RVControlService.executeRawCommand(offCmd);
        return { success: true, result };
      }
    } catch (error) {
      console.error(`Failed to turn off light (${lightId}):`, error);
      return { success: false, error: error.message };
    }
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
      const result = await RVControlService.executeCommand('all_lights_off');
      return { success: true, result };
    } catch (error) {
      console.error('Failed to turn all lights off:', error);
      return { success: false, error: error.message };
    }
  },

  supportsDimming: () => true,

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
