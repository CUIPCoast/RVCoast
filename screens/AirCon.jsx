import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Switch, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Color,
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
  isDarkMode
} from "../GlobalStyles";
import { RadialSlider } from 'react-native-radial-slider';
import useScreenSize from "../helper/useScreenSize.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";

const AirCon = ({ onClose }) => {

  const isTablet = useScreenSize();
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerUnit, setTimerUnit] = useState("hours");
  const [timerRunning, setTimerRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [startTime, setStartTime] = useState(null);

  //sets changes between heating and cooling
  const [isCooling, setIsCooling] = useState(true);
  const handleCooling = () => {
    setIsCooling(true);
    AsyncStorage.setItem('isCooling', JSON.stringify(true));
  };

  const handleHeating = () => {
    setIsCooling(false);
    AsyncStorage.setItem('isCooling', JSON.stringify(false));
  };

   // AC SWITCH
  //turn on/off
  // const [ACSwitch, setACSwitch] = useState(true);
  // const toggleAC = async () => {
  //   const newState = !ACSwitch;
  //   setACSwitch(newState);
  //   await AsyncStorage.setItem('ACSwitch', JSON.stringify(newState));
  //   if (!newState && timerRunning) {
  //     stopTimer();
  //   }
  // };
  //remembers state next time page is open
  // useEffect(() => {
  //   const loadACSwitch = async () => {
  //     const savedACSwitch = await AsyncStorage.getItem('ACSwitch');
  //     setACSwitch(savedACSwitch ? JSON.parse(savedACSwitch) : true);
  //   };
  //   loadACSwitch();
  // }, []);

  // RADIAL TEMP CHANGE
  //remembers state from last change
  const [temp, setTemp] = useState(null);
  useEffect(() => {
    const getTemp = async () => {
      const savedTemp = await AsyncStorage.getItem('temperature');
      if (savedTemp) {
        setTemp(parseInt(savedTemp, 10));
      } else {
        setTemp(72);
      }
    };
    getTemp();
  }, []);
 //saves temp from last change 
  useEffect(() => {
    if (temp !== null) {
      AsyncStorage.setItem('temperature', temp.toString());
    }
  }, [temp]);
//set temp
  const handleTempChange = (newTemp) => {
    setTemp(newTemp);
    //this would be sent to the raspberry pi (MQTT?)
    
  };

  // HEATING/COOLING SWITCH
  
//remembers last  setting of heating and cooling.
  useEffect(() => {
    const loadIsCooling = async () => {
      const savedIsCooling = await AsyncStorage.getItem('isCooling');
      setIsCooling(savedIsCooling ? JSON.parse(savedIsCooling) : true);
    };
    loadIsCooling();
  }, []);




//runs conversions for timer to display hours, minutes and seconds
const formatRemainingTime = () => {
  const hours = Math.floor(remainingTime / 3600);
  const minutes = Math.floor((remainingTime % 3600) / 60);
  const seconds = remainingTime % 60;
  return `${hours} hrs ${minutes} min ${seconds} sec`;
};

const [displayTime, setDisplayTime] = useState(formatRemainingTime());

//remembers timer status if window is closed
useEffect(() => {
  const loadTimerState = async () => {
    try {
      const timerData = await AsyncStorage.getItem('timerData');
      if (timerData) {
        const { 
          timerRunning: savedTimerRunning, 
          startTime: savedStartTime, 
          duration: savedDuration,
          timerUnit: savedTimerUnit,
          timerDuration: savedTimerDuration 
        } = JSON.parse(timerData);

        setTimerUnit(savedTimerUnit);
        setTimerDuration(savedTimerDuration);

        if (savedTimerRunning) {
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - savedStartTime) / 1000);
          const remainingSeconds = Math.max(0, savedDuration - elapsedSeconds);

          if (remainingSeconds > 0) {
            setTimerRunning(true);
            setRemainingTime(remainingSeconds);
            setStartTime(savedStartTime);
            setShowTimer(true);
          } else {
            // Timer reached 0 turn off timer, hider counter, turn off ACSwitch
            setTimerRunning(false);
            setRemainingTime(0);
            setShowTimer(false);
            setACSwitch(false);
            await AsyncStorage.setItem('ACSwitch', JSON.stringify(false));
            await AsyncStorage.removeItem('timerData');
          }
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  loadTimerState();
}, []);

useEffect(() => {
  const saveTimerState = async () => {
    if (timerRunning) {
      const timerState = {
        timerRunning,
        startTime,
        duration: remainingTime,
        timerUnit,
        timerDuration
      };
      await AsyncStorage.setItem('timerData', JSON.stringify(timerState));
    } else {
      await AsyncStorage.removeItem('timerData');
    }
  };

  saveTimerState();
}, [timerRunning, startTime, remainingTime, timerUnit, timerDuration]);

//turns off timer and AC switch 
useEffect(() => {
  let interval;
  if (timerRunning && remainingTime > 0) {
    interval = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime <= 1) {
          setTimerRunning(false);
          setACSwitch(false);
          setShowTimer(false);
          AsyncStorage.setItem('ACSwitch', JSON.stringify(false));
          AsyncStorage.removeItem('timerData');
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }

  return () => clearInterval(interval);
}, [timerRunning, remainingTime]);
//updates the count down using hours minutes seconds
useEffect(() => {
  const updateDisplayTime = () => {
    setDisplayTime(formatRemainingTime());
  };

  updateDisplayTime();
}, [remainingTime]);
//begins the timer or restarts it will fail if ACSwitch is already off
const startTimer = () => {
  if (ACSwitch) {
    const duration = timerDuration * getMultiplierForUnit();
    setTimerRunning(true);
    setRemainingTime(duration);
    setStartTime(Date.now());
    setShowTimer(true);
  } else {
    alert('Air Conditioner needs to be turned on first.');
  }
};
//if switch is turned off or reaches 0 stops counting down
const stopTimer = async () => {
  setTimerRunning(false);
  setShowTimer(false);
  await AsyncStorage.removeItem('timerData');
};
//separates hours and minutes from timer
const getMultiplierForUnit = () => {
  if (timerUnit === "hours") {
    return 3600;
  } else if (timerUnit === "minutes") {
    return 60;
  } else {
    return 1;
  }
};

const handleHoursSelection = () => {
  setTimerUnit("hours");
};

const handleMinutesSelection = () => {
  setTimerUnit("minutes");
};

const [isOn, setIsOn] = useState(false);

//if tapping outside of keyboard when setting number of hours/minutes the keyboard is hidden
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  if (isTablet) {
     return (
     <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        
        <View style={tabletStyles.container}>
          
        <View style={tabletStyles.toggleContainer}>
         <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
       </View>
          
   

         <RadialSlider
   value={temp}
  min={60}
  max={85}
  thumbColor={"#FFFFFF"}
        thumbBorderColor={"#848482"}
        sliderTrackColor={"#E5E5E5"}
        linearGradient={[ { offset: '0%', color:'#ffaca6' }, { offset: '100%', color: '#FF8200' }]}
  onChange={handleTempChange}
   subTitle={'Degrees'}
   subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25 }}
   unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5 }}
   valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5}}
   style={{
     backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    
    
   }}
   buttonContainerStyle={{
    color:"FFFFFF",
   }}
  
   leftIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginRight: 10, top:20, height: 40, width: 50, paddingLeft: 4 }}
   rightIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginLeft: 10, top:20, height: 40, width: 50, paddingLeft: 5 }}
  
  
  
  
   isHideTailText={true}
   unit={'°F'}
 />





           <View style={tabletStyles.buttonsContainer}>
             <TouchableOpacity
               style={[tabletStyles.button, isCooling ? tabletStyles.activeButton : null]}
               onPress={handleCooling}
             >
               <Text style={tabletStyles.buttonText}>Cooling</Text>
             </TouchableOpacity>
             <TouchableOpacity
               style={[tabletStyles.button, !isCooling ? tabletStyles.activeButton : null]}
               onPress={handleHeating}
             >
               <Text style={tabletStyles.buttonText}>Heating</Text>
             </TouchableOpacity>
           </View>

           <View style={tabletStyles.timerControls}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            

              
             </View>
             
             {timerRunning && (
               <Text style={tabletStyles.countdownText}>
                 Remaining: {formatRemainingTime()}
              </Text>
            )}
             {showTimer && (
               <Text style={tabletStyles.timerText}>{displayTime}</Text>
             )}
           </View>
        </View>
       </TouchableWithoutFeedback>
     );
   }
 

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>

      <View style={styles.container}>
        {/*Closes the AC Window */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        {/* AC Toggle style */}
        <Text style={styles.label}>Air Conditioning</Text>
        {/* <Switch
          trackColor={{ false: "white", true: "#008ABC" }}
          thumbColor={ACSwitch ? "white" : "white"}
          ios_backgroundColor="#E5E5E5"
          onValueChange={toggleAC}
          value={ACSwitch}
          style={{ marginBottom: 30 }}
        /> */}

        {/* Radial Slider for Temperature Control */}
        <RadialSlider
          value={temp}
          min={60}
          max={85}
          onChange={handleTempChange}
          subTitle={'Degrees'}
          subTitleStyle={{ color: isDarkMode ? 'white' : 'black'}}
          unitStyle={{ color: isDarkMode ? 'white' : 'black' }}
          valueStyle={{ color: isDarkMode ? 'white' : 'black' }}
          style={{ backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
            opacity: 0.85}}
          leftIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginRight: 10, height: 40, width: 50, paddingLeft: 4 }}
          rightIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginLeft: 10, height: 40, width: 50, paddingLeft: 5 }}
          isHideTailText={true}
          unit={'°F'}
        />

        {/* Heating/Cooling Switch Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, isCooling ? styles.activeButton : null]}
            onPress={handleCooling}
          >
            <Text style={styles.buttonText}>Cooling</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !isCooling ? styles.activeButton : null]}
            onPress={handleHeating}
          >
            <Text style={styles.buttonText}>Heating</Text>
          </TouchableOpacity>
        </View>

        {/* Timer Controls */}
        <View style={styles.timerControls}>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            
          </View>
          <View style={styles.timerInputContainer}>
            <TextInput
              style={styles.timerInput}
              value={timerDuration.toString()}
              onChangeText={(text) => setTimerDuration(parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder="Time"
            />
            <View style={styles.timerButtonsContainer}>
              <TouchableOpacity
                style={[styles.timerButton, timerUnit === "hours" ? styles.activeTimerButton : null]}
                onPress={handleHoursSelection}
              >
                <Text style={styles.timerButtonText}>Hours</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ color: "white"}}
                onPress={handleMinutesSelection}
              >
                <Text style={{color: "white", paddingRight: 5, marginTop: 5,
                }}>Minutes</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={startTimer}>
              <Text style={{ color: "white", marginTop: 8,}}>Start</Text>
            </TouchableOpacity>

          </View>
          {timerRunning && (
            <Text style={styles.countdownText}>
              Remaining: {formatRemainingTime()}
            </Text>
          )}
          
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};


const tabletStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    opacity: 0.90
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 445, // Move the toggle switch to 100px from the top
    left: 200, // Move the toggle switch 50px from the left
  },
  closeButton: {
    position: 'absolute',
    top: 3,
    right: 75,
    padding: 10,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    opacity: 0.5,
    height: 25,
    alignItems: 'center',
  },
  closeText: {
    color: 'black',
    fontSize: 10,
    marginTop: -4,
  },
  label: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontWeight: 'bold',
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    margin: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: 'white',
    borderColor: 'black'
  },
  activeButton: {
    backgroundColor: '#FFB267',
  },
  buttonText: {
    fontSize: 16,
  },
  timerControls: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
  },
  timerLabel: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontSize: 16,
    marginBottom: 30,
  },
  timerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 15,
  },
  timerInput: {
    borderWidth: 1,
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    padding: 5,
    fontSize: 18,
    width: 80,
    marginRight: 10,
  },
  startTimerButton: {
    color: '#008ABC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  countdownText: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontSize: 16,
    marginTop: 10,
  },
  timerButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  timerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginHorizontal: 5,
    bottom: 5,
    backgroundcolor:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
  },
  activeTimerButton: {
    backgroundColor: '#FFB267',
  },
  timerButtonText: {
    fontSize: 16,
    color: "#FFF",
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    // opacity: 0.90
  },
  closeButton: {
    position: 'absolute',
    top: 3,
    right: 10,
    padding: 10,
    zIndex: 1,
    borderRadius: 20,
    opacity: 0.5,
    height: 50,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFB267',
    fontSize: 20,
    marginTop: -4,
    fontWeight: "bold",
    // marginBottom:2
  },
  label: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontSize:20,
    fontWeight: 'bold',
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,

    margin: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: 'white',
    borderColor: 'black'
  },
  activeButton: {
    backgroundColor: '#FFB267',
  },
  buttonText: {
    fontSize: 16,
  },
  timerControls: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
  },
  timerLabel: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,

    fontSize: 16,
    marginBottom: 5,
  },
  timerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timerInput: {
    borderWidth: 1,
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,

    // color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,

    padding: 5,

    fontSize: 18,
    width: 80,
    marginRight: 10,
  },
  startTimerButton: {
    color: '#008ABC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  countdownText: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,

    fontSize: 16,
    marginTop: 10,
  },
  timerButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  timerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundcolor:  "white",
    color: "white",

  },
  activeTimerButton: {
    backgroundColor: '#FFB267',
  },
  timerButtonText: {
    fontSize: 16,
  },
});

export default AirCon;