// Weather and API related helper functions
import axios from 'axios';

/**
 * Get weather icon based on condition
 * @param {string} condition - Weather condition
 * @returns {string} - Weather emoji
 */
export const getWeatherIcon = (condition) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('clear')) return '☀️';
  if (conditionLower.includes('cloud')) return '☁️';
  if (conditionLower.includes('rain')) return '🌧️';
  if (conditionLower.includes('snow')) return '❄️';
  if (conditionLower.includes('storm')) return '⛈️';
  return '🌤️';
};

/**
 * Fetch hourly weather data
 * @param {string} city - City name
 * @param {boolean} isTablet - Whether device is tablet
 * @returns {Promise<Array>} - Array of weather data
 */
export const fetchHourlyWeather = async (city = "Chattanooga", isTablet = false) => {
  const apiKey = "5819cdd3f2d4610ea874f8bab06d02cb";
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    const currentTime = new Date();
    const futureForecasts = response.data.list.filter(
      item => new Date(item.dt * 1000) > currentTime
    );
    const sortedForecasts = futureForecasts.sort(
      (a, b) => new Date(a.dt * 1000) - new Date(b.dt * 1000)
    );
    
    return sortedForecasts.slice(0, isTablet ? 1 : 5);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
};

/**
 * Format weather item for display
 * @param {Object} item - Weather item from API
 * @returns {Object} - Formatted weather display data
 */
export const formatWeatherItem = (item) => {
  const date = new Date(item.dt * 1000);

  // Convert to Eastern Time (12-hour format)
  const hour = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  const tempF = (((item.main.temp - 273.15) * 9/5) + 32).toFixed(0);
  const weatherIcon = getWeatherIcon(item.weather[0].main);

  return {
    hour,
    weatherIcon,
    tempF,
    condition: item.weather[0].description
  };
};