// sync-server.js - WebSocket server for RV state synchronization

const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients with their device IDs
const clients = new Map();

// Store current system state to send to new clients
let currentState = {
  lights: {},
  climate: {},
  water: {},
  power: {},
  fans: {},
  awning: {},
  lastUpdate: new Date().toISOString()
};

// CAN bus monitor process
let canDumpProcess = null;

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`RV Sync Server running on port ${PORT}`);
  startCANMonitoring();
});

// Start CAN bus monitoring
function startCANMonitoring() {
  console.log('Starting CAN bus monitoring...');
  
  if (canDumpProcess) {
    return; // Already running
  }
  
  try {
    // Start candump process to monitor CAN bus
    canDumpProcess = spawn('candump', ['can0', '-t', 'a']);
    
    console.log('CAN dump process started');
    
    // Handle output
    canDumpProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      
      lines.forEach(line => {
        try {
          // Parse CAN message
          const message = parseCANMessage(line);
          
          // Update state based on CAN message
          updateStateFromCAN(message);
          
          // Broadcast to all connected clients
          broadcastCANMessage(message);
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

// Parse CAN message from candump output
function parseCANMessage(line) {
  // Example line: can0  19FEDA98   [8]  18 FF C8 FC FF 05 04 00
  const parts = line.trim().split(/\s+/);
  
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
}

// Update system state based on CAN message
function updateStateFromCAN(message) {
  try {
    // Extract DGN from message ID
    const dgn = message.id.substring(0, 6);
    
    // Handle different DGNs
    if (dgn === '1FEDA') {
      // DC_DIMMER_STATUS_3 - Light status
      const instance = parseInt(message.data[0], 16);
      const brightness = parseInt(message.data[2], 16);
      const isOn = ((parseInt(message.data[6], 16) >> 2) & 0x03) === 1;
      
      // Map instance to light ID
      const lightId = mapInstanceToLightId(instance);
      
      if (lightId) {
        // Update light state
        currentState.lights[lightId] = {
          isOn,
          brightness: brightness,
          lastUpdated: new Date().toISOString()
        };
        
        currentState.lastUpdate = new Date().toISOString();
      }
    }
    // Add handlers for other message types
    
  } catch (error) {
    console.error('Error updating state from CAN message:', error);
  }
}

// Map instance numbers to light IDs
function mapInstanceToLightId(instance) {
  const instanceMap = {
    26: 'kitchen_lights',
    21: 'bath_light',
    27: 'bed_ovhd_light',
    22: 'vibe_light',
    23: 'vanity_light',
    25: 'awning_lights',
    28: 'shower_lights',
    29: 'under_cab_lights',
    30: 'hitch_lights',
    31: 'porch_lights',
    34: 'left_reading_lights',
    35: 'right_reading_lights',
    24: 'dinette_lights',
    32: 'strip_lights'
  };
  
  return instanceMap[instance];
}

// Broadcast CAN message to all connected clients
function broadcastCANMessage(message) {
  const messageStr = JSON.stringify({
    type: 'canMessage',
    message
  });
  
  clients.forEach((client, deviceId) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Broadcast state update to all clients except the sender
function broadcastStateUpdate(sourceDeviceId, update) {
  const messageStr = JSON.stringify({
    type: 'stateUpdate',
    sourceDeviceId,
    update,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach((client, deviceId) => {
    // Don't send back to the source device
    if (deviceId !== sourceDeviceId && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  // Generate unique ID for this connection
  const connectionId = uuidv4();
  clients.set(connectionId, ws);
  
  console.log(`New client connected: ${connectionId} (${clients.size} total)`);
  
  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'initialState',
    state: currentState,
    timestamp: new Date().toISOString()
  }));
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Update device ID if provided
      if (data.deviceId) {
        // Remove old entry if this device was connected before
        clients.forEach((client, id) => {
          if (id === connectionId) {
            clients.delete(id);
          }
        });
        
        // Add with proper device ID
        clients.set(data.deviceId, ws);
        console.log(`Updated client ID: ${connectionId} -> ${data.deviceId}`);
      }
      
      // Handle state updates from clients
      if (data.type === 'stateUpdate') {
        // Update current state
        if (data.update) {
          Object.keys(data.update).forEach(category => {
            currentState[category] = {
              ...currentState[category],
              ...data.update[category]
            };
          });
          
          currentState.lastUpdate = new Date().toISOString();
        }
        
        // Broadcast to other clients
        broadcastStateUpdate(data.deviceId, data.update);
      }
      
      // Handle command execution requests
      if (data.type === 'command') {
        // Execute command on the server (send to CAN bus)
        executeCANCommand(data.command);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    // Remove client
    clients.delete(connectionId);
    console.log(`Client disconnected: ${connectionId} (${clients.size} remaining)`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${connectionId}:`, error);
    clients.delete(connectionId);
  });
});

// Execute CAN command
function executeCANCommand(command) {
  if (!command || !command.canId || !command.data) {
    console.error('Invalid command format');
    return;
  }
  
  // Format command for cansend
  const canCommand = `${command.canId}#${command.data}`;
  
  // Execute command
  const { exec } = require('child_process');
  exec(`cansend can0 ${canCommand}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
      return;
    }
    console.log(`Command executed: ${canCommand}`);
  });
}

// Basic web API endpoint to check server status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    clients: clients.size,
    canMonitoring: !!canDumpProcess,
    lastUpdate: currentState.lastUpdate
  });
});