import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList } from "react-native";
import {
  Color,
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
  isDarkMode
} from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import AirCon from "./AirCon.jsx";
import axios from "axios";
import ToggleSwitch from "../components/ToggleSwitch.jsx";

const Home = () => {
  const [showAirCon, setShowAirCon] = useState(false);
  const isTablet = useScreenSize();
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [isOn, setIsOn] = useState(false);

  const toggleAirCon = () => {
    setShowAirCon(!showAirCon);
  };

  const renderWeatherItem = ({ item }) => {
    const date = new Date(item.dt * 1000);
    const hour = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const tempF = (((item.main.temp - 273.15) * 9/5) + 32).toFixed(0);
    const desc = item.weather[0].description;

    const getWeatherIcon = () => {
      let weather = "sunny but partially cloudy";
      const condition = item.weather[0].main.toLowerCase();

      if (condition.includes('clear')) {
        weather = "sunny";
        return '☀️';
      }
      if (condition.includes('cloud')) {
        weather = "cloudy";
        return '☁️';
      }
      if (condition.includes('rain')) {
        weather = "rainy";
        return '🌧️';
      }
      if (condition.includes('snow')) {
        weather = "snowy";
        return '❄️';
      }
      setWeatherCondition(weather);
      return '🌤️';
    };

    if (isTablet) {
      return (
        <View>
          <Text style={styles.weatherIconTablet}>{getWeatherIcon()}</Text>
          <View style={styles.weatherInfoTablet}>
            <Text className="text-xl text-white font-semibold">{tempF}° F</Text>
            <Text className="text-white w-40 pt-1">Forecasted to be {weatherCondition}.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.weatherItemContainer}>
        <Text style={styles.weatherHour}>{hour}</Text>
        <Text style={styles.weatherIcon}>{getWeatherIcon()}</Text>
        <Text style={styles.weatherTemp}>{tempF} °F</Text>
      </View>
    );
  };

  useEffect(() => {
    const fetchHourlyWeather = async () => {
      const apiKey = "5819cdd3f2d4610ea874f8bab06d02cb";
      const city = "Chattanooga";
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;
      try {
        const response = await axios.get(url);
        const currentTime = new Date();
        const futureForecasts = response.data.list.filter(item => new Date(item.dt * 1000) > currentTime);
        const sortedForecasts = futureForecasts.sort((a, b) => new Date(a.dt * 1000) - new Date(b.dt * 1000));
        if (isTablet) {
          setHourlyWeather(sortedForecasts.slice(0, 1));
        } else {
          setHourlyWeather(sortedForecasts.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };
    fetchHourlyWeather();
  }, []);

  if (isTablet) {
    return (
      <View>
        <FlatList
          data={hourlyWeather}
          renderItem={renderWeatherItem}
        />
      </View>
    );
  }

  return (
    <View style={styles.overview}>
      <Image
        style={styles.statusbarPosition}
        contentFit="cover"
        source={require("../assets/homeImage.png")}
      />
      <View style={styles.mainContent}>
        <View style={styles.weatherContainer}>
          <Text style={styles.weatherTitle}>Hourly Forecast</Text>
          <FlatList
            data={hourlyWeather}
            renderItem={renderWeatherItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weatherList}
          />
        </View>

        <View style={styles.cardsContainer}>
          <View style={[styles.card1, styles.cardCommon]} className="p-2 rounded-lg">
            <Image
              style={[styles.humidityIcon, styles.iconLayout]}
              contentFit="cover"
              source={require("../assets/humidity.png")}
            />
            <Text className="text-white text-3xl">36%</Text>
            <Text className="text-white pb-2">Humidifier Air</Text>
            <View style={styles.lineView} className="py-2" />
            <View className="flex-row justify-between pb-2">
              <Text className="text-white">Energy Mode</Text>
              <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
            </View>
          </View>

          <View style={[styles.card2, styles.cardCommon]} className="p-2 rounded-lg">
            <Text className="text-white text-3xl pb-2">73°F</Text>
            <View style={styles.lineView} />
            <View style={styles.btnBg} className="h-10 rounded-xl m-3 items-center">
              <TouchableOpacity onPress={toggleAirCon}>
                <Text className="text-base pt-2 font-medium">Adjust A/C</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {showAirCon && (
  <View style={styles.airConOverlay}>
    <AirCon onClose={toggleAirCon} />
  </View>
)}

    </View>
  );
};

const styles = StyleSheet.create({
  overview: {
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    flex: 1,
  },
  statusbarPosition: {
    width: 420,
    left: 0,
    position: "absolute",
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
    gap: 20,
  },
  weatherContainer: {
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    padding: 15,
    marginBottom: 10,
  },
  weatherTitle: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.size_mid,
    fontFamily: FontFamily.manropeSemiBold,
    marginBottom: 10,
  },
  weatherList: {
    paddingVertical: 5,
  },
  weatherItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 15,
    width: 80,
  },
  weatherHour: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
    marginBottom: 5,
  },
  weatherIcon: {
    fontSize: 24,
    marginVertical: 5,
  },
  weatherTemp: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeSemiBold,
    marginTop: 5,
  },
  weatherIconTablet: {
    fontSize: 65,
    position: 'relative',
    top: -20,
  },
  weatherInfoTablet: {
    position: 'relative',
    top: -60,
    borderRadius: 10,
    alignItems: "center",
    padding: 5,
    fontWeight: 'bold',
    justifyContent: 'center',
    width: 170,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardCommon: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    padding: 10,
  },
  card1: {},
  card2: {},
  humidityIcon: {
    marginBottom: 10,
  },
  iconLayout: {
    height: 24,
    width: 24,
    marginBottom: 10,
  },
  lineView: {
    borderStyle: "solid",
    borderColor: Color.colorDarkslategray_200,
    borderTopWidth: 1,
  },
  btnBg: {
    backgroundColor: Color.colorSandybrown,
  },
  airConOverlay: {
    
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    width: 400,
    height:450,
    top:200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  
});



export default Home;
