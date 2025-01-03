// import * as React from "react";
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Dimensions, Image, TouchableOpacity, FlatList } from "react-native";
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

  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet

  const toggleAirCon = () => {
    setShowAirCon(!showAirCon);
  };

  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [isOn, setIsOn] = useState(false);


  const renderWeatherItem = ({ item }) => {
    // Convert Unix timestamp to Date object
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
      if (condition.includes('rain'))  {
        weather = "rainy";
        return '🌧️';
      };
      if (condition.includes('snow')) {
        weather = "snowy";
        return '❄️';
      }
      setWeatherCondition(weather);

      return '🌤️';
      
    };


    if(isTablet){
      return (
        <View className="" >
          <Text style={styles.weatherIconTablet} className="pt-3 w-56">{getWeatherIcon()}
          </Text>

          <View className="bg-zinc-600 after:opacity-80 p-2" style={styles.weatherInfoTablet}>
            <Text className="text-xl text-white font-semibold">{tempF}° F</Text>
            <Text className="text-white w-40 pt-1" >Forecasted to be {weatherCondition}.</Text>
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
        
        // Filter forecast data to only show future times
        const futureForecasts = response.data.list.filter(item => {
          const forecastTime = new Date(item.dt * 1000); // Convert Unix timestamp to milliseconds
          return forecastTime > currentTime;
        });
  
        // Sort forecasts by time to ensure chronological order
        const sortedForecasts = futureForecasts.sort((a, b) => {
          return new Date(a.dt * 1000) - new Date(b.dt * 1000);
        });
        
        // Take only the next 5 forecasts
        if(isTablet){
          setHourlyWeather(sortedForecasts.slice(0, 1));

        }else{
          setHourlyWeather(sortedForecasts.slice(0, 5));

        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };
    fetchHourlyWeather();
  }, []);

 // If the screen is a tablet, render nothing (null) to hide the tab navigator
    if (isTablet) {
    return (
    <View>
        
        <FlatList
          data={hourlyWeather}
          renderItem={renderWeatherItem}
          className="text-white"
        />
    </View>);
  }
  return (
    <View style={[styles.overview, styles.overviewLayout]}>
      <Image
        style={styles.statusbarPosition}
        contentFit="cover"
        source={require("../assets/image-7.png")}
      />
      <View style={[styles.card1, styles.iconPosition]} className="w-44 p-2 rounded-lg">        
        <Image
          style={[styles.humidityIcon, styles.iconLayout]}
          contentFit="cover"
          source={require("../assets/humidity.png")}
        />
        <Text className="text-white text-3xl">36%</Text>
        <Text className="text-white pb-2">
          Humidifier Air
        </Text>
        <View style={styles.lineView} className="py-2"/>

        <View className="flex-row justify-between pb-2">
          <Text className="text-white ">Energy Mode </Text>
          <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
        </View>
      </View>
      <View style={styles.navbar}>
      </View>
      
      <View style={styles.card2} className="w-44 p-2 rounded-lg">
        <Text className="text-white text-3xl pb-2">73°F</Text> 
        <View style={styles.lineView} />
      <View style={styles.btnBg} className="h-10 rounded-xl m-3 items-center">
        <TouchableOpacity onPress={toggleAirCon}>
          <Text className="text-base pt-2 font-medium">Adjust A/C</Text>
        </TouchableOpacity>
      </View>
      </View>
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

      {showAirCon && <AirCon onClose={toggleAirCon} />}

      
     
    </View>
  );
};

const styles = StyleSheet.create({
  overviewLayout: {
    width: "100%",
    overflow: "hidden",
  },
  statusbarPosition: {
    width: 420,
    left: 0,
    position: "absolute",
  },
  iconLayout: {
    height: 24,
    width: 24,
  },
  lightLayout: {
    height: 154,
    width: 350,
  },
  childPosition: {
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver, 
    borderRadius: Border.br_5xl,
    left: 0,
    top: 0,
    position: "absolute",
  },
  // iconPosition: {
  //   display: "none",
  //   position: "absolute",
  // },
  cardLayout: {
    height: 198,
    width: 169,
  },
  mode2Typo: {
    opacity: 0.6,
    fontFamily: FontFamily.manropeRegular,
    letterSpacing: 0.3,
    textAlign: "left",
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    left: 20,
    position: "absolute",
  },
  btnBg: {
    backgroundColor: Color.colorSandybrown,
    // position: "absolute",
  },
  overview1Typo: {
    fontFamily: FontFamily.manropeSemiBold,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "left",
  },
  // image7Icon: {
  //   height: 473,
  //   top: 0,
  // },
  homeIndicator: {
    marginLeft: -67,
    bottom: 8,
    left: "50%",
    backgroundColor: Color.colorWhitesmoke_100,
    width: 134,
    height: 5,
    borderRadius: Border.br_81xl,
    position: "absolute",
  },
  homeindicator: {
    top: 814,
    height: 30,
  },
  homeIcon: {
    overflow: "hidden",
  },
  tabBar: {
    top: 782,
    left: 37,
    gap: Gap.gap_md,
    flexDirection: "row",
    position: "absolute",
  },
  lightChild: {
    height: 154,
    width: 350,
  },
  light: {
    top: 591,
    left: 27,
    position: "absolute",
  },
  card1Child: {
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    left: 0,
    top: 0,
    position: "absolute",
  },
  humidifierAir: {
    top: 68,
  },
  mode2: {
    top: 156,
  },
  humidityIcon: {
    top: 26,
    left: 125,
    position: "absolute",
    overflow: "hidden",
  },
  text: {
    top: 16,
    fontSize: FontSize.size_13xl,
    fontWeight: "500",
    fontFamily: FontFamily.manropeMedium,
    textAlign: "left",
    color: Color.colorWhitesmoke_100,
    left: 20,
    position: "absolute",
  },
  card1Item: {
    top: 152,
    left: 99,
    width: 50,
    height: 26,
    borderRadius: Border.br_81xl,
  },
  ellipseIcon: {
    top: 155,
    left: 126,
    width: 20,
    height: 20,
    position: "absolute",
  },
  lineView: {
    borderStyle: "solid",
    borderColor: Color.colorDarkslategray_200,
    borderTopWidth: 1,
  
  },
  card1: {
    top: 490,
    left: 30,
    backgroundColor: Color.colorGray_100,
  },
  backIcon: {
    left: 0,
    height: 24,
    top: 0,
    position: "absolute",
  },
  overview1: {
    left: 138,
    fontSize: FontSize.size_mid,
    color: Color.colorWhitesmoke_100,
    fontFamily: FontFamily.manropeSemiBold,
    fontWeight: "600",
    lineHeight: 24,
    top: 0,
    position: "absolute",
  },
  bellIcon: {
    left: 326,
    top: 0,
    position: "absolute",
    overflow: "hidden",
  },
  navbar: {
    top: 60,
    left: 20,
    width: 350,
    height: 24,
    position: "absolute",
  },
  notchIcon: {
    top: -2,
    right: 86,
    bottom: 16,
    left: 85,
    maxWidth: "100%",
    maxHeight: "100%",
    overflow: "hidden",
  },
  batteryIcon: {
    right: 0,
    height: 11,
    width: 24,
    top: 0,
    position: "absolute",
  },
  wifiIcon: {
    width: 15,
    height: 11,
  },
  mobileSignalIcon: {
    width: 17,
    height: 11,
  },
  recordingIndicatorIcon: {
    top: -9,
    right: 56,
    width: 6,
    height: 6,
  },
  rightSide: {
    top: 17,
    right: 15,
    width: 67,
    height: 11,
    position: "absolute",
  },
  leftSideIcon: {
    top: 12,
    left: 21,
    width: 54,
    height: 21,
    position: "absolute",
  },
  iphoneXOrNewer: {
    height: "100%",
    top: "0%",
    right: "0%",
    bottom: "0%",
    left: "0%",
    position: "absolute",
    overflow: "hidden",
  },
  statusbar: {
    height: 44,
    top: 0,
  },
  card2: {
    top: 366,
    left: 220,
    backgroundColor: Color.colorGray_100,
  },
  adjustTemp: {
    color: Color.colorGray_200,
    fontFamily: FontFamily.manropeSemiBold,
    fontWeight: "600",
    lineHeight: 24,
    fontSize: FontSize.textXSM_size,
  },
  btn: {
    top: 519,
    left: 245,
    borderRadius: Border.br_base,
    width: 118,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    padding: Padding.p_5xs,
    flexDirection: "row",
  },

  weatherContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    marginHorizontal: 20,
    padding: 15,
  },
  weatherTitle: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.size_mid,
    fontFamily: FontFamily.manropeSemiBold,
    marginBottom: 10,
    paddingLeft: 10,
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
  weatherIconTablet: {
    fontSize: 65,
    position: 'relative',
    right: 0,
    top: -20,
    
  },
  weatherInfoTablet: {
    position: 'relative',
    right: -50,
    top: -60,
    // backgroundColor: "#D3D3D3",
    borderRadius: 10,
    alignItems: "center",
    padding: 5,
    // opacity: 0.4,
    fontWeight: 'bold',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    justifyContent: 'center',
    width: 170,

    // minWidth: 100

  },
  weatherTemp: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeSemiBold,
    marginTop: 5,
  },
  weatherList: {
    paddingVertical: 5,
  },

  overviewChild: {
    top: -3028,
    left: -738,
    width: 2049,
    height: 3707,
    position: "absolute",
  },
  overviewItem: {
    top: -3229,
    left: -710,
    width: 2030,
    height: 3895,
    position: "absolute",
  },
  overview: {
    
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    flex: 1,
    height: 844,
    overflow: "hidden",
  },

});
export default Home;
