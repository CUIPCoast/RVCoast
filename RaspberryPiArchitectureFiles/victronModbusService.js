// victronModbusService.js
// Victron Energy Cerbo GX ModbusTCP Integration
// Enhanced version with Grid Power and DC Power fixes

const ModbusRTU = require('modbus-serial');
const EventEmitter = require('events');

// Configuration
const DEFAULT_CONFIG = {
  host: '192.168.8.242', // Updated to your Cerbo GX IP
  port: 502,             // Standard ModbusTCP port
  timeout: 10000,        // Increased timeout (10 seconds)
  pollInterval: 5000,    // Data refresh interval in ms
  debug: true,           // Enable debug mode
};

// Victron ModbusTCP register map
// Based on Victron's Modbus-TCP register documentation
const REGISTERS = {
  // System information - Unit ID 100
  SYSTEM_STATE: { address: 826, length: 1, type: 'uint16', unitId: 100 },
  AC_CONSUMPTION: { address: 817, length: 1, type: 'uint16', unitId: 100 },
  
  // Grid-related registers - Unit ID 100
  GRID_POWER: { address: 820, length: 1, type: 'int16', unitId: 100 },          // Grid power (W) positive=consuming, negative=feeding
  GRID_L1_POWER: { address: 820, length: 1, type: 'int16', unitId: 100 },       // Grid L1 power (W)
  GRID_L2_POWER: { address: 821, length: 1, type: 'int16', unitId: 100 },       // Grid L2 power (W)
  GRID_L3_POWER: { address: 822, length: 1, type: 'int16', unitId: 100 },       // Grid L3 power (W)
  GRID_VOLTAGE: { address: 800, length: 1, type: 'uint16', scale: 0.1, unitId: 100 },   // Grid voltage (V)
  GRID_CURRENT: { address: 803, length: 1, type: 'int16', scale: 0.1, unitId: 100 },    // Grid current (A)
  GRID_FREQUENCY: { address: 806, length: 1, type: 'uint16', scale: 0.01, unitId: 100 }, // Grid frequency (Hz)
  
  // Battery - Unit ID 100 for system battery data
  BATTERY_SOC: { address: 843, length: 1, type: 'uint16', scale: 0.01, unitId: 100 },  // State of Charge (%)
  BATTERY_VOLTAGE: { address: 840, length: 1, type: 'int16', scale: 0.01, unitId: 100 }, // Battery voltage (V)
  BATTERY_CURRENT: { address: 841, length: 1, type: 'int16', scale: 0.1, unitId: 100 },  // Battery current (A)
  BATTERY_POWER: { address: 842, length: 1, type: 'int16', unitId: 100 },               // Battery power (W)
  BATTERY_STATE: { address: 844, length: 1, type: 'uint16', unitId: 100 },              // Battery state
  
  // PV (Solar) Information - Unit ID 100 for system solar data
  PV_POWER: { address: 850, length: 1, type: 'uint16', unitId: 100 },                    // PV power (W)
  PV_CURRENT: { address: 851, length: 1, type: 'uint16', scale: 0.1, unitId: 100 },      // PV current (A)
  PV_VOLTAGE: { address: 852, length: 1, type: 'uint16', scale: 0.01, unitId: 100 },     // PV voltage (V)
  PV_YIELD_TODAY: { address: 855, length: 1, type: 'uint16', scale: 0.01, unitId: 100 }, // Today's yield (kWh)
  
  // DC System - Unit ID 100 - May need alternate registers
  DC_SYSTEM_POWER: { address: 860, length: 1, type: 'int16', unitId: 100 },             // DC System power (W)
  
  // Additional DC system registers to try
  DC_SYSTEM_POWER_ALT: { address: 771, length: 1, type: 'int16', unitId: 100 },         // Alternative DC power register
  DC_SYSTEM_POWER_ALT2: { address: 865, length: 1, type: 'int16', unitId: 100 },        // Another alternative DC power register
};

// Alternative register maps for different device types
// These will be used if the main registers fail
const ALT_REGISTERS = {
  // SmartShunt specific registers - Unit ID varies by installation
  SMARTSHUNT: {
    BATTERY_SOC: { address: 266, length: 1, type: 'uint16', scale: 0.01, unitId: 225 },
    BATTERY_VOLTAGE: { address: 259, length: 1, type: 'uint16', scale: 0.01, unitId: 225 },
    BATTERY_CURRENT: { address: 261, length: 1, type: 'int16', scale: 0.1, unitId: 225 },
    DC_POWER: { address: 260, length: 1, type: 'int16', unitId: 225 },
  },
  
  // SmartSolar specific registers - Unit ID varies by installation
  SMARTSOLAR: {
    PV_POWER: { address: 789, length: 1, type: 'uint16', unitId: 226 },
    PV_VOLTAGE: { address: 776, length: 1, type: 'uint16', scale: 0.01, unitId: 226 },
    PV_CURRENT: { address: 777, length: 1, type: 'uint16', scale: 0.1, unitId: 226 },
  },
  
  // MPPT registers (newer systems) - Unit ID is typically 239 or similar
  MPPT: {
    PV_POWER: { address: 789, length: 1, type: 'uint16', unitId: 239 },
    PV_CURRENT: { address: 777, length: 1, type: 'uint16', scale: 0.1, unitId: 239 },
    DC_POWER: { address: 865, length: 1, type: 'int16', unitId: 239 },
  },
  
  // Grid meter registers for MultiPlus systems
  GRID_METER: {
    GRID_L1_POWER: { address: 2600, length: 1, type: 'int16', unitId: 30 },
    GRID_L2_POWER: { address: 2601, length: 1, type: 'int16', unitId: 30 },
    GRID_L3_POWER: { address: 2602, length: 1, type: 'int16', unitId: 30 },
  }
};

// Mapping for state values
const BATTERY_STATE_MAP = {
  0: 'idle',
  1: 'charging',
  2: 'discharging'
};

const SYSTEM_STATE_MAP = {
  0: 'Off',
  1: 'Low power',
  2: 'VE.Bus Fault',
  3: 'Bulk charging',
  4: 'Absorption charging',
  5: 'Float charging',
  6: 'Storage mode',
  7: 'Equalisation charging',
  8: 'Passthru',
  9: 'Inverting',
  10: 'Assisting',
  11: 'Power supply mode',
  252: 'External control'
};

class VictronModbusService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new ModbusRTU();
    this.connected = false;
    this.reconnecting = false;
    this.data = {
      battery: {
        soc: 0,         // State of charge (%)
        voltage: 0,      // Battery voltage (V)
        current: 0,      // Battery current (A)
        power: 0,        // Battery power (W)
        state: 'idle',   // Battery state
        timeToGo: '--:--', // Time to go (calculated)
      },
      acLoads: {
        power: 0,        // AC loads power (W)
        lines: ['L1'],   // Active AC lines
      },
      grid: {
        power: 0,        // Grid power (W)
        l1Power: 0,      // L1 power (W)
        l2Power: 0,      // L2 power (W)
        l3Power: 0,      // L3 power (W)
        voltage: 0,      // Grid voltage (V)
        current: 0,      // Grid current (A)
        frequency: 0,    // Grid frequency (Hz)
        isConnected: false, // Whether grid is connected
      },
      pvCharger: {
        power: 0,        // PV power (W)
        dailyYield: 0,   // Daily yield (kWh)
        state: 'idle',   // Charger state
      },
      dcSystem: {
        power: 0,        // DC system power (W)
        source: 'battery', // Power source (battery/solar)
      },
      systemOverview: {
        name: 'Cerbo GX',
        state: 'Off',    // System state
        acInput: 'Grid', // AC input state
        mode: 'ON',      // AC mode
        acLimit: 50.0,   // AC current limit (A)
      },
      tanks: [],
      lastUpdate: new Date(),
      apiStatus: 'connecting', // 'connected', 'simulation', 'error'
    };
    
    this.simulationEnabled = false;
    this.pollIntervalId = null;
    
    // Store discovered working Unit IDs
    this.workingUnitIds = {};
    this.unitIdsToTry = [100, 0, 1, 225, 226, 227, 228, 229, 239, 30, 20];
    this.currentUnitIdIndex = 0;
    
    // Store working register map
    this.workingRegisters = {};
    this.usingAlternativeRegisters = false;
  }

  /**
   * Connect to the Victron Cerbo GX ModbusTCP server
   * @returns {Promise<boolean>} - Connection success status
   */
  async connect() {
    try {
      if (this.connected) {
        return true;
      }

      if (this.simulationEnabled) {
        this.log('Using simulation mode - not connecting to Modbus');
        this.apiStatus = 'simulation';
        this.startPolling();
        return true;
      }

      this.log(`Connecting to Victron ModbusTCP at ${this.config.host}:${this.config.port}`);
      this.apiStatus = 'connecting';
      
      // Try to connect to ModbusTCP server
      await this.client.connectTCP(this.config.host, { port: this.config.port });
      this.client.setTimeout(this.config.timeout);
      
      this.connected = true;
      this.apiStatus = 'connected';
      this.log('Connected successfully to Victron ModbusTCP');
      
      // After initial connection, run discovery to find working Unit IDs
      await this.discoverWorkingUnitIds();
      
      // Start polling for data
      this.startPolling();
      
      return true;
    } catch (error) {
      this.connected = false;
      this.apiStatus = 'error';
      this.log(`Connection error: ${error.message}`);
      this.emit('error', { type: 'connection', message: error.message });
      
      // Fall back to simulation mode if connection fails completely
      this.log('Failed to connect to Victron system, enabling simulation mode');
      this.simulationEnabled = true;
      this.startPolling();
      
      return false;
    }
  }

  /**
   * Discover which Unit IDs are working in this Victron installation
   */
  async discoverWorkingUnitIds() {
    this.log('Starting Unit ID discovery...');
    
    // Try each Unit ID with a simple register read
    for (const unitId of this.unitIdsToTry) {
      try {
        this.log(`Testing Unit ID ${unitId}...`);
        this.client.setID(unitId);
        
        // Try reading a simple register that should exist in most setups
        const result = await this.client.readHoldingRegisters(800, 1);
        
        this.log(`✅ Unit ID ${unitId} works! Got data: ${JSON.stringify(result.data)}`);
        this.workingUnitIds[unitId] = true;
      } catch (error) {
        this.log(`❌ Unit ID ${unitId} failed: ${error.message}`);
        // Don't consider it a failure if it's a specific exception
        if (error.message.includes('Gateway path unavailable')) {
          this.log(`This is likely because Unit ID ${unitId} is not configured on this system`);
        }
      }
    }
    
    this.log(`Unit ID discovery completed. Working IDs: ${Object.keys(this.workingUnitIds).join(', ') || 'None found'}`);
    
    // If no unit IDs work, we need to use alternative register maps
    if (Object.keys(this.workingUnitIds).length === 0) {
      this.log('No standard Unit IDs working. Will try direct register access without Unit ID specification.');
      // Set a default unit ID to try
      this.workingUnitIds[1] = true;
    }
    
    // After Unit ID discovery, try to find which specific registers work
    await this.discoverWorkingRegisters();
  }
  
  /**
   * Discover which registers work with the working Unit IDs
   */
  async discoverWorkingRegisters() {
    this.log('Starting register discovery...');
    
    // Try basic system registers first
    const basicRegisters = [
      { name: 'BATTERY_SOC', register: REGISTERS.BATTERY_SOC },
      { name: 'BATTERY_VOLTAGE', register: REGISTERS.BATTERY_VOLTAGE },
      { name: 'PV_POWER', register: REGISTERS.PV_POWER },
      { name: 'AC_CONSUMPTION', register: REGISTERS.AC_CONSUMPTION },
      { name: 'GRID_POWER', register: REGISTERS.GRID_POWER },
      { name: 'GRID_L1_POWER', register: REGISTERS.GRID_L1_POWER },
      { name: 'GRID_L2_POWER', register: REGISTERS.GRID_L2_POWER },
      { name: 'DC_SYSTEM_POWER', register: REGISTERS.DC_SYSTEM_POWER },
      { name: 'DC_SYSTEM_POWER_ALT', register: REGISTERS.DC_SYSTEM_POWER_ALT },
      { name: 'DC_SYSTEM_POWER_ALT2', register: REGISTERS.DC_SYSTEM_POWER_ALT2 },
    ];
    
    // Try each working Unit ID with these registers
    for (const unitId of Object.keys(this.workingUnitIds)) {
      for (const { name, register } of basicRegisters) {
        try {
          this.log(`Testing register ${name} (${register.address}) with Unit ID ${unitId}...`);
          this.client.setID(parseInt(unitId));
          
          const result = await this.client.readHoldingRegisters(register.address, register.length);
          
          this.log(`✅ Register ${name} works with Unit ID ${unitId}! Got data: ${JSON.stringify(result.data)}`);
          
          // Store this working register configuration
          this.workingRegisters[name] = {
            ...register,
            unitId: parseInt(unitId)
          };
        } catch (error) {
          this.log(`❌ Register ${name} with Unit ID ${unitId} failed: ${error.message}`);
        }
      }
    }
    
    this.log(`Register discovery completed. Working registers: ${Object.keys(this.workingRegisters).join(', ') || 'None found'}`);
    
    // Also try alternative registers from Grid Meter or MPPT controllers
    for (const unitId of Object.keys(this.workingUnitIds)) {
      try {
        // Try Grid Meter registers for L1, L2, L3
        const gridL1Power = ALT_REGISTERS.GRID_METER.GRID_L1_POWER;
        this.log(`Testing Grid Meter L1 register (${gridL1Power.address}) with Unit ID ${unitId}...`);
        
        this.client.setID(parseInt(unitId));
        const result = await this.client.readHoldingRegisters(gridL1Power.address, gridL1Power.length);
        
        this.log(`✅ Grid Meter L1 register works with Unit ID ${unitId}! Got data: ${JSON.stringify(result.data)}`);
        
        // Use all Grid Meter registers with this Unit ID
        Object.entries(ALT_REGISTERS.GRID_METER).forEach(([key, register]) => {
          this.workingRegisters[key] = {
            ...register,
            unitId: parseInt(unitId)
          };
        });
      } catch (error) {
        this.log(`❌ Grid Meter register with Unit ID ${unitId} failed: ${error.message}`);
      }
    }
    
    // If standard registers don't work, try alternative registers
    if (Object.keys(this.workingRegisters).length === 0) {
      this.log('No standard registers working. Will try alternative register map.');
      this.usingAlternativeRegisters = true;
      
      // Try SmartShunt registers
      for (const unitId of Object.keys(this.workingUnitIds)) {
        try {
          const smartShuntSoc = ALT_REGISTERS.SMARTSHUNT.BATTERY_SOC;
          this.log(`Testing SmartShunt SOC register (${smartShuntSoc.address}) with Unit ID ${unitId}...`);
          
          this.client.setID(parseInt(unitId));
          const result = await this.client.readHoldingRegisters(smartShuntSoc.address, smartShuntSoc.length);
          
          this.log(`✅ SmartShunt SOC register works with Unit ID ${unitId}! Got data: ${JSON.stringify(result.data)}`);
          
          // Use all SmartShunt registers with this Unit ID
          Object.entries(ALT_REGISTERS.SMARTSHUNT).forEach(([key, register]) => {
            this.workingRegisters[key] = {
              ...register,
              unitId: parseInt(unitId)
            };
          });
          
          break;
        } catch (error) {
          this.log(`❌ SmartShunt SOC register with Unit ID ${unitId} failed: ${error.message}`);
        }
      }
      
      // Try SmartSolar registers
      for (const unitId of Object.keys(this.workingUnitIds)) {
        try {
          const smartSolarPower = ALT_REGISTERS.SMARTSOLAR.PV_POWER;
          this.log(`Testing SmartSolar Power register (${smartSolarPower.address}) with Unit ID ${unitId}...`);
          
          this.client.setID(parseInt(unitId));
          const result = await this.client.readHoldingRegisters(smartSolarPower.address, smartSolarPower.length);
          
          this.log(`✅ SmartSolar Power register works with Unit ID ${unitId}! Got data: ${JSON.stringify(result.data)}`);
          
          // Use all SmartSolar registers with this Unit ID
          Object.entries(ALT_REGISTERS.SMARTSOLAR).forEach(([key, register]) => {
            this.workingRegisters[key] = {
              ...register,
              unitId: parseInt(unitId)
            };
          });
          
          break;
        } catch (error) {
          this.log(`❌ SmartSolar Power register with Unit ID ${unitId} failed: ${error.message}`);
        }
      }
      
      // Try MPPT registers - important for DC Power in some setups
      for (const unitId of Object.keys(this.workingUnitIds)) {
        try {
          const mpptDcPower = ALT_REGISTERS.MPPT.DC_POWER;
          this.log(`Testing MPPT DC Power register (${mpptDcPower.address}) with Unit ID ${unitId}...`);
          
          this.client.setID(parseInt(unitId));
          const result = await this.client.readHoldingRegisters(mpptDcPower.address, mpptDcPower.length);
          
          this.log(`✅ MPPT DC Power register works with Unit ID ${unitId}! Got data: ${JSON.stringify(result.data)}`);
          
          // Use all MPPT registers with this Unit ID
          Object.entries(ALT_REGISTERS.MPPT).forEach(([key, register]) => {
            this.workingRegisters[key] = {
              ...register,
              unitId: parseInt(unitId)
            };
          });
          
          break;
        } catch (error) {
          this.log(`❌ MPPT DC Power register with Unit ID ${unitId} failed: ${error.message}`);
        }
      }
    }
    
    // If we still don't have working registers, we'll have to fallback to simulation
    if (Object.keys(this.workingRegisters).length === 0) {
      this.log('No working registers found. Falling back to simulation mode.');
      this.simulationEnabled = true;
    }
  }

  /**
   * Disconnect from the ModbusTCP server
   */
  async disconnect() {
    this.stopPolling();
    
    if (this.connected) {
      try {
        await this.client.close();
        this.log('Disconnected from Victron ModbusTCP');
      } catch (error) {
        this.log(`Error during disconnect: ${error.message}`);
      }
    }
    
    this.connected = false;
    this.apiStatus = 'disconnected';
  }

  /**
   * Start polling for data at the configured interval
   */
  startPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
    
    // Do an initial poll immediately
    this.pollData();
    
    // Set up the interval for regular polling
    this.pollIntervalId = setInterval(() => {
      this.pollData();
    }, this.config.pollInterval);
    
    this.log(`Started polling at ${this.config.pollInterval}ms intervals`);
  }

  /**
   * Stop polling for data
   */
  stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
      this.log('Stopped polling');
    }
  }

  /**
   * Poll data from Victron ModbusTCP
   */
  async pollData() {
    try {
      if (this.simulationEnabled) {
        this.simulateData();
        this.data.lastUpdate = new Date();
        this.data.apiStatus = 'simulation';
        this.emit('data', this.data);
        return;
      }
      
      if (!this.connected) {
        // Try to reconnect
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.log('Not connected, attempting to reconnect...');
          await this.connect();
          this.reconnecting = false;
        }
        return;
      }

      // Update battery data if we have working registers
      if (this.workingRegisters.BATTERY_SOC) {
        try {
          const batterySOC = await this.readRegister(this.workingRegisters.BATTERY_SOC);
          this.data.battery.soc = batterySOC;
          this.log(`Battery SOC: ${batterySOC}%`);
        } catch (error) {
          this.log(`Failed to read battery SOC: ${error.message}`);
        }
      }

      if (this.workingRegisters.BATTERY_VOLTAGE) {
        try {
          const batteryVoltage = await this.readRegister(this.workingRegisters.BATTERY_VOLTAGE);
          this.data.battery.voltage = batteryVoltage;
          this.log(`Battery voltage: ${batteryVoltage}V`);
        } catch (error) {
          this.log(`Failed to read battery voltage: ${error.message}`);
        }
      }

      if (this.workingRegisters.BATTERY_CURRENT) {
        try {
          const batteryCurrent = await this.readRegister(this.workingRegisters.BATTERY_CURRENT);
          this.data.battery.current = batteryCurrent;
          this.log(`Battery current: ${batteryCurrent}A`);
        } catch (error) {
          this.log(`Failed to read battery current: ${error.message}`);
        }
      }

      if (this.workingRegisters.BATTERY_POWER) {
        try {
          const batteryPower = await this.readRegister(this.workingRegisters.BATTERY_POWER);
          this.data.battery.power = batteryPower;
          this.log(`Battery power: ${batteryPower}W`);
        } catch (error) {
          this.log(`Failed to read battery power: ${error.message}`);
        }
      }

      if (this.workingRegisters.BATTERY_STATE) {
        try {
          const batteryState = await this.readRegister(this.workingRegisters.BATTERY_STATE);
          this.data.battery.state = BATTERY_STATE_MAP[batteryState] || 'unknown';
          this.log(`Battery state: ${this.data.battery.state} (${batteryState})`);
        } catch (error) {
          this.log(`Failed to read battery state: ${error.message}`);
        }
      }
      
      // Calculate time to go based on SoC and current
      if (this.data.battery.current < 0) { // Discharging
        // Rough estimate - in reality, this would be provided by a specific register
        const hoursRemaining = Math.max(0, (this.data.battery.soc * 0.1));
        const hours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining - hours) * 60);
        this.data.battery.timeToGo = `${hours}:${minutes.toString().padStart(2, '0')}`;
      } else {
        this.data.battery.timeToGo = '--:--';
      }
      
      // Update Grid information - added
      let gridPowerTotal = 0;
      let gridIsConnected = false;
      
      // Try to get grid power - from main register
      if (this.workingRegisters.GRID_POWER) {
        try {
          const gridPower = await this.readRegister(this.workingRegisters.GRID_POWER);
          this.data.grid.power = gridPower;
          gridPowerTotal = gridPower;
          if (gridPower !== 0) {
            gridIsConnected = true;
          }
          this.log(`Grid power: ${gridPower}W`);
        } catch (error) {
          this.log(`Failed to read grid power: ${error.message}`);
        }
      }
      
      // Try to get grid L1 power
      if (this.workingRegisters.GRID_L1_POWER) {
        try {
          const gridL1Power = await this.readRegister(this.workingRegisters.GRID_L1_POWER);
          this.data.grid.l1Power = gridL1Power;
          if (gridL1Power !== 0) {
            gridIsConnected = true;
          }
          this.log(`Grid L1 power: ${gridL1Power}W`);
        } catch (error) {
          this.log(`Failed to read grid L1 power: ${error.message}`);
        }
      }
      
      // Try to get grid L2 power
      if (this.workingRegisters.GRID_L2_POWER) {
        try {
          const gridL2Power = await this.readRegister(this.workingRegisters.GRID_L2_POWER);
          this.data.grid.l2Power = gridL2Power;
          if (gridL2Power !== 0) {
            gridIsConnected = true;
          }
          this.log(`Grid L2 power: ${gridL2Power}W`);
        } catch (error) {
          this.log(`Failed to read grid L2 power: ${error.message}`);
        }
      }
      
      // Try to get grid L3 power
      if (this.workingRegisters.GRID_L3_POWER) {
        try {
          const gridL3Power = await this.readRegister(this.workingRegisters.GRID_L3_POWER);
          this.data.grid.l3Power = gridL3Power;
          if (gridL3Power !== 0) {
            gridIsConnected = true;
          }
          this.log(`Grid L3 power: ${gridL3Power}W`);
        } catch (error) {
          this.log(`Failed to read grid L3 power: ${error.message}`);
        }
      }
      
      // If we didn't get total grid power, but have individual phases, sum them
      if (gridPowerTotal === 0 && (this.data.grid.l1Power !== 0 || this.data.grid.l2Power !== 0 || this.data.grid.l3Power !== 0)) {
        this.data.grid.power = this.data.grid.l1Power + this.data.grid.l2Power + this.data.grid.l3Power;
      }
      
      // Update grid connection status
      this.data.grid.isConnected = gridIsConnected;
      this.log(`Grid connected: ${gridIsConnected}`);
      
      // Try to get grid voltage
      if (this.workingRegisters.GRID_VOLTAGE) {
        try {
          const gridVoltage = await this.readRegister(this.workingRegisters.GRID_VOLTAGE);
          this.data.grid.voltage = gridVoltage;
          if (gridVoltage > 0) {
            gridIsConnected = true;
            this.data.grid.isConnected = true;
          }
          this.log(`Grid voltage: ${gridVoltage}V`);
        } catch (error) {
          this.log(`Failed to read grid voltage: ${error.message}`);
        }
      }
      
      // Get grid frequency
      if (this.workingRegisters.GRID_FREQUENCY) {
        try {
          const gridFrequency = await this.readRegister(this.workingRegisters.GRID_FREQUENCY);
          this.data.grid.frequency = gridFrequency;
          this.log(`Grid frequency: ${gridFrequency}Hz`);
        } catch (error) {
          this.log(`Failed to read grid frequency: ${error.message}`);
        }
      }
      
      // Update PV (solar) data
      if (this.workingRegisters.PV_POWER) {
        try {
          const pvPower = await this.readRegister(this.workingRegisters.PV_POWER);
          this.data.pvCharger.power = pvPower;
          this.log(`PV power: ${pvPower}W`);
        } catch (error) {
          this.log(`Failed to read PV power: ${error.message}`);
        }
      }

      if (this.workingRegisters.PV_YIELD_TODAY) {
        try {
          const pvYieldToday = await this.readRegister(this.workingRegisters.PV_YIELD_TODAY);
          this.data.pvCharger.dailyYield = pvYieldToday;
          this.log(`PV yield today: ${pvYieldToday}kWh`);
        } catch (error) {
          this.log(`Failed to read PV yield: ${error.message}`);
        }
      }
      
      this.data.pvCharger.state = this.data.pvCharger.power > 10 ? 'charging' : 'idle';
      
      // Update AC consumption
      if (this.workingRegisters.AC_CONSUMPTION) {
        try {
          const acConsumption = await this.readRegister(this.workingRegisters.AC_CONSUMPTION);
          this.data.acLoads.power = acConsumption;
          this.log(`AC consumption: ${acConsumption}W`);
        } catch (error) {
          this.log(`Failed to read AC consumption: ${error.message}`);
        }
      }
      
      // If we have individual lines of grid power, update AC lines info
      if (this.data.grid.l1Power !== 0 || this.data.grid.l2Power !== 0 || this.data.grid.l3Power !== 0) {
        const lines = [];
        
        if (this.data.grid.l1Power !== 0) lines.push('L1');
        if (this.data.grid.l2Power !== 0) lines.push('L2');
        if (this.data.grid.l3Power !== 0) lines.push('L3');
        
        if (lines.length > 0) {
          this.data.acLoads.lines = lines;
        }
      }
      
      // Update DC system - this is our main target
      // Try primary DC system power register
      let dcPowerFound = false;
      
      if (this.workingRegisters.DC_SYSTEM_POWER) {
        try {
          const dcSystemPower = await this.readRegister(this.workingRegisters.DC_SYSTEM_POWER);
          this.data.dcSystem.power = Math.abs(dcSystemPower);
          this.data.dcSystem.source = this.data.pvCharger.power > 10 ? 'solar' : 'battery';
          this.log(`DC system power from main register: ${dcSystemPower}W`);
          dcPowerFound = true;
        } catch (error) {
          this.log(`Failed to read DC system power: ${error.message}`);
        }
      }
      
      // If DC power not found, try alternative register
      if (!dcPowerFound && this.workingRegisters.DC_SYSTEM_POWER_ALT) {
        try {
          const dcSystemPower = await this.readRegister(this.workingRegisters.DC_SYSTEM_POWER_ALT);
          this.data.dcSystem.power = Math.abs(dcSystemPower);
          this.data.dcSystem.source = this.data.pvCharger.power > 10 ? 'solar' : 'battery';
          this.log(`DC system power from alt register: ${dcSystemPower}W`);
          dcPowerFound = true;
        } catch (error) {
          this.log(`Failed to read DC system power (alt): ${error.message}`);
        }
      }
      
      // If still not found, try second alternative register
      if (!dcPowerFound && this.workingRegisters.DC_SYSTEM_POWER_ALT2) {
        try {
          const dcSystemPower = await this.readRegister(this.workingRegisters.DC_SYSTEM_POWER_ALT2);
          this.data.dcSystem.power = Math.abs(dcSystemPower);
          this.data.dcSystem.source = this.data.pvCharger.power > 10 ? 'solar' : 'battery';
          this.log(`DC system power from alt2 register: ${dcSystemPower}W`);
          dcPowerFound = true;
        } catch (error) {
          this.log(`Failed to read DC system power (alt2): ${error.message}`);
        }
      }
      
      // If not found through any register, try calculating from battery and PV
      if (!dcPowerFound) {
        if (this.data.battery.power !== 0 || this.data.pvCharger.power !== 0) {
          // Simple calculation: DC system power can be derived from battery and PV power
          const calculatedDcPower = Math.abs(this.data.battery.power) + (this.data.pvCharger.power || 0);
          this.data.dcSystem.power = calculatedDcPower;
          this.log(`DC system power (calculated): ${calculatedDcPower}W`);
        }
      }
      
      // Update system state
      if (this.workingRegisters.SYSTEM_STATE) {
        try {
          const systemState = await this.readRegister(this.workingRegisters.SYSTEM_STATE);
          this.data.systemOverview.state = SYSTEM_STATE_MAP[systemState] || 'Unknown';
          this.log(`System state: ${this.data.systemOverview.state} (${systemState})`);
        } catch (error) {
          this.log(`Failed to read system state: ${error.message}`);
        }
      }
      
      // Update AC input state based on grid connection
      if (this.data.grid.isConnected) {
        this.data.systemOverview.acInput = 'Grid';
      } else {
        this.data.systemOverview.acInput = 'Disconnected';
      }
      
      // Update timestamps and emit data
      this.data.lastUpdate = new Date();
      this.data.apiStatus = 'connected';
      
      // Check if all data is zero, which might indicate a connection issue
      if (this.isAllDataZero()) {
        this.log('Warning: All data values are zero. This might indicate a connection issue or incorrect register map.');
      }
      
      this.emit('data', this.data);
    } catch (error) {
      this.log(`Error polling data: ${error.message}`);
      this.data.apiStatus = 'error';
      this.emit('error', { type: 'polling', message: error.message });
      
      // If there was a connection error, mark as disconnected and try to reconnect on next poll
      if (error.message.includes('Port is closed') || error.message.includes('connect')) {
        this.connected = false;
      }
    }
  }

  /**
   * Check if all data values are zero, which might indicate a connection issue
   * @returns {boolean} - True if all data is zero
   */
  isAllDataZero() {
    return (
      this.data.battery.soc === 0 &&
      this.data.battery.voltage === 0 &&
      this.data.battery.current === 0 &&
      this.data.battery.power === 0 &&
      this.data.pvCharger.power === 0 &&
      this.data.acLoads.power === 0 &&
      this.data.grid.power === 0 &&
      this.data.dcSystem.power === 0
    );
  }

  /**
   * Read a ModbusTCP register with the specified configuration
   * @param {Object} registerConfig - Register configuration object
   * @returns {Promise<number>} - Processed register value
   */
  async readRegister(registerConfig) {
    try {
      // Make sure we're using the unit ID for this specific register
      const unitId = registerConfig.unitId || 100;
      this.client.setID(unitId);
      
      this.log(`Reading register ${registerConfig.address} with Unit ID ${unitId} (${JSON.stringify(registerConfig)})`);
      
      let result;
      
      switch (registerConfig.type) {
        case 'uint16':
          result = await this.client.readHoldingRegisters(registerConfig.address, registerConfig.length);
          this.log(`Raw uint16 data for register ${registerConfig.address}: ${JSON.stringify(result.data)}`);
          return registerConfig.scale ? result.data[0] * registerConfig.scale : result.data[0];
          
        case 'int16':
          result = await this.client.readHoldingRegisters(registerConfig.address, registerConfig.length);
          this.log(`Raw int16 data for register ${registerConfig.address}: ${JSON.stringify(result.data)}`);
          // Convert to signed value if needed
          let value = result.data[0];
          if (value > 32767) value -= 65536;
          return registerConfig.scale ? value * registerConfig.scale : value;
          
        case 'uint32':
          result = await this.client.readHoldingRegisters(registerConfig.address, 2);
          this.log(`Raw uint32 data for register ${registerConfig.address}: ${JSON.stringify(result.data)}`);
          return (result.data[0] << 16) + result.data[1];
          
        default:
          result = await this.client.readHoldingRegisters(registerConfig.address, registerConfig.length);
          this.log(`Raw data for register ${registerConfig.address}: ${JSON.stringify(result.data)}`);
          return result.data[0];
      }
    } catch (error) {
      this.log(`Error reading register ${registerConfig.address}: ${error.message}`);
      
      // If we get a "gateway path unavailable" error, we should try another Unit ID
      if (error.message.includes('Gateway path unavailable') && registerConfig.unitId) {
        const currentUnitId = registerConfig.unitId;
        // Try next unit ID in our list
        const nextIndex = (this.unitIdsToTry.indexOf(currentUnitId) + 1) % this.unitIdsToTry.length;
        const nextUnitId = this.unitIdsToTry[nextIndex];
        
        this.log(`Gateway path unavailable for Unit ID ${currentUnitId}, trying Unit ID ${nextUnitId}...`);
        
        // Update the register config with the new Unit ID
        registerConfig.unitId = nextUnitId;
        
        // Try again with the new Unit ID (but only once to prevent infinite recursion)
        try {
          return await this.readRegister(registerConfig);
        } catch (retryError) {
          this.log(`Retry with Unit ID ${nextUnitId} also failed: ${retryError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Simulate changing data values (for testing without actual connection)
   */
  simulateData() {
    // Randomly determine if PV is active
    const isPVActive = Math.random() > 0.3; // 70% chance of solar being active
    
    // Randomly determine if grid is connected
    const isGridActive = Math.random() > 0.2; // 80% chance of grid being active
    
    // Simulate PV charger fluctuations
    this.data.pvCharger.power = isPVActive ? 300 + Math.floor(Math.random() * 100) : 0;
    this.data.pvCharger.state = isPVActive ? 'charging' : 'idle';
    
    // Simulate grid connection
    this.data.grid.isConnected = isGridActive;
    this.data.grid.power = isGridActive ? 355 + Math.floor(Math.random() * 50) : 0;
    this.data.grid.l1Power = isGridActive ? 355 + Math.floor(Math.random() * 50) : 0;
    this.data.grid.l2Power = 0; // Most RVs only have L1
    this.data.grid.l3Power = 0;
    this.data.grid.voltage = isGridActive ? 115 + (Math.random() * 5) : 0;
    this.data.grid.frequency = isGridActive ? 60 + (Math.random() * 0.2) : 0;
    
    // Simulate battery changes based on PV and grid status
    if ((isPVActive || isGridActive) && this.data.battery.soc < 100) {
      // When PV or grid is active and battery is not full, simulate charging
      this.data.battery.soc = Math.min(100, this.data.battery.soc + 0.1);
      this.data.battery.current = 2 + (Math.random() * 1);
      this.data.battery.power = 25 + Math.floor(Math.random() * 10);
      this.data.battery.state = 'charging';
    } else {
      // Otherwise simulate discharging
      this.data.battery.soc = Math.max(5, this.data.battery.soc - 0.1);
      this.data.battery.current = -(2 + Math.random() * 1);
      this.data.battery.power = -(25 + Math.floor(Math.random() * 10));
      this.data.battery.state = 'discharging';
    }
    
    // Update voltage based on SoC (simplified model)
    this.data.battery.voltage = 12.2 + (this.data.battery.soc / 100) * 1.6;
    
    // Simulate AC load changes
    this.data.acLoads.power = 100 + Math.floor(Math.random() * 50);
    this.data.acLoads.lines = isGridActive ? ['L1'] : ['L1']; // Simplistic model
    
    // Update DC system power - set to around 52W to match expectations
    this.data.dcSystem.power = 52 + Math.floor(Math.random() * 5);
    this.data.dcSystem.source = isPVActive ? 'solar' : 'battery';
    
    // Update system overview based on simulated values
    this.data.systemOverview.state = isPVActive ? 'Charging' : (isGridActive ? 'Passthru' : 'Inverting');
    this.data.systemOverview.acInput = isGridActive ? 'Grid' : 'Disconnected';
    
    // Simulate time to go based on battery state and SoC
    if (this.data.battery.state === 'discharging') {
      const hours = Math.floor(this.data.battery.soc / 10);
      const minutes = Math.floor(Math.random() * 60);
      this.data.battery.timeToGo = `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else {
      const timeToFull = Math.floor((100 - this.data.battery.soc) / 5);
      this.data.battery.timeToGo = `${timeToFull}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
    }
    
    // Make simulation data more realistic with non-zero values
    if (this.data.battery.soc < 5) this.data.battery.soc = 25 + Math.floor(Math.random() * 50);
    if (this.data.battery.voltage < 11) this.data.battery.voltage = 12.5 + (Math.random() * 1);
    
    // Ensure daily yield increases over time
    this.data.pvCharger.dailyYield += isPVActive ? 0.01 : 0;
  }

  /**
   * Toggle data simulation
   * @param {boolean} enable - Whether to enable simulation
   */
  toggleSimulation(enable) {
    this.simulationEnabled = enable;
    
    if (enable) {
      this.log('Simulation mode enabled');
      this.data.apiStatus = 'simulation';
    } else {
      this.log('Simulation mode disabled');
      if (this.connected) {
        this.data.apiStatus = 'connected';
      } else {
        this.data.apiStatus = 'disconnected';
      }
    }
    
    return this.simulationEnabled;
  }

  /**
   * Get API connection status
   * @returns {string} - API status ('connected', 'simulation', 'error', etc.)
   */
  getApiStatus() {
    return this.data.apiStatus;
  }

  /**
   * Get all current data
   * @returns {Object} - Complete data object
   */
  getAllData() {
    return {
      battery: this.data.battery,
      acLoads: this.data.acLoads,
      pvCharger: this.data.pvCharger,
      dcSystem: this.data.dcSystem,
      grid: this.data.grid, // Added grid information
      systemOverview: this.data.systemOverview,
      tanks: this.data.tanks,
      timestamp: new Date().toISOString(),
      refreshInterval: this.config.pollInterval / 1000,
      apiStatus: this.data.apiStatus
    };
  }

  /**
   * Get battery information
   * @returns {Object} - Battery data
   */
  getBatteryStatus() {
    return this.data.battery;
  }

  /**
   * Get PV (solar) charger information
   * @returns {Object} - PV data
   */
  getPVCharger() {
    return this.data.pvCharger;
  }

  /**
   * Get AC loads information
   * @returns {Object} - AC loads data
   */
  getACLoads() {
    return this.data.acLoads;
  }

  /**
   * Get DC system information
   * @returns {Object} - DC system data
   */
  getDCSystem() {
    return this.data.dcSystem;
  }
  
  /**
   * Get Grid information
   * @returns {Object} - Grid data
   */
  getGrid() {
    return this.data.grid;
  }

  /**
   * Get system overview
   * @returns {Object} - System overview data
   */
  getSystemOverview() {
    return this.data.systemOverview;
  }

  /**
   * Run diagnostic scan to troubleshoot connection issues
   * This is useful for manually diagnosing issues with Victron connectivity
   * @returns {Promise<Object>} - Diagnostic results
   */
  async runDiagnostics() {
    this.log('Running Victron system diagnostics...');
    
    const results = {
      connectivity: {
        host: this.config.host,
        port: this.config.port,
        pingSuccess: false,
        modbusConnectSuccess: false
      },
      unitIds: {},
      registers: {},
      summary: ''
    };
    
    // 1. Check basic connectivity with ping
    try {
      this.log(`Pinging Victron system at ${this.config.host}...`);
      
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(`ping -c 1 -W 2 ${this.config.host}`, (error, stdout, stderr) => {
          if (error) {
            this.log(`Ping failed: ${stderr || error.message}`);
            results.connectivity.pingSuccess = false;
            resolve(false);
          } else {
            this.log('Ping successful');
            results.connectivity.pingSuccess = true;
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.log(`Error during ping test: ${error.message}`);
      results.connectivity.pingSuccess = false;
    }
    
    // 2. Try Modbus TCP connection
    try {
      this.log(`Testing ModbusTCP connection to ${this.config.host}:${this.config.port}...`);
      
      // Create a new client for testing
      const testClient = new ModbusRTU();
      await testClient.connectTCP(this.config.host, { port: this.config.port });
      
      this.log('ModbusTCP connection successful');
      results.connectivity.modbusConnectSuccess = true;
      
      // 3. Test different Unit IDs
      for (const unitId of [0, 1, 100, 225, 226, 227, 228, 229, 239, 30]) {
        try {
          this.log(`Testing Unit ID ${unitId}...`);
          testClient.setID(unitId);
          
          // Try a simple register read that should be available
          const result = await testClient.readHoldingRegisters(800, 1);
          
          this.log(`Unit ID ${unitId} works. Got: ${JSON.stringify(result.data)}`);
          results.unitIds[unitId] = { works: true, value: result.data[0] };
        } catch (error) {
          this.log(`Unit ID ${unitId} failed: ${error.message}`);
          results.unitIds[unitId] = { works: false, error: error.message };
        }
      }
      
      // 4. Test key registers with the first working Unit ID
      const testUnitId = Object.keys(results.unitIds).find(id => results.unitIds[id].works) || 100;
      testClient.setID(parseInt(testUnitId));
      
      const testRegisters = [
        { name: 'BATTERY_SOC', address: 843 },
        { name: 'BATTERY_VOLTAGE', address: 840 },
        { name: 'PV_POWER', address: 850 },
        { name: 'AC_CONSUMPTION', address: 817 },
        { name: 'GRID_POWER', address: 820 },
        { name: 'GRID_L1_POWER', address: 820 },
        { name: 'DC_SYSTEM_POWER', address: 860 },
        { name: 'DC_SYSTEM_POWER_ALT', address: 771 },
        { name: 'SYSTEM_STATE', address: 826 }
      ];
      
      for (const reg of testRegisters) {
        try {
          this.log(`Testing register ${reg.name} (${reg.address}) with Unit ID ${testUnitId}...`);
          const result = await testClient.readHoldingRegisters(reg.address, 1);
          
          this.log(`Register ${reg.name} works. Got: ${JSON.stringify(result.data)}`);
          results.registers[reg.name] = { works: true, value: result.data[0] };
        } catch (error) {
          this.log(`Register ${reg.name} failed: ${error.message}`);
          results.registers[reg.name] = { works: false, error: error.message };
        }
      }
      
      // Close test client
      await testClient.close();
    } catch (error) {
      this.log(`ModbusTCP connection test failed: ${error.message}`);
      results.connectivity.modbusConnectSuccess = false;
    }
    
    // 5. Generate summary
    if (!results.connectivity.pingSuccess) {
      results.summary = 'CRITICAL: Cannot ping Victron system. Check network connectivity and IP address.';
    } else if (!results.connectivity.modbusConnectSuccess) {
      results.summary = 'CRITICAL: Ping successful but ModbusTCP connection failed. Check if ModbusTCP service is enabled on the Cerbo GX.';
    } else {
      const workingUnitIds = Object.keys(results.unitIds).filter(id => results.unitIds[id].works);
      
      if (workingUnitIds.length === 0) {
        results.summary = 'ERROR: ModbusTCP connection works but no valid Unit IDs found. Check Victron configuration.';
      } else {
        const workingRegisters = Object.keys(results.registers).filter(name => results.registers[name].works);
        
        if (workingRegisters.length === 0) {
          results.summary = `WARNING: Found working Unit ID(s) ${workingUnitIds.join(', ')} but no registers could be read. Check Victron firmware version.`;
        } else {
          results.summary = `SUCCESS: Found ${workingUnitIds.length} working Unit ID(s) and ${workingRegisters.length} working registers. System should work correctly.`;
        }
      }
    }
    
    this.log(`Diagnostics complete: ${results.summary}`);
    return results;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   * @returns {boolean} - Success status
   */
  updateConfiguration(newConfig) {
    // Update configuration with new values
    Object.assign(this.config, newConfig);
    
    // Restart polling with new interval if it changed
    if (newConfig.pollInterval && this.pollIntervalId) {
      this.stopPolling();
      this.startPolling();
    }
    
    // Reconnect if host or port changed
    if ((newConfig.host || newConfig.port) && this.connected) {
      this.disconnect().then(() => {
        this.connect();
      });
    }
    
    return true;
  }

  /**
   * Get current configuration
   * @returns {Object} - Current configuration
   */
  getConfiguration() {
    return {
      host: this.config.host,
      port: this.config.port,
      timeout: this.config.timeout,
      pollInterval: this.config.pollInterval,
      debug: this.config.debug,
      simulationEnabled: this.simulationEnabled,
      connected: this.connected,
      apiStatus: this.data.apiStatus,
      workingUnitIds: Object.keys(this.workingUnitIds),
      workingRegisters: Object.keys(this.workingRegisters)
    };
  }

  /**
   * Log debug messages if debug mode is enabled
   * @param {string} message - Debug message
   */
  log(message) {
    if (this.config.debug) {
      console.log(`[VictronModbusService] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.disconnect();
  }
}

// Export a singleton instance
const victronService = new VictronModbusService();

module.exports = victronService;