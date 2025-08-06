const express = require('express');
const { exec } = require('child_process');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const victronRoutes = require('./victronRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected WebSocket clients
const clients = new Set();

// Create CAN bus monitor process
let canDumpProcess = null;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/api/victron', victronRoutes);

// Complete commands dictionary from the PDF
const commands = {
  // Lighting Commands
  'kitchen_lights_toggle': '19FEDB9F#1AFFFA05FF00FFFF',
  'bath_light_toggle': '19FEDB9F#15FFFA05FF00FFFF',
  'bed_ovhd_light_toggle': '19FEDB9F#1BFFFA05FF00FFFF',
  'vibe_light_toggle': '19FEDB9F#16FFFA05FF00FFFF',
  'vanity_light_toggle': '19FEDB9F#17FFFA05FF00FFFF',
  'awning_lights_toggle': '19FEDB9F#19FFFA05FF00FFFF',
  'shower_lights_toggle': '19FEDB9F#1CFFFA05FF00FFFF',
  'under_cab_lights_toggle': '19FEDB9F#1DFFFA05FF00FFFF',
  'hitch_lights_toggle': '19FEDB9F#1EFFC805FF00FFFF',
  'porch_lights_toggle': '19FEDB9F#1FFFC805FF00FFFF',
  'left_reading_lights_toggle': '19FEDB9F#22FFFA05FF00FFFF',
  'right_reading_lights_toggle': '19FEDB9F#23FFFA05FF00FFFF',
  'dinette_lights_toggle': '19FEDB9F#18FFFA05FF00FFFF',
  'strip_lights_toggle': '19FEDB9F#20FFFA05FF00FFFF',
  
  // Main Lights (All Lights)
  'all_lights_on_1': '19FEDB9F#FF86C801FF00FFFF',
  'all_lights_on_2': '19FEDB9F#FF87C801FF00FFFF',
  'all_lights_off_1': '19FEDB9F#FF86FB06FF00FFFF',
  'all_lights_off_2': '19FEDB9F#FF87FB06FF00FFFF',
  
  // Water Systems
  'water_pump_toggle': '19FEDB9F#2CFFC805FF00FFFF',
  'water_heater_toggle': '19FEDB9F#2BFFC805FF00FFFF',
  
  // Bar Lift Controls
  'bar_lift_up': '19FEDB9F#02FFC8010100FFFF',
  'bar_lift_down': '19FEDB9F#03FFC8010100FFFF',
  
  // Awning Controls
  'awning_extend': '19FEDB9F#09FFC8012D00FFFF',
  'awning_retract': '19FEDB9F#0AFFC8012D00FFFF',
  'awning_stop': '19FEDB9F#0BFFC8010100FFFF',
  
  // Fans
  'bath_fan_toggle': '19FEDB9F#2AFFC805FF00FFFF',
  'bay_vent_fan_toggle': '19FEDB9F#29FFC805FF00FFFF',
  
  // AC Settings
  'night_setting_on_1': '19FEF99F#01C1FFFFFFFFFFFF',
  'night_setting_on_2': '19FED99F#FF96AB0F0B00D1FF',
  'night_setting_on_3': '19FFE298#010100BA24BA2400',
  
  'dehumid_setting_on_1': '19FEF99F#01C1FFFFFFFFFFFF',
  'dehumid_setting_on_2': '19FED99F#FF96AB0F0A00D1FF',
  'dehumid_setting_on_3': '19FFE298#010164A924A92400',
  
  'cool_setting_on_1': '19FEF99F#01C1FFFFFFFFFFFF',
  'cool_setting_on_2': '19FED99F#FF96AB0F0100D1FF',

  // Adding Cool Setting Off commands
  'cool_setting_off_1': '19FEF99F#01C0FFFFFFFFFFFF',
  'cool_setting_off_2': '19FED99F#FF96AA0F0000D1FF',
  
  // Fan Off commands (to completely turn off when cooling is off)
  'fan_off_1': '19FEF998#A1C0008A24AE19FF',
  'fan_off_2': '19FEF898#A100000000000000',
  
  'toe_kick_on_1': '19FEF99F#01C2FFFFFFFFFFFF',
  'toe_kick_on_2': '19FED99F#FF96AA0F0000D1FF',
  'toe_kick_on_3': '19FFE298#100264A924A92400',

  'toe_kick_off_1': '19FEF99F#01F0FFFFFFFFFFFF',
  'toe_kick_off_2': '19FFE298#010064E024E02400',
  
  // Add these new commands to the commands dictionary
  'furnace_on_1': '19FEF99F#05F2FFFFFFFFFFFF',
  'furnace_on_2': '19FEF99F#01C0FFFFFFFFFFFF',
  'furnace_on_3': '19FED99F#FF96AA0F0000D1FF',
  'furnace_on_4': '19FFE298#0502008E24C42400',

  'furnace_off_1': '19FEF99F#05C0FFFFFFFFFFFF',
  'furnace_off_2': '19FFE298#050000C524FB2400',
  
  // Auto Setting Commands (newly added)
  'auto_setting_on_1': '19FEF99F#01C0FFFFFFFFFFFF',
  'auto_setting_on_2': '19FED99F#FF96AA0F0000D1FF',
  'auto_setting_on_3': '19FFE198#010064A924A92400',
  
  // Fan Speed Controls
  'high_fan_speed_1': '19FED99F#FF96AA0FC800D1FF',
  'high_fan_speed_2': '195FCE98#AA00C80000000000',
  'high_fan_speed_3': '19FEF998#A110C88A24AE19FF',

  'medium_fan_speed_1': '19FED99F#FF96AA0F6400D1FF',
  'medium_fan_speed_2': '195FCE98#AA00640000000000',
  'medium_fan_speed_3': '19FEF998#A110328A24AE19FF',

  'low_fan_speed_1': '19FED99F#FF96AA0F3200D1FF',
  'low_fan_speed_2': '195FCE98#AA00320000000000',
  'low_fan_speed_3': '19FEF998#A110198A24AE19FF',
  
  // Thermostat Controls
  'temp_increase': '19FEF99F#01FFFFFFFFFAFFFF',
  'temp_decrease': '19FEF99F#01FFFFFFFFF9FFFF'
};

// Map of light IDs to their corresponding command prefix
// This is used for dimming functionality
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

// Function to execute consecutive commands (for commands that need to be sent together)
function executeConsecutiveCommands(commandsArray) {
  return new Promise(async (resolve, reject) => {
    try {
      const results = [];
      for (const cmd of commandsArray) {
        const result = await executeCansendCommand(cmd);
        results.push(result);
      }
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
}

// Execute CAN command through shell
function executeCansendCommand(command) {
  return new Promise((resolve, reject) => {
    exec(`cansend can0 ${command}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error}`);
        reject(error);
        return;
      }
      
      // Broadcast CAN message to websocket clients
      broadcastCommandExecution(command);
      
      resolve(stdout || 'Command executed successfully');
    });
  });
}

// Group commands that need to be sent together
const commandGroups = {
  'all_lights_on': ['all_lights_on_1', 'all_lights_on_2'],
  'all_lights_off': ['all_lights_off_1', 'all_lights_off_2'],
  'night_setting': ['night_setting_on_1', 'night_setting_on_2', 'night_setting_on_3'],
  'dehumid_setting': ['dehumid_setting_on_1', 'dehumid_setting_on_2', 'dehumid_setting_on_3'],
  'cool_setting': ['cool_setting_on_1', 'cool_setting_on_2'],
  'cool_setting_off': ['cool_setting_off_1', 'cool_setting_off_2'],
  'fan_off': ['fan_off_1', 'fan_off_2'],
  'complete_cool_off': ['cool_setting_off_1', 'cool_setting_off_2', 'fan_off_1', 'fan_off_2'],
  'toe_kick': ['toe_kick_on_1', 'toe_kick_on_2', 'toe_kick_on_3'],
  'toe_kick_off': ['toe_kick_off_1', 'toe_kick_off_2'],
  'furnace_on': ['furnace_on_1', 'furnace_on_2', 'furnace_on_3', 'furnace_on_4'],
  'furnace_off': ['furnace_off_1', 'furnace_off_2'],
  'high_fan': ['high_fan_speed_1', 'high_fan_speed_2', 'high_fan_speed_3'],
  'medium_fan': ['medium_fan_speed_1', 'medium_fan_speed_2', 'medium_fan_speed_3'],
  'low_fan': ['low_fan_speed_1', 'low_fan_speed_2', 'low_fan_speed_3'], 
  'auto_setting': ['auto_setting_on_1', 'auto_setting_on_2', 'auto_setting_on_3'],
};

// ========== WebSocket CAN Bus Monitoring Functions ==========

// Start CAN bus monitoring
function startCANMonitoring() {
  if (canDumpProcess) {
    return; // Already running
  }
  
  try {
    // Start candump process to monitor CAN bus
    canDumpProcess = spawn('candump', ['can0', '-t', 'a']);
    
    console.log('CAN bus monitoring started');
    
    // Handle output
    canDumpProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      
      lines.forEach(line => {
        try {
          // Skip empty lines
          if (!line || line.trim() === '') {
            return;
          }
          
          // Parse CAN message
          const message = parseCANMessage(line);
          
          // Only broadcast if we have a valid message
          if (message && message.id) {
            broadcastCANMessage(message);
          }
        } catch (error) {
          console.error('Error parsing CAN message:', error);
        }
      });
    });
    
    canDumpProcess.stderr.on('data', (data) => {
      console.error(`candump stderr: ${data}`);
    });
    
    canDumpProcess.on('close', (code) => {
      console.log(`candump process exited with code ${code}`);
      canDumpProcess = null;
      
      // Try to restart after delay if it closed unexpectedly
      if (code !== 0) {
        setTimeout(startCANMonitoring, 5000);
      }
    });
  } catch (error) {
    console.error('Failed to start CAN bus monitoring:', error);
    canDumpProcess = null;
  }
}

// Parse CAN message from candump output - Enhanced
function parseCANMessage(line) {
  try {
    // Example line: can0  19FEDA98   [8]  18 FF C8 FC FF 05 04 00
    // or with timestamp: (1234567890.123456) can0  19FEDA98   [8]  18 FF C8 FC FF 05 04 00
    
    // Remove timestamp if present
    let cleanLine = line.trim();
    if (cleanLine.startsWith('(')) {
      const timestampEnd = cleanLine.indexOf(')');
      if (timestampEnd !== -1) {
        cleanLine = cleanLine.substring(timestampEnd + 1).trim();
      }
    }
    
    const parts = cleanLine.split(/\s+/);
    
    if (parts.length < 4) {
      return null; // Not enough parts to be valid
    }
    
    const canInterface = parts[0]; // 'can0'
    const id = parts[1]; // '19FEDA98'
    const dataLengthStr = parts[2]; // '[8]'
    const data = parts.slice(3); // ['18', 'FF', 'C8', 'FC', 'FF', '05', '04', '00']
    
    // Extract data length
    const dataLength = dataLengthStr.replace(/[\[\]]/g, '');
    
    // Validate that we have the expected amount of data
    if (data.length === 0) {
      return null;
    }
    
    return {
      interface: canInterface,
      id,
      dataLength: parseInt(dataLength) || data.length,
      data,
      timestamp: Date.now(),
      rawLine: line // Keep original for debugging
    };
  } catch (error) {
    console.error('Error in parseCANMessage:', error);
    return null;
  }
}

// Broadcast CAN message to all connected WebSocket clients - Enhanced
function broadcastCANMessage(message) {
  if (!message) return;
  
  try {
    const messageObj = {
      type: 'canMessage',
      data: message,
      timestamp: Date.now()
    };
    
    const messageStr = JSON.stringify(messageObj);
    
    // Send to all connected clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (sendError) {
          console.error('Error sending message to client:', sendError);
          // Remove dead clients
          clients.delete(client);
        }
      }
    });
    
    // Optional: Log interesting messages (avoid spam)
    if (message.id === '19FEDA98' || message.id === '19FEDB9F') {
      console.log(`CAN: ${message.id} [${message.dataLength}] ${message.data.join(' ')}`);
    }
  } catch (error) {
    console.error('Error broadcasting CAN message:', error);
  }
}

// Broadcast command execution to WebSocket clients - Enhanced
function broadcastCommandExecution(command) {
  try {
    const messageObj = {
      type: 'commandExecuted',
      command: command,
      timestamp: Date.now()
    };
    
    const messageStr = JSON.stringify(messageObj);
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (sendError) {
          console.error('Error sending command execution to client:', sendError);
          clients.delete(client);
        }
      }
    });
  } catch (error) {
    console.error('Error broadcasting command execution:', error);
  }
}

// Handle WebSocket connections - Enhanced
wss.on('connection', (ws) => {
  // Add client to set
  clients.add(ws);
  console.log(`New WebSocket client connected (${clients.size} total)`);
  
  // Start CAN monitoring if not already running
  startCANMonitoring();
  
  // Send initial state of the system
  try {
    const initialMessage = {
      type: 'initialState',
      timestamp: Date.now(),
      status: 'connected'
    };
    
    ws.send(JSON.stringify(initialMessage));
  } catch (error) {
    console.error('Error sending initial state:', error);
  }
  
  // Handle client messages (for bidirectional communication)
  ws.on('message', (message) => {
    try {
      let data;
      
      // Handle both string and buffer messages
      if (Buffer.isBuffer(message)) {
        data = JSON.parse(message.toString());
      } else {
        data = JSON.parse(message);
      }
      
      // Handle client commands
      if (data.type === 'command') {
        // Execute command if it exists
        if (commands[data.command]) {
          executeCansendCommand(commands[data.command])
            .then(() => {
              console.log(`Command ${data.command} executed via WebSocket`);
            })
            .catch(error => {
              console.error(`Error executing command ${data.command} via WebSocket:`, error);
            });
        } 
        // Execute raw command
        else if (data.rawCommand) {
          executeCansendCommand(data.rawCommand)
            .then(() => {
              console.log(`Raw command executed via WebSocket: ${data.rawCommand}`);
            })
            .catch(error => {
              console.error(`Error executing raw command via WebSocket:`, error);
            });
        }
      }
      
      // Handle state update messages from clients
      if (data.type === 'stateUpdate') {
        // Broadcast to all other clients to keep them in sync
        const stateMessage = JSON.stringify(data);
        clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            try {
              client.send(stateMessage);
            } catch (sendError) {
              console.error('Error relaying state update:', sendError);
              clients.delete(client);
            }
          }
        });
      }
      
      // Handle specific subscription requests
      if (data.type === 'subscribe') {
        console.log(`Client subscribed to: ${data.topics ? data.topics.join(', ') : 'all topics'}`);
        
        // Send acknowledgment
        try {
          const ackMessage = {
            type: 'subscriptionAck',
            topics: data.topics || ['all'],
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(ackMessage));
        } catch (error) {
          console.error('Error sending subscription acknowledgment:', error);
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      
      // Send error message back to client
      try {
        const errorMessage = {
          type: 'error',
          message: 'Failed to process message',
          error: error.message,
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(errorMessage));
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected (${clients.size} remaining)`);
    
    // Stop CAN monitoring if no clients are connected
    if (clients.size === 0 && canDumpProcess) {
      canDumpProcess.kill();
      canDumpProcess = null;
      console.log('CAN bus monitoring stopped (no clients)');
    }
  });
  
  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws); // Remove client on error
  });
});

// ========== FIREFLY RAMP DIMMING API ENDPOINTS ==========

// Enhanced brightness control endpoint with ramp dimming support
app.post('/api/brightness-ramp', async (req, res) => {
  const { lightId, targetBrightness, timeout = 10000 } = req.body;
  
  if (!lightId || targetBrightness === undefined) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Light ID and target brightness must be provided' 
    });
  }
  
  // Validate brightness range
  const brightnessLevel = Math.max(0, Math.min(100, parseInt(targetBrightness)));
  
  try {
    const prefix = lightPrefixMap[lightId];
    if (!prefix) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown light ID or light does not support dimming'
      });
    }
    
    // Handle turning off
    if (brightnessLevel === 0) {
      const offCommand = `19FEDB9F#${prefix}FF0003FF00FFFF`;
      await executeCansendCommand(offCommand);
      
      return res.json({
        status: 'success',
        message: `${lightId} turned off`,
        lightId,
        brightness: 0,
        method: 'direct_off'
      });
    }
    
    // For brightness > 0, start ramp dimming
    console.log(`Starting ramp dimming for ${lightId} to ${brightnessLevel}%`);
    
    // Send ramp command (command 21 = 0x15)
    const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
    await executeCansendCommand(rampCommand);
    
    // Monitor brightness and auto-stop when target is reached
    const startTime = Date.now();
    let currentBrightness = 0;
    let attempts = 0;
    const maxAttempts = timeout / 200; // Check every 200ms
    
    // Start monitoring loop
    const monitorPromise = new Promise(async (resolve, reject) => {
      const monitor = async () => {
        try {
          attempts++;
          
          // Check timeout
          if (Date.now() - startTime > timeout) {
            // Send stop command
            const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
            await executeCansendCommand(stopCommand);
            reject(new Error('Ramp dimming timeout'));
            return;
          }
          
          // Get current brightness from recent CAN messages
          currentBrightness = await getCurrentBrightnessFromCAN(lightId);
          
          // Check if target reached (within 3% tolerance)
          const targetReached = Math.abs(currentBrightness - brightnessLevel) <= 3;
          
          if (targetReached || attempts >= maxAttempts) {
            // Send stop command
            const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
            await executeCansendCommand(stopCommand);
            
            resolve({
              finalBrightness: currentBrightness,
              targetReached,
              attempts,
              duration: Date.now() - startTime
            });
            return;
          }
          
          // Continue monitoring
          setTimeout(monitor, 200);
          
        } catch (error) {
          // Send stop command on error
          try {
            const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
            await executeCansendCommand(stopCommand);
          } catch (stopError) {
            console.error('Error sending stop command:', stopError);
          }
          reject(error);
        }
      };
      
      // Start monitoring
      setTimeout(monitor, 200);
    });
    
    // Wait for monitoring to complete
    const result = await monitorPromise;
    
    res.json({
      status: 'success',
      message: `${lightId} brightness set via ramp dimming`,
      lightId,
      targetBrightness: brightnessLevel,
      finalBrightness: result.finalBrightness,
      targetReached: result.targetReached,
      duration: result.duration,
      method: 'ramp_dimming'
    });
    
  } catch (error) {
    console.error('Ramp dimming error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to set brightness via ramp dimming',
      error: error.message,
      lightId,
      targetBrightness: brightnessLevel
    });
  }
});

// Get current brightness from recent CAN messages
async function getCurrentBrightnessFromCAN(lightId) {
  try {
    // Map light ID to instance number
    const lightInstanceMap = {
      'bath_light': 21,        // 0x15
      'vibe_light': 22,        // 0x16
      'vanity_light': 23,      // 0x17
      'dinette_lights': 24,    // 0x18
      'awning_lights': 25,     // 0x19
      'kitchen_lights': 26,    // 0x1A
      'bed_ovhd_light': 27,    // 0x1B
      'shower_lights': 28,     // 0x1C
      'under_cab_lights': 29,  // 0x1D
      'hitch_lights': 30,      // 0x1E
      'porch_lights': 31,      // 0x1F
      'strip_lights': 32,      // 0x20
      'left_reading_lights': 34,  // 0x22
      'right_reading_lights': 35, // 0x23
    };
    
    const targetInstance = lightInstanceMap[lightId];
    if (!targetInstance) {
      return 0;
    }
    
    // Get recent CAN data
    const command = `candump can0 -n 20 | grep 19FEDA98`;
    
    return new Promise((resolve) => {
      exec(command, { timeout: 1000 }, (error, stdout, stderr) => {
        if (error || !stdout) {
          resolve(0); // Default to 0 if can't get data
          return;
        }
        
        const lines = stdout.trim().split('\n');
        let latestBrightness = 0;
        
        // Process lines to find the most recent status for this light
        lines.forEach(line => {
          try {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              const data = parts.slice(3);
              
              // Check if this is for our target light
              const instanceHex = data[0];
              const instance = parseInt(instanceHex, 16);
              
              if (instance === targetInstance) {
                // Check if this is a dimming status update (byte 3 = FC)
                const statusHex = data[3];
                if (statusHex && statusHex.toString().toUpperCase() === 'FC') {
                  // Get brightness from byte 2
                  const brightnessHex = data[2];
                  const brightness = parseInt(brightnessHex, 16);
                  
                  // Convert to percentage (0-200 -> 0-100%)
                  latestBrightness = Math.round((brightness / 200) * 100);
                }
              }
            }
          } catch (parseError) {
            // Ignore parsing errors for individual lines
          }
        });
        
        resolve(latestBrightness);
      });
    });
    
  } catch (error) {
    console.error('Error getting current brightness:', error);
    return 0;
  }
}

// Cancel active dimming operation
app.post('/api/cancel-dimming', async (req, res) => {
  const { lightId } = req.body;
  
  if (!lightId) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Light ID must be provided' 
    });
  }
  
  try {
    const prefix = lightPrefixMap[lightId];
    if (!prefix) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown light ID'
      });
    }
    
    // Send stop command (command 4 = 0x04)
    const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
    await executeCansendCommand(stopCommand);
    
    res.json({
      status: 'success',
      message: `Dimming cancelled for ${lightId}`,
      lightId
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to cancel dimming',
      error: error.message 
    });
  }
});

// Get real-time brightness status for all lights
app.get('/api/brightness-status', async (req, res) => {
  try {
    // Get recent dimming status messages
    const command = `candump can0 -n 50 | grep 19FEDA98`;
    
    exec(command, { timeout: 2000 }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to get brightness status',
          error: error.message
        });
      }
      
      const lightStates = {};
      const lines = stdout.trim().split('\n');
      
      // Instance to light ID mapping
      const instanceToLightId = {
        21: 'bath_light',        // 0x15
        22: 'vibe_light',        // 0x16
        23: 'vanity_light',      // 0x17
        24: 'dinette_lights',    // 0x18
        25: 'awning_lights',     // 0x19
        26: 'kitchen_lights',    // 0x1A
        27: 'bed_ovhd_light',    // 0x1B
        28: 'shower_lights',     // 0x1C
        29: 'under_cab_lights',  // 0x1D
        30: 'hitch_lights',      // 0x1E
        31: 'porch_lights',      // 0x1F
        32: 'strip_lights',      // 0x20
        34: 'left_reading_lights', // 0x22
        35: 'right_reading_lights', // 0x23
      };
      
      // Process each line
      lines.forEach(line => {
        try {
          if (!line.trim()) return;
          
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 7) {
            const data = parts.slice(3);
            
            // Parse instance and brightness
            const instanceHex = data[0];
            const instance = parseInt(instanceHex, 16);
            const lightId = instanceToLightId[instance];
            
            if (lightId) {
              // Check if this is a status update
              const statusHex = data[3];
              if (statusHex && statusHex.toString().toUpperCase() === 'FC') {
                const brightnessHex = data[2];
                const brightness = parseInt(brightnessHex, 16);
                const percentage = Math.round((brightness / 200) * 100);
                
                // Store the most recent status for each light
                lightStates[lightId] = {
                  brightness: percentage,
                  isOn: percentage > 0,
                  instance: instance,
                  timestamp: Date.now()
                };
              }
            }
          }
        } catch (parseError) {
          // Ignore individual line parsing errors
        }
      });
      
      res.json({
        status: 'success',
        timestamp: Date.now(),
        lightStates
      });
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get brightness status',
      error: error.message
    });
  }
});

// Enhanced light control with automatic method selection
app.post('/api/light-control', async (req, res) => {
  const { lightId, action, brightness, method } = req.body;
  
  if (!lightId || !action) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Light ID and action must be provided' 
    });
  }
  
  try {
    const prefix = lightPrefixMap[lightId];
    if (!prefix) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown light ID'
      });
    }
    
    let result;
    
    switch (action.toLowerCase()) {
      case 'on':
        // Turn on to full brightness (command 1 = 0x01)
        const onCommand = `19FEDB9F#${prefix}FFC801FF00FFFF`;
        await executeCansendCommand(onCommand);
        result = { action: 'on', brightness: 100, method: 'direct' };
        break;
        
      case 'off':
        // Turn off (command 3 = 0x03)
        const offCommand = `19FEDB9F#${prefix}FF0003FF00FFFF`;
        await executeCansendCommand(offCommand);
        result = { action: 'off', brightness: 0, method: 'direct' };
        break;
        
      case 'toggle':
        // Use existing toggle command
        const toggleCommand = `${lightId}_toggle`;
        await executeCansendCommand(commands[toggleCommand]);
        result = { action: 'toggle', method: 'predefined' };
        break;
        
      case 'dim':
      case 'brightness':
        if (brightness === undefined) {
          return res.status(400).json({ 
            status: 'error', 
            message: 'Brightness value required for dimming' 
          });
        }
        
        // Use ramp dimming by default unless method is specified
        if (method === 'direct') {
          // Direct brightness setting (not recommended for Firefly)
          const brightnessLevel = Math.max(1, Math.min(50, Math.round((brightness / 100) * 50)));
          const hexValue = brightnessLevel.toString(16).padStart(2, '0').toUpperCase();
          const directCommand = `19FEDB9F#${prefix}FF00${hexValue}0000FFFF`;
          await executeCansendCommand(directCommand);
          result = { action: 'brightness', brightness, method: 'direct' };
        } else {
          // Use ramp dimming (recommended)
          const rampResult = await performRampDimming(lightId, prefix, brightness);
          result = { action: 'brightness', ...rampResult, method: 'ramp' };
        }
        break;
        
      default:
        return res.status(400).json({ 
          status: 'error', 
          message: 'Unknown action. Supported: on, off, toggle, dim, brightness' 
        });
    }
    
    res.json({
      status: 'success',
      message: `${action} executed for ${lightId}`,
      lightId,
      result
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: `Failed to execute ${action} for ${lightId}`,
      error: error.message 
    });
  }
});

// Helper function for ramp dimming
async function performRampDimming(lightId, prefix, targetBrightness, timeout = 10000) {
  console.log(`Performing ramp dimming for ${lightId} to ${targetBrightness}%`);
  
  // Start ramp command
  const rampCommand = `19FEDB9F#${prefix}FF00150000FFFF`;
  await executeCansendCommand(rampCommand);
  
  const startTime = Date.now();
  let finalBrightness = 0;
  let targetReached = false;
  
  // Monitor and stop when target is reached
  try {
    const result = await new Promise((resolve, reject) => {
      const monitor = async () => {
        try {
          if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout'));
            return;
          }
          
          const currentBrightness = await getCurrentBrightnessFromCAN(lightId);
          
          if (Math.abs(currentBrightness - targetBrightness) <= 3) {
            resolve({ 
              finalBrightness: currentBrightness, 
              targetReached: true,
              duration: Date.now() - startTime 
            });
            return;
          }
          
          setTimeout(monitor, 200);
        } catch (error) {
          reject(error);
        }
      };
      
      setTimeout(monitor, 200);
    });
    
    finalBrightness = result.finalBrightness;
    targetReached = result.targetReached;
    
  } catch (error) {
    console.log(`Ramp dimming ${error.message === 'Timeout' ? 'timeout' : 'error'} for ${lightId}`);
  } finally {
    // Always send stop command
    const stopCommand = `19FEDB9F#${prefix}FF00040000FFFF`;
    await executeCansendCommand(stopCommand);
  }
  
  return {
    targetBrightness,
    finalBrightness,
    targetReached,
    duration: Date.now() - startTime
  };
}

// ========== ORIGINAL API ENDPOINTS ==========

// API endpoint to list all available commands
app.get('/api/commands', (req, res) => {
  // Create a list of individual commands and command groups
  const availableCommands = {
    individual: Object.keys(commands),
    groups: Object.keys(commandGroups)
  };
  
  res.json({
    status: 'success',
    data: availableCommands
  });
});

// API endpoint to execute a predefined command
app.post('/api/execute', async (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'No command specified' 
    });
  }
  
  try {
    // Check if it's a command group
    if (commandGroups[command]) {
      const cmdArray = commandGroups[command].map(cmd => commands[cmd]);
      const results = await executeConsecutiveCommands(cmdArray);
      
      res.json({ 
        status: 'success', 
        command,
        message: 'Command group executed successfully',
        results
      });
    } 
    // Check if it's an individual command
    else if (commands[command]) {
      const result = await executeCansendCommand(commands[command]);
      
      res.json({ 
        status: 'success', 
        command,
        message: 'Command executed successfully',
        result 
      });
    } 
    else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown command' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to execute command',
      error: error.message 
    });
  }
});

// API endpoint to execute a raw CAN command
app.post('/api/raw', async (req, res) => {
  const { canCommand } = req.body;
  
  if (!canCommand) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'No CAN command specified' 
    });
  }
  
  try {
    const result = await executeCansendCommand(canCommand);
    res.json({ 
      status: 'success', 
      command: canCommand,
      message: 'Raw command executed successfully',
      result 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to execute raw command',
      error: error.message 
    });
  }
});

// Get system status
app.get('/api/status', (req, res) => {
  exec('ifconfig can0', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get CAN interface status',
        error: error.message
      });
    }
    
    res.json({
      status: 'success',
      message: 'System is online',
      canInterface: stdout,
      websocketClients: clients.size,
      canMonitoringActive: !!canDumpProcess
    });
  });
});

// API endpoint to set the brightness of a light (ORIGINAL - LEGACY)
app.post('/api/brightness', async (req, res) => {
  const { lightId, level } = req.body;
  
  if (!lightId || level === undefined) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Light ID and brightness level must be provided' 
    });
  }
  
  // Validate level is between 0 and 50 (Firefly limitation)
  const brightnessLevel = Math.min(50, Math.max(0, parseInt(level)));
  
  try {
    // Check if this is a valid light ID with dimming support
    const prefix = lightPrefixMap[lightId];
    if (!prefix) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown light ID or light does not support dimming'
      });
    }
    
    // Handle special case for level 0
    if (brightnessLevel === 0) {
      // Use the off command pattern: 19FEDB9F#XXFF0003FF00FFFF
      const offCommand = `19FEDB9F#${prefix}FF0003FF00FFFF`;
      await executeCansendCommand(offCommand);
      
      return res.json({
        status: 'success',
        message: `${lightId} turned off`,
        lightId,
        level: 0
      });
    }
    
    // Convert brightness to hex value (1-50 range for Firefly)
    const hexValue = brightnessLevel.toString(16).padStart(2, '0').toUpperCase();
    
    // Construct the command based on PDF documentation format: 19FEDB9F#XXFF00YYYYYY0000FFFF
    const brightnessCommand = `19FEDB9F#${prefix}FF00${hexValue}0000FFFF`;
    
    // Execute the command
    await executeCansendCommand(brightnessCommand);
    
    res.json({
      status: 'success',
      message: `Brightness set to ${brightnessLevel}% for ${lightId}`,
      lightId,
      level: brightnessLevel
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to set brightness',
      error: error.message,
      lightId,
      level
    });
  }
});

// API endpoint to get the latest CAN bus data
app.get('/api/can-data', (req, res) => {
  const limit = req.query.limit || 50; // Default to 50 messages
  const filter = req.query.filter || null; // Optional filter
  const since = req.query.since || null; // Optional timestamp filter
  
  // Command to capture CAN data
  let command;
  if (filter) {
    command = `candump can0 -n ${limit} | grep ${filter}`;
  } else {
    command = `candump can0 -n ${limit}`;
  }
  
  exec(command, { timeout: 2000 }, (error, stdout, stderr) => {
    if (error) {
      // Handle empty results (which grep treats as an error)
      if (error.code === 1 && !stderr && filter) {
        return res.json({
          status: 'success',
          message: 'No matching CAN data found',
          canData: []
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get CAN bus data',
        error: error.message
      });
    }
    
    // Parse the candump output into a structured format
    const lines = stdout.trim().split('\n');
    const canData = lines
      .filter(line => line.trim()) // Filter out empty lines
      .map(line => {
        // Example line: can0  19FEDA98   [8]  18 FF C8 FC FF 05 04 00
        const parts = line.trim().split(/\s+/);
        
        // Extract the relevant parts
        const interface = parts[0]; // 'can0'
        const id = parts[1]; // '19FEDA98'
        const dataLength = parts[2].replace('[', '').replace(']', ''); // '8'
        const data = parts.slice(3); // ['18', 'FF', 'C8', 'FC', 'FF', '05', '04', '00']
        
        return {
          interface,
          id,
          dataLength,
          data,
          timestamp: Date.now()
        };
      });
    
    res.json({
      status: 'success',
      timestamp: Date.now(),
      canData
    });
  });
});

// API endpoint to monitor dimming updates
app.get('/api/dimming-updates', (req, res) => {
  const limit = req.query.limit || 20; // Default to 20 messages
  
  // Command to capture only dimming update messages
  const command = `candump can0 -n ${limit} | grep 19FEDA98`;
  
  exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
    if (error) {
      // If grep doesn't find any matches, it returns an error, but we can ignore it
      if (error.code === 1 && !stderr) {
        return res.json({
          status: 'success',
          message: 'No dimming updates found',
          updates: []
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get dimming updates',
        error: error.message
      });
    }
    
    // Parse the dimming updates
    const lines = stdout.trim().split('\n');
    const updates = [];
    
    // Map of CAN byte values to light IDs (reverse of lightPrefixMap)
    const lightIdMap = {};
    Object.entries(lightPrefixMap).forEach(([lightId, prefix]) => {
      lightIdMap[prefix] = lightId;
    });
    
    lines.forEach(line => {
      try {
        // Example line: can0  19FEDA98   [8]  18 FF C8 FC FF 05 04 00
        const parts = line.trim().split(/\s+/);
        
        // Get the data bytes
        const data = parts.slice(3);
        
        // The first byte is the light ID
        const lightIdHex = data[0];
        const lightId = lightIdMap[lightIdHex];
        
        if (lightId && data[3] === 'FC') {
          // Extract brightness value from third byte
          const brightnessHex = data[2];
          const brightness = parseInt(brightnessHex, 16);
          
          // Convert to percentage (0-200 -> 0-100%)
          const percentage = Math.round((brightness / 200) * 100);
          
          updates.push({
            lightId,
            brightness: percentage,
            isOn: percentage > 0,
            rawData: data.join(' ')
          });
        }
      } catch (error) {
        console.error('Error parsing dimming update:', error);
      }
    });
    
    res.json({
      status: 'success',
      timestamp: Date.now(),
      updates
    });
  });
});

// Create WebSocket endpoint for CAN bus data
app.get('/api/can-ws', (req, res) => {
  res.json({
    status: 'success',
    message: 'WebSocket endpoint available at /can-ws',
    instructions: 'Connect using WebSocket protocol'
  });
});

// Start the server
server.listen(port, () => {
  console.log(`RV Control API server running on port ${port}`);
  console.log(`WebSocket server running on ws://localhost:${port}/can-ws`);
  console.log(`Enhanced with Firefly Ramp Dimming support`);
});