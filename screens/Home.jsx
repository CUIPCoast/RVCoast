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
  Animated,
  ScrollView,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useTemperature from "../hooks/useTemperature";
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

const ACCENT = '#FFB267';

// Vector icon for an OpenWeather condition (`weather[0].main`).
const weatherIconName = (main = '') => {
  const c = main.toLowerCase();
  if (c.includes('clear')) return 'sunny';
  if (c.includes('thunder')) return 'thunderstorm';
  if (c.includes('drizzle') || c.includes('rain')) return 'rainy';
  if (c.includes('snow')) return 'snow';
  if (c.includes('cloud')) return 'cloudy';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return 'cloudy-outline';
  return 'partly-sunny';
};

const Home = () => {
  const [showAirCon, setShowAirCon] = useState(false);
  const isTablet = useScreenSize();
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [isEnergyMode, setIsEnergyMode] = useState(false);
  const [humidity, setHumidity] = useState(null); // outdoor, from the forecast
  const [weatherError, setWeatherError] = useState(false);
  // Indoor reading from the thermostat sensor (same source as the tablet Ambient card)
  const indoor = useTemperature({ autoStart: true });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentWeather, setCurrentWeather] = useState({ temp: 73, condition: 'Sunny' });

  // Get RV state
  const { climate } = useRVClimate();
  const { water } = useRVWater();

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
            // API returns Kelvin; formatWeatherItem converts to °F
            temp: Number(formatWeatherItem(current).tempF),
            condition: current.weather[0].main,
          });
          if (current.main?.humidity != null) setHumidity(current.main.humidity);
        }
        setWeatherError(false);
      } catch (error) {
        console.error("Error fetching weather data:", error);
        // Set fallback data
        setHourlyWeather([]);
        setWeatherCondition('partly cloudy');
        setWeatherError(true);
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

  // ——— Mobile ———
  const indoorTemp = indoor.error || !indoor.temperature?.value
    ? null
    : Math.round(indoor.temperature.value);
  const setpoint = climate?.temperature != null ? Math.round(climate.temperature) : null;
  const climateMode = climate?.coolingOn
    ? 'Cooling'
    : climate?.toeKickOn
      ? 'Toe kick heating'
      : climate?.heatingOn
        ? 'Furnace on'
        : 'System off';
  const climateActive = !!(climate?.coolingOn || climate?.toeKickOn || climate?.heatingOn);

  const systems = [
    {
      key: 'climate',
      label: climate?.toeKickOn ? 'Heater' : 'Climate',
      icon: climate?.toeKickOn ? 'radiator' : 'air-conditioner',
      on: climateActive,
    },
    { key: 'pump', label: 'Pump', icon: 'water-pump', on: !!water?.pumpOn },
    { key: 'heater', label: 'W. Heater', icon: 'water-boiler', on: !!water?.heaterOn },
    { key: 'energy', label: 'Energy', icon: 'lightning-bolt', on: isEnergyMode },
  ];

  const now = hourlyWeather[0] ? formatWeatherItem(hourlyWeather[0]) : null;

  return (
    <SafeAreaView style={m.root}>
      <StatusBar barStyle="light-content" backgroundColor="#211D1D" />
      <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={require("../assets/homeImage.png")}
          style={m.hero}
          imageStyle={m.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(14, 12, 12, 0.15)', 'rgba(14, 12, 12, 0.55)', 'rgba(33, 29, 29, 0.95)']}
            style={m.heroShade}
          >
            <View style={m.heroTop}>
              <Text style={m.date}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {now && (
                <View style={m.weatherChip} accessible accessibilityLabel={`Outside ${now.tempF} degrees, ${now.condition}`}>
                  <Ionicons name={weatherIconName(hourlyWeather[0].weather[0].main)} size={16} color={ACCENT} />
                  <Text style={m.weatherChipText}>{now.tempF}°</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={m.greeting}>{getGreeting()}</Text>
              <Text style={m.time}>
                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* RV systems */}
        <Text style={m.sectionTitle}>RV Systems</Text>
        <View style={m.systemsRow}>
          {systems.map((s) => (
            <View
              key={s.key}
              style={[m.systemChip, s.on && m.systemChipOn]}
              accessible
              accessibilityLabel={`${s.label} ${s.on ? 'on' : 'off'}`}
            >
              <View style={[m.systemIcon, s.on && m.systemIconOn]}>
                <MaterialCommunityIcons name={s.icon} size={20} color={s.on ? '#1B1B1B' : '#9E9696'} />
              </View>
              <Text style={m.systemLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={[m.systemState, s.on && { color: ACCENT }]}>{s.on ? 'On' : 'Off'}</Text>
            </View>
          ))}
        </View>

        {/* Climate */}
        <View style={m.card}>
          <View style={m.cardHeader}>
            <View style={m.cardIcon}>
              <MaterialCommunityIcons name="thermostat" size={20} color={ACCENT} />
            </View>
            <Text style={m.cardTitle}>Climate</Text>
            <View style={[m.modePill, climateActive && m.modePillOn]}>
              <Text style={[m.modePillText, climateActive && { color: '#1B1B1B' }]}>{climateMode}</Text>
            </View>
          </View>

          <View style={m.climateRow}>
            <View style={m.climateStat}>
              <Text style={m.statLabel}>Inside</Text>
              <Text style={m.statValue}>{indoorTemp != null ? `${indoorTemp}°` : '--'}</Text>
            </View>
            <View style={m.statDivider} />
            <View style={m.climateStat}>
              <Text style={m.statLabel}>Set to</Text>
              <Text style={[m.statValue, { color: ACCENT }]}>{setpoint != null ? `${setpoint}°` : '--'}</Text>
            </View>
            <View style={m.statDivider} />
            <View style={m.climateStat}>
              <Text style={m.statLabel}>Humidity</Text>
              <Text style={m.statValue}>{humidity != null ? `${humidity}%` : '--'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={m.primaryButton}
            onPress={() => setShowAirCon(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Adjust climate"
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color="#1B1B1B" />
            <Text style={m.primaryButtonText}>Adjust Climate</Text>
          </TouchableOpacity>
        </View>

        {/* Energy mode */}
        <View style={[m.card, m.energyCard]}>
          <View style={[m.cardIcon, isEnergyMode && m.cardIconOn]}>
            <MaterialCommunityIcons name="leaf" size={20} color={isEnergyMode ? '#1B1B1B' : ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={m.cardTitle}>Energy Mode</Text>
            <Text style={m.cardSub}>{isEnergyMode ? 'Saving power where possible' : 'Off'}</Text>
          </View>
          <ToggleSwitch isOn={isEnergyMode} setIsOn={setIsEnergyMode} />
        </View>

        {/* Forecast */}
        <Text style={m.sectionTitle}>Hourly Forecast</Text>
        {hourlyWeather.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.forecastRow}>
            {hourlyWeather.map((item, i) => {
              const { hour, tempF, condition } = formatWeatherItem(item);
              return (
                <View
                  key={item.dt ?? i}
                  style={[m.forecastCard, i === 0 && m.forecastCardNow]}
                  accessible
                  accessibilityLabel={`${hour}, ${tempF} degrees, ${condition}`}
                >
                  <Text style={[m.forecastHour, i === 0 && { color: ACCENT }]}>{i === 0 ? 'Next' : hour}</Text>
                  <Ionicons name={weatherIconName(item.weather[0].main)} size={26} color={i === 0 ? ACCENT : '#C9C1C1'} />
                  <Text style={m.forecastTemp}>{tempF}°</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={m.forecastEmpty}>
            <Ionicons name="cloud-offline-outline" size={20} color="#6B6363" />
            <Text style={m.forecastEmptyText}>{weatherError ? 'Forecast unavailable' : 'Loading forecast…'}</Text>
          </View>
        )}
      </ScrollView>

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
  airConOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  airConContainer: {
    width: width * 0.92,
    maxWidth: 420,
    height: height * 0.82,
    maxHeight: 680,
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

// Mobile home styles (dark brown surfaces, sandy-orange accent)
const m = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#211D1D',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120, // clear the floating tab bar
  },
  hero: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  heroImage: {
    borderRadius: 24,
  },
  heroShade: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 27, 27, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  weatherChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: FontFamily.latoBold,
  },
  time: {
    color: ACCENT,
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
    marginBottom: 12,
  },
  systemsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  systemChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  systemChipOn: {
    backgroundColor: 'rgba(255, 178, 103, 0.1)',
    borderColor: 'rgba(255, 178, 103, 0.5)',
  },
  systemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemIconOn: {
    backgroundColor: ACCENT,
  },
  systemLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    marginTop: 8,
  },
  systemState: {
    color: '#9E9696',
    fontSize: 11,
    fontFamily: FontFamily.latoRegular,
    marginTop: 1,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconOn: {
    backgroundColor: ACCENT,
  },
  cardTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
  },
  cardSub: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#2A2626',
  },
  modePillOn: {
    backgroundColor: ACCENT,
  },
  modePillText: {
    color: '#C9C1C1',
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
  climateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  climateStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: FontFamily.latoBold,
    marginTop: 2,
  },
  primaryButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#1B1B1B',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    marginLeft: 8,
  },
  energyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  forecastRow: {
    gap: 10,
    paddingRight: 4,
  },
  forecastCard: {
    width: 76,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  forecastCardNow: {
    borderColor: 'rgba(255, 178, 103, 0.5)',
    backgroundColor: 'rgba(255, 178, 103, 0.08)',
  },
  forecastHour: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    marginBottom: 8,
  },
  forecastTemp: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    marginTop: 8,
  },
  forecastEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 18,
    backgroundColor: '#1B1B1B',
  },
  forecastEmptyText: {
    color: '#9E9696',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default Home;