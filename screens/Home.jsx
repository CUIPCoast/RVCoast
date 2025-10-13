import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  Animated
} from "react-native";
import {
  Color,
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
  isDarkMode
} from "../GlobalStyles";
import { useScreenSize, getWeatherIcon, fetchHourlyWeather, formatWeatherItem } from "../helper";
import AirCon from "./AirCon";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { useRVClimate, useRVWater } from "../API/RVStateManager/RVStateHooks";
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const Home = () => {
  const [showAirCon, setShowAirCon] = useState(false);
  const isTablet = useScreenSize();
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [isEnergyMode, setIsEnergyMode] = useState(false);
  const [currentTemp, setCurrentTemp] = useState(73);
  const [humidity, setHumidity] = useState(36);
  const [buttonScale] = useState(new Animated.Value(1));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentWeather, setCurrentWeather] = useState({ temp: 73, condition: 'Sunny' });

  // Get RV state
  const { climate } = useRVClimate();
  const { water } = useRVWater();

  const animateButtonPress = (callback) => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => callback && callback());
  };

  const toggleAirCon = () => {
    animateButtonPress(() => {
      console.log('Toggle AirCon called, current state:', showAirCon);
      setShowAirCon(!showAirCon);
    });
  };

  const closeAirCon = () => {
    console.log('Closing AirCon modal');
    setShowAirCon(false);
  };

  const renderWeatherItem = ({ item }) => {
    const { hour, weatherIcon, tempF } = formatWeatherItem(item);

    return (
      <View style={styles.weatherItemContainer}>
        <Text style={styles.weatherHour}>{hour}</Text>
        <Text style={styles.weatherIcon}>{weatherIcon}</Text>
        <Text style={styles.weatherTemp}>{tempF}°F</Text>
      </View>
    );
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        const weatherData = await fetchHourlyWeather("Chattanooga", isTablet);
        setHourlyWeather(weatherData);

        // Set weather condition and current temp for the first forecast
        if (weatherData.length > 0) {
          const current = weatherData[0];
          setWeatherCondition(current.weather[0].description);
          setCurrentWeather({
            temp: Math.round(current.main.temp),
            condition: current.weather[0].main,
          });
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        // Set fallback data
        setHourlyWeather([]);
        setWeatherCondition('partly cloudy');
      }
    };

    loadWeatherData();
  }, [isTablet]);

  if (isTablet) {
    return (
      <SafeAreaView style={styles.overview}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"} 
          backgroundColor={isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100}
        />
        <View style={styles.tabletContainer}>
          <FlatList
            data={hourlyWeather}
            renderItem={renderWeatherItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.overview}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100}
      />
      
      {/* Background Image */}
      <View style={styles.imageContainer}>
        <Image
          style={styles.backgroundImage}
          contentFit="cover"
          source={require("../assets/homeImage.png")}
        />

        {/* Overlay Content on Image */}
        <View style={styles.imageOverlay}>
          {/* Top Section - Greeting and Time */}
          <View style={styles.topOverlaySection}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </View>

            
          </View>

          {/* Bottom Section - System Status */}
          <View style={styles.bottomOverlaySection}>
            <Text style={styles.systemStatusTitle}>RV Systems</Text>

            <View style={styles.statusIndicators}>
              {/* Climate Status (AC or Toe Kick) */}
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIconContainer,
                  (climate?.coolingOn || climate?.toeKickOn) ? styles.statusActive : styles.statusInactive
                ]}>
                  <MaterialCommunityIcons
                    name={climate?.toeKickOn ? "radiator" : "air-conditioner"}
                    size={18}
                    color={(climate?.coolingOn || climate?.toeKickOn) ? '#FFB267' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.statusLabel}>
                  {climate?.toeKickOn ? 'Heater' : 'Climate'}
                </Text>
                <View style={[
                  styles.statusDot,
                  (climate?.coolingOn || climate?.toeKickOn) ? styles.dotActive : styles.dotInactive
                ]} />
              </View>

              {/* Water Pump Status */}
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIconContainer,
                  water?.pumpOn ? styles.statusActive : styles.statusInactive
                ]}>
                  <Ionicons
                    name="water"
                    size={18}
                    color={water?.pumpOn ? '#3b82f6' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.statusLabel}>Pump</Text>
                <View style={[
                  styles.statusDot,
                  water?.pumpOn ? styles.dotActive : styles.dotInactive
                ]} />
              </View>

              {/* Water Heater Status */}
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIconContainer,
                  water?.heaterOn ? styles.statusActive : styles.statusInactive
                ]}>
                  <MaterialCommunityIcons
                    name="water-boiler"
                    size={18}
                    color={water?.heaterOn ? '#ef4444' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.statusLabel}>W.Heater</Text>
                <View style={[
                  styles.statusDot,
                  water?.heaterOn ? styles.dotActive : styles.dotInactive
                ]} />
              </View>

              {/* Energy Mode */}
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIconContainer,
                  isEnergyMode ? styles.statusActive : styles.statusInactive
                ]}>
                  <Feather
                    name="zap"
                    size={18}
                    color={isEnergyMode ? '#10b981' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.statusLabel}>Energy</Text>
                <View style={[
                  styles.statusDot,
                  isEnergyMode ? styles.dotActive : styles.dotInactive
                ]} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Weather Forecast Section */}
        <View style={styles.weatherContainer}>
          <Text style={styles.weatherTitle}>Hourly Forecast</Text>

          {hourlyWeather.length > 0 ? (
            <FlatList
              data={hourlyWeather}
              renderItem={renderWeatherItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weatherList}
            />
          ) : (
            <View style={styles.weatherPlaceholder}>
              <Text style={styles.weatherPlaceholderText}>Loading weather...</Text>
            </View>
          )}
        </View>

        {/* Control Cards */}
        <View style={styles.cardsContainer}>
          {/* Humidity/Energy Card */}
          <View style={[styles.cardCommon, styles.humidityCard]}>
            <View style={styles.cardHeader}>
              <Image
                style={styles.humidityIcon}
                contentFit="cover"
                source={require("../assets/humidity.png")}
              />
              <Text style={styles.cardValue}>{humidity}%</Text>
            </View>
            
            <Text style={styles.cardLabel}>Humidity Level</Text>
            
            <View style={styles.dividerLine} />
            
            <View style={styles.energyModeContainer}>
              <Text style={styles.energyModeLabel}>Energy Mode</Text>
              <ToggleSwitch 
                isOn={isEnergyMode} 
                setIsOn={setIsEnergyMode} 
              />
            </View>
          </View>

          {/* Temperature/AC Card */}
          <View style={[styles.cardCommon, styles.temperatureCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardValue}>{currentTemp}°F</Text>
            </View>
            
            <Text style={styles.cardLabel}>Indoor Temperature</Text>
            
            <View style={styles.dividerLine} />
            
            <TouchableOpacity
              onPress={toggleAirCon}
              activeOpacity={0.9}
            >
              <Animated.View
                style={[
                  styles.acControlButton,
                  { transform: [{ scale: buttonScale }] }
                ]}
              >
                <Text style={styles.acButtonText}>Adjust A/C</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Air Con Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAirCon}
        onRequestClose={closeAirCon}
      >
        <View style={styles.airConOverlay}>
          <View style={styles.airConContainer}>
            <AirCon onClose={closeAirCon} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overview: {
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    flex: 1,
  },

  // Phone Layout Styles
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    zIndex: 1,
  },

  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Image Overlay Styles
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)', // Subtle dark overlay for text readability
  },

  topOverlaySection: {
    gap: 16,
  },

  greetingContainer: {
    gap: 4,
  },

  greetingText: {
    fontSize: 32,
    fontFamily: FontFamily.latoBold,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  timeText: {
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  quickWeatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  quickWeatherInfo: {
    gap: 2,
  },

  quickWeatherTemp: {
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  quickWeatherCondition: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },

  bottomOverlaySection: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    bottom:40,
  },

  systemStatusTitle: {
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },

  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  statusActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  statusInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  statusLabel: {
    fontSize: 11,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.2,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  dotActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 2,
  },

  // Weather Section - Modernized
  weatherContainer: {
    backgroundColor: isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    maxHeight: 170,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  weatherTitle: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  weatherList: {
    paddingVertical: 2,
  },

  weatherItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 10,
    backgroundColor: isDarkMode ? 'rgba(50, 50, 50, 0.6)' : 'rgba(245, 245, 245, 0.8)',
    borderRadius: 14,
    minWidth: 68,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },

  weatherHour: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 11,
    fontFamily: FontFamily.latoRegular,
    marginBottom: 4,
    opacity: 0.8,
  },

  weatherIcon: {
    fontSize: 24,
    marginVertical: 6,
  },

  weatherTemp: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    marginTop: 4,
  },

  weatherPlaceholder: {
    padding: 16,
    alignItems: 'center',
  },

  weatherPlaceholderText: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    opacity: 0.5,
  },

  // Control Cards - Modernized
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 14,
  },

  cardCommon: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  humidityIcon: {
    height: 28,
    width: 28,
    marginRight: 10,
    tintColor: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
  },

  cardValue: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 34,
    fontFamily: FontFamily.latoBold,
    letterSpacing: -0.5,
  },

  cardLabel: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginBottom: 14,
    opacity: 0.7,
    letterSpacing: 0.2,
  },

  dividerLine: {
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    marginBottom: 14,
  },

  energyModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  energyModeLabel: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 0.2,
  },

  acControlButton: {
    backgroundColor: Color.colorSandybrown,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Color.colorSandybrown,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  acButtonText: {
    color: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.3,
  },

  // Air Con Modal - Modernized
  airConOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  airConContainer: {
    width: width * 0.92,
    maxWidth: 420,
    height: height * 0.65,
    maxHeight: 520,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
});

export default Home;