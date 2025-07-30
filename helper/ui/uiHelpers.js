// UI and interaction helper functions
import { Keyboard } from 'react-native';

/**
 * Show status message with auto-hide
 * @param {string} message - Message to display
 * @param {function} setMessage - Set message function
 * @param {function} setShow - Set show state function
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export const showStatusMessage = (message, setMessage, setShow, duration = 3000) => {
  setMessage(message);
  setShow(true);
  setTimeout(() => setShow(false), duration);
};

/**
 * Dismiss keyboard
 */
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * Toggle boolean state
 * @param {boolean} currentState - Current state
 * @param {function} setState - Set state function
 * @returns {boolean} - New state
 */
export const toggleState = (currentState, setState) => {
  const newState = !currentState;
  setState(newState);
  return newState;
};

/**
 * Handle setting item press for Settings screen
 * @param {Object} item - Setting item
 * @param {function} showAlert - Alert function (from react-native Alert)
 * @param {Object} router - Router object for navigation
 */
export const handleSettingsItemPress = (item, showAlert, router) => {
  const { key, label } = item;
  
  switch (key) {
    case 'about':
      showAlert('About This App', 'App Version: 1.0.0\n© 2025 Coast\nAll rights reserved.');
      break;
    case 'profile':
      showAlert('Profile', 'This would take you to your profile screen.');
      break;
    case 'changePassword':
      showAlert('Change Password', 'This would take you to the change password screen.');
      break;
    case 'signOut':
      showAlert('Signing Out', 'You have been signed out.');
      break;
    case 'wifiSetup':
      showAlert('Wi-Fi Setup', 'This would take you to a screen for scanning and connecting to Wi-Fi networks.');
      break;
    case 'wifiStatus':
      showAlert('Wi-Fi Status', 'Currently connected to: Home_Network');
      break;
    case 'featureSettings':
      if (router && router.push) {
        router.push('/feature-settings');
      }
      break;
    case 'batteryThresholds':
      showAlert('Battery Thresholds', 'This would open settings for configuring battery alerts.');
      break;
    case 'generatorRules':
      showAlert('Generator Rules', 'This would open auto-start rules for generator settings.');
      break;
    case 'shorePowerPrefs':
      showAlert('Shore Power Preferences', 'This would open shore power preference settings.');
      break;
    case 'solarOptimization':
      showAlert('Solar Optimization', 'This would open solar optimization settings.');
      break;
    case 'displayBrightness':
      showAlert('Display Brightness', 'This would open brightness control settings.');
      break;
    case 'layoutCustomization':
      showAlert('Layout Customization', 'This would open layout customization settings.');
      break;
    case 'widgetConfig':
      showAlert('Widget Configuration', 'This would open widget configuration settings.');
      break;
    default:
      showAlert(label, `This would open ${label} settings.`);
  }
};

/**
 * Handle toggle for Settings screen
 * @param {string} key - Toggle key
 * @param {Object} toggles - Current toggle states
 * @param {function} setToggles - Set toggles function
 * @returns {Object} - New toggle states
 */
export const handleSettingsToggle = (key, toggles, setToggles) => {
  const notificationKeys = ['notifyMessages', 'notifyReminders'];
  if (notificationKeys.includes(key) && !toggles.pushNotifications) {
    return toggles; // Don't allow toggle if push notifications are off
  }
  
  const newToggles = { ...toggles, [key]: !toggles[key] };
  setToggles(newToggles);
  return newToggles;
};

/**
 * Get image for climate control labels
 * @param {string} label - Feature label
 * @returns {any} - Image require statement
 */
export const getImageForLabel = (label) => {
  const images = {
    "Cool": require("../../assets/snowflake.png"),
    "Toe Kick": require("../../assets/toekick.png"),
    "Furnace": require("../../assets/furnace.png"),
  };
  return images[label] || require("../../assets/questionmark.png");
};

/**
 * Create debounced function
 * @param {function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Create throttled function
 * @param {function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Throttled function
 */
export const throttle = (func, delay) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, delay);
    }
  };
};

/**
 * Safe async function wrapper that catches errors
 * @param {function} asyncFunc - Async function to wrap
 * @param {function} onError - Error handler function
 * @returns {function} - Wrapped async function
 */
export const safeAsync = (asyncFunc, onError) => {
  return async (...args) => {
    try {
      return await asyncFunc(...args);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error('Async function error:', error);
      }
      throw error;
    }
  };
};