// CANBusMonitor.js - Utility to parse and monitor CAN bus data
import { RVControlService } from '../API/rvAPI';

/**
 * Utility class to monitor and parse CAN bus data
 * Specifically for handling the Firefly Integrations dimming system
 */
export class CANBusMonitor {
  /**
   * Subscribe to CAN bus events
   * @param {Function} callback - Function to call with parsed updates
   * @returns {Object} Subscription object
   */
  static subscribeToDimmingUpdates(callback) {
    // This would typically use a WebSocket or similar to get real-time updates
    // For this example, we'll use polling as a fallback
    
    // Implement a polling mechanism here if real-time socket is not available
    const intervalId = setInterval(async () => {
      try {
        // This would be replaced with actual CAN bus data from a websocket or API
        // For now, we'll simulate with a mock implementation
        const canDataSamples = await this.fetchLatestCANData();
        
        if (canDataSamples && canDataSamples.length > 0) {
          // Parse the data for dimming updates
          const updates = this.parseDimmingUpdates(canDataSamples);
          
          // Call the callback with the updates
          if (updates && Object.keys(updates).length > 0) {
            callback(updates);
          }
        }
      } catch (error) {
        console.error('Error fetching CAN bus data:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    // Return an object that can be used to unsubscribe
    return {
      unsubscribe: () => {
        clearInterval(intervalId);
      }
    };
  }
  
  /**
   * Fetch the latest CAN bus data
   * @returns {Promise<Array>} Promise that resolves with CAN data
   */
  static async fetchLatestCANData() {
    try {
      // In a real implementation, this would fetch data from a websocket or API
      // For now, we'll return mock data
      
      // Get system status to check if CAN bus is active
      const status = await RVControlService.getStatus();
      
      if (!status || !status.status === 'success') {
        throw new Error('CAN bus not available');
      }
      
      // In a real implementation, you'd have an endpoint to get latest CAN data
      // For example:
      // const response = await fetch('http://192.168.8.200:3000/api/can-data');
      // return response.json();
      
      // For now, return an empty array
      return [];
    } catch (error) {
      console.error('Error fetching CAN data:', error);
      return [];
    }
  }
  
  /**
   * Parse CAN bus data for dimming updates
   * @param {Array} canData - Array of CAN bus messages
   * @returns {Object} Object with light IDs and their brightness values
   */
  static parseDimmingUpdates(canData) {
    // From the PDF, we know that dimming updates are broadcast on 19FEDA98
    // with a specific format:
    // can0  19FEDA98 [8] 18 FF C8 FC FF 05 04 00
    //                    ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^
    //                    |  |  |  |  |  |  |  |
    //                    |  |  |  |  |  |  |  +-- Unknown
    //                    |  |  |  |  |  |  +----- Command type (04 = status)
    //                    |  |  |  |  |  +-------- Brightness level (05 = 5%)
    //                    |  |  |  |  +----------- Unknown
    //                    |  |  |  +-------------- Type (FC = dimming update)
    //                    |  |  +----------------- Brightness value (C8 = 200 = 100%)
    //                    |  +-------------------- Unknown
    //                    +----------------------- Light ID (18 = dinette)
    
    const updates = {};
    
    // Filter for dimming updates (19FEDA98)
    const dimmingUpdates = canData.filter(message => 
      message.id === '19FEDA98' && message.data.length === 8
    );
    
    // Map from light IDs in CAN messages to our application light IDs
    const lightIdMap = {
      '15': 'bath_light',
      '16': 'vibe_light',
      '17': 'vanity_light',
      '18': 'dinette_lights',
      '19': 'awning_lights',
      '1A': 'kitchen_lights',
      '1B': 'bed_ovhd_light',
      '1C': 'shower_lights',
      '1D': 'under_cab_lights',
      '20': 'strip_lights',
      '22': 'left_reading_lights',
      '23': 'right_reading_lights',
      '1E': 'hitch_lights',
      '1F': 'porch_lights'
    };
    
    // Parse each dimming update
    dimmingUpdates.forEach(message => {
      try {
        const data = message.data;
        
        // Check if this is a dimming update (byte 3 = FC)
        if (data[3] === 'FC') {
          const lightIdHex = data[0];
          const lightId = lightIdMap[lightIdHex];
          
          if (lightId) {
            // Parse brightness value from byte 2
            const brightnessHex = data[2];
            const brightness = parseInt(brightnessHex, 16);
            
            // Convert to percentage (0-100%)
            // Note: CAN bus uses 0-200 (0x00-0xC8) for 0-100%
            const percentage = Math.round((brightness / 200) * 100);
            
            // Add to updates
            updates[lightId] = percentage;
          }
        }
      } catch (error) {
        console.error('Error parsing dimming update:', error);
      }
    });
    
    return updates;
  }
}

export default CANBusMonitor;