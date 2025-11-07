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

/**
 * Fetch current weather data
 * @param {string} city - City name
 * @returns {Promise<Object>} - Current weather data
 */
export const fetchCurrentWeather = async (city = "Chattanooga") => {
  const apiKey = "5819cdd3f2d4610ea874f8bab06d02cb";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    // Convert temperature from Kelvin to Fahrenheit
    const tempF = (((data.main.temp - 273.15) * 9/5) + 32).toFixed(0);

    // Convert pressure from hPa to more readable format
    const pressure = data.main.pressure;

    // Get humidity
    const humidity = data.main.humidity;

    // Wind speed (convert from m/s to mph) and direction
    const windSpeedMph = (data.wind.speed * 2.237).toFixed(0);
    const windDeg = data.wind.deg;
    const windDirection = getWindDirection(windDeg);

    return {
      temperature: tempF,
      humidity: humidity,
      pressure: pressure,
      windSpeed: windSpeedMph,
      windDirection: windDirection,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: getWeatherIcon(data.weather[0].main)
    };
  } catch (error) {
    console.error("Error fetching current weather data:", error);
    throw error;
  }
};

/**
 * Convert wind degree to direction
 * @param {number} deg - Wind direction in degrees
 * @returns {string} - Wind direction abbreviation
 */
const getWindDirection = (deg) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
};