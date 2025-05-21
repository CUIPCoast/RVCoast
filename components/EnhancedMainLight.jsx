import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { LightControlService } from '../Service/LightControlService';

/**
 * A simplified, more reliable light control component with custom slider
 * Maintains the same toggle button but replaces the React Native Slider
 */
const EnhancedMainLight = ({
  name,
  lightId,
  min = 0,
  max = 100,
  value = 0,
  isOn = false,
  onToggle = () => {},
  onValueChange = () => {},
  supportsDimming = false,
}) => {
   // Component state
   const [localValue, setLocalValue] = useState(isOn ? value : 0);
   const [localIsOn, setLocalIsOn] = useState(isOn);
   const [isLoading, setIsLoading] = useState(false);
   const [isSlidingActive, setIsSlidingActive] = useState(false);
   
   // Track previous values and interaction state
   const lastSentValueRef = useRef(value);
   const sliderWidthRef = useRef(0);
   const debounceTimerRef = useRef(null);
   
   // Update local state when props change (if not currently sliding)
   useEffect(() => {
     if (!isSlidingActive) {
       setLocalIsOn(isOn);
       if (isOn) {
         setLocalValue(value);
         lastSentValueRef.current = value;
       } else {
         setLocalValue(0);
         lastSentValueRef.current = 0;
       }
     }
   }, [isOn, value, isSlidingActive]);
 
   // Handle toggle button press
   const handleToggle = async () => {
     if (isLoading) return;
     
     setIsLoading(true);
     try {
       // Use the toggle command from Firefly protocol
       const result = await LightControlService.toggleLight(lightId);
       
       if (result.success) {
         const newState = !localIsOn;
         setLocalIsOn(newState);
         
         // If turning on, set to previous brightness or default
         if (newState) {
           // Use either previous value or default to 50%
           const newValue = lastSentValueRef.current > 0 ? lastSentValueRef.current : 50;
           setLocalValue(newValue);
           lastSentValueRef.current = newValue;
           
           // Notify parent
           onValueChange(newValue);
           
           // If dimming is supported, also set the brightness
           if (supportsDimming) {
             await LightControlService.setBrightness(lightId, newValue);
           }
         } else {
           // Light turned off
           setLocalValue(0);
           lastSentValueRef.current = 0;
           onValueChange(0);
         }
         
         // Notify parent of toggle
         onToggle(newState);
       }
     } catch (error) {
       console.error(`Failed to toggle ${name}:`, error);
     } finally {
       setIsLoading(false);
     }
   };
 
   // Send brightness update to API
   const sendBrightnessUpdate = async (newValue) => {
     if (!localIsOn || isLoading) return;
     
     setIsLoading(true);
     try {
       console.log(`Setting brightness for ${lightId} to ${Math.round(newValue)}%`);
       const result = await LightControlService.setBrightness(lightId, newValue);
       
       if (result.success) {
         lastSentValueRef.current = newValue;
         onValueChange(newValue);
       }
     } catch (error) {
       console.error(`Failed to set brightness for ${name}:`, error);
       // Revert to last known good value
       setLocalValue(lastSentValueRef.current);
     } finally {
       setIsLoading(false);
     }
   };
 
   // Handle slider track press/move
   const handleSliderPress = (event) => {
     if (!localIsOn || isLoading || !supportsDimming) return;
     
     const { locationX } = event.nativeEvent;
     const sliderWidth = sliderWidthRef.current;
     
     if (sliderWidth <= 0) return;
     
     // Calculate new value based on press position
     const percentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
     
     // Update local state immediately
     setLocalValue(percentage);
     setIsSlidingActive(true);
     
     // Debounce API calls while sliding
     if (debounceTimerRef.current) {
       clearTimeout(debounceTimerRef.current);
     }
     
     debounceTimerRef.current = setTimeout(() => {
       sendBrightnessUpdate(percentage);
       setIsSlidingActive(false);
     }, 200); // 200ms debounce
   };
 
   // Custom brightness steps for quick selection
   const brightnessSteps = [10, 25, 50, 75, 100];
   
   // Calculate Firefly brightness (1-50% scale) from UI value (0-100%)
   const getFireflyBrightness = (uiValue) => {
     return Math.max(1, Math.min(50, Math.round(uiValue / 2)));
   };
 
   return (
     <View style={styles.container}>
       <View style={styles.header}>
         <Text style={styles.name}>{name}</Text>
         <View style={styles.rightContainer}>
           {/* Show brightness percentage for on lights */}
           {localIsOn && supportsDimming && (
             <Text style={styles.valueText}>
               {Math.round(localValue)}%
             </Text>
           )}
           
           {/* Toggle button (same as original) */}
           {isLoading ? (
             <ActivityIndicator size="small" color="#FFB267" style={styles.statusIndicator} />
           ) : (
             <TouchableOpacity 
               style={[
                 styles.statusIndicator, 
                 { backgroundColor: localIsOn ? '#FFB267' : '#666' }
               ]}
               onPress={handleToggle}
             />
           )}
         </View>
       </View>
 
       {/* Custom slider component */}
       <View style={[styles.sliderContainer, !localIsOn && styles.disabledSlider]}>
         {/* Slider track */}
         <View 
           style={styles.sliderTrack}
           onLayout={(event) => {
             sliderWidthRef.current = event.nativeEvent.layout.width;
           }}
         >
           {/* Progress fill */}
           <View 
             style={[
               styles.sliderFill, 
               { 
                 width: `${localValue}%`,
                 backgroundColor: localIsOn ? "#FFB267" : "#666"
               }
             ]} 
           />
           
           {/* Invisible touchable layer */}
           <Pressable
             style={styles.sliderTouchArea}
             onTouchStart={handleSliderPress}
             onTouchMove={handleSliderPress}
             disabled={!localIsOn || isLoading || !supportsDimming}
           />
         </View>
         
         {/* Quick select buttons (only shown when light is on) */}
         {localIsOn && supportsDimming && (
           <View style={styles.quickSelectContainer}>
             {brightnessSteps.map(step => (
               <TouchableOpacity
                 key={step}
                 style={[
                   styles.quickSelectButton,
                   Math.abs(localValue - step) < 5 && styles.quickSelectActive
                 ]}
                 onPress={() => {
                   setLocalValue(step);
                   sendBrightnessUpdate(step);
                 }}
                 disabled={isLoading}
               >
                 <Text style={styles.quickSelectText}>{step}%</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}
       </View>
       
       {/* Show Firefly actual value when sliding */}
       {isSlidingActive && supportsDimming && localIsOn && (
         <Text style={styles.fireflyText}>
           Firefly brightness: {getFireflyBrightness(localValue)}%
         </Text>
       )}
     </View>
   );
 };
 
 const styles = StyleSheet.create({
   container: {
     marginVertical: 10,
     paddingHorizontal: 15,
   },
   header: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 8,
   },
   rightContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   name: {
     fontSize: 14,
     color: '#FFFFFF',
     fontWeight: '500',
   },
   statusIndicator: {
     width: 20,
     height: 20,
     borderRadius: 10,
     marginLeft: 10,
   },
   valueText: {
     color: '#FFB267',
     fontSize: 12,
     fontWeight: '500',
   },
   // Custom slider styles
   sliderContainer: {
     marginVertical: 8,
   },
   sliderTrack: {
     height: 8,
     backgroundColor: '#333',
     borderRadius: 4,
     overflow: 'hidden',
     position: 'relative',
   },
   sliderFill: {
     height: '100%',
     borderRadius: 4,
     position: 'absolute',
     left: 0,
   },
   sliderTouchArea: {
     position: 'absolute',
     width: '100%',
     height: '100%',
     zIndex: 1,
   },
   disabledSlider: {
     opacity: 0.5,
   },
   // Quick select buttons
   quickSelectContainer: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginTop: 8,
   },
   quickSelectButton: {
     paddingVertical: 4,
     paddingHorizontal: 8,
     backgroundColor: '#333',
     borderRadius: 12,
   },
   quickSelectActive: {
     backgroundColor: '#665243',
   },
   quickSelectText: {
     color: '#FFF',
     fontSize: 10,
   },
   fireflyText: {
     color: '#999',
     fontSize: 10,
     textAlign: 'right',
     marginTop: 2,
   }
 });

export default EnhancedMainLight;