// Central export file for all helper functions
// This allows for clean imports like: import { getWeatherIcon, formatGridPower } from '../helper'

// Weather helpers
export {
  getWeatherIcon,
  fetchHourlyWeather,
  formatWeatherItem
} from './weather/weatherHelpers.js';

// Climate control helpers
export {
  handleCoolingToggle,
  handleToeKickToggle,
  handleTemperatureChange,
  setLowFanSpeed,
  setAutoMode
} from './rvControl/climateHelpers.js';

// Light control helpers
export {
  handleAllLightsOn,
  handleAllLightsOff,
  getLightDisplayName,
  getLightGroups
} from './rvControl/lightHelpers.js';

// Data formatting helpers
export {
  formatGridPower,
  getBatterySOC,
  getBatteryPower,
  getBatteryVoltage,
  getBatteryCurrent,
  getSystemStatus,
  formatTemperature,
  formatPower,
  formatEnergy,
  formatPercentage,
  formatVoltage,
  formatCurrent,
  formatFrequency
} from './dataProcessing/formatters.js';

// UI helpers
export {
  showStatusMessage,
  dismissKeyboard,
  toggleState,
  handleSettingsItemPress,
  handleSettingsToggle,
  getImageForLabel,
  debounce,
  throttle,
  safeAsync
} from './ui/uiHelpers.js';

// Screen size helper (existing)
export { default as useScreenSize } from './useScreenSize.jsx';