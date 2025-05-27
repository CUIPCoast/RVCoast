// EnhancedMainLight.jsx - Fixed with proper RV State Management Integration
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { LightControlService } from '../Service/LightControlService';
import rvStateManager from '../API/RVStateManager/RVStateManager';

/**
 * Enhanced light control component with full state management integration
 * Ensures all lights work correctly with the master light control
 */
const EnhancedMainLight = ({
  name,
  lightId,
  min = 0,
  max = 100,
  value = 100, // Changed default to 100%
  isOn = false,
  onToggle = () => {},
  onValueChange = () => {},
  supportsDimming = false,
}) => {
   // Component state - always start at 100% when turning on
   const [localValue, setLocalValue] = useState(isOn ? 100 : 0);
   const [localIsOn, setLocalIsOn] = useState(isOn);
   const [isLoading, setIsLoading] = useState(false);
   const [isSlidingActive, setIsSlidingActive] = useState(false);
   
   // Track previous values and interaction state
   const lastSentValueRef = useRef(100); // Default to 100%
   const sliderWidthRef = useRef(0);
   const debounceTimerRef = useRef(null);
   
   // State management integration
   const [lightState, setLightState] = useState({
     isOn: false,
     brightness: 100, // Default to 100%
     lastUpdated: null
   });

   // Initialize light state in RV state manager
   useEffect(() => {
     const currentLights = rvStateManager.getCategoryState('lights');
     
     if (!currentLights[lightId]) {
       // Initialize this light in the state manager at 100%
       console.log(`EnhancedMainLight: Initializing ${lightId} in state manager`);
       rvStateManager.updateLightState(lightId, isOn, 100);
     } else {
       // Use existing state
       const existingState = currentLights[lightId];
       setLightState(existingState);
       setLocalIsOn(existingState.isOn);
       setLocalValue(existingState.isOn ? 100 : 0); // Always show 100% when on
       lastSentValueRef.current = 100;
       
       console.log(`EnhancedMainLight: ${lightId} loaded from state:`, existingState);
     }
   }, [lightId]);

   // Subscribe to RV state changes
   useEffect(() => {
     const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
       if (category === 'lights' && state.lights[lightId]) {
         const updatedLightState = state.lights[lightId];
         
         console.log(`EnhancedMainLight: ${lightId} state updated:`, updatedLightState);
         
         setLightState(updatedLightState);
         
         // Only update local state if not currently interacting
         if (!isSlidingActive && !isLoading) {
           setLocalIsOn(updatedLightState.isOn);
           setLocalValue(updatedLightState.isOn ? 100 : 0); // Always show 100% when on
           lastSentValueRef.current = 100;
           
           // Notify parent component
           onToggle(updatedLightState.isOn);
           onValueChange(100);
         }
       }
     });

     return unsubscribe;
   }, [lightId, isSlidingActive, isLoading]);

   // Listen for external state changes (from other devices or CAN bus)
   useEffect(() => {
     const unsubscribeExternal = rvStateManager.subscribeToExternalChanges((state) => {
       if (state.lights && state.lights[lightId]) {
         console.log(`EnhancedMainLight: External state change for ${lightId}`);
         const updatedLightState = state.lights[lightId];
         
         // Stop any current local interaction
         if (isSlidingActive) {
           setIsSlidingActive(false);
           if (debounceTimerRef.current) {
             clearTimeout(debounceTimerRef.current);
           }
         }
         
         // Update to external state
         setLightState(updatedLightState);
         setLocalIsOn(updatedLightState.isOn);
         setLocalValue(updatedLightState.isOn ? 100 : 0); // Always show 100% when on
         lastSentValueRef.current = 100;
         
         // Notify parent
         onToggle(updatedLightState.isOn);
         onValueChange(100);
       }
     });

     return unsubscribeExternal;
   }, [lightId, isSlidingActive]);
   
   // Update local state when props change (if not currently sliding)
   useEffect(() => {
     if (!isSlidingActive) {
       setLocalIsOn(isOn);
       setLocalValue(isOn ? 100 : 0); // Always 100% when on
       lastSentValueRef.current = 100;
     }
   }, [isOn, isSlidingActive]);
 
   // Handle toggle button press
   const handleToggle = async () => {
     if (isLoading) return;
     
     setIsLoading(true);
     console.log(`EnhancedMainLight: Toggling ${lightId} from ${localIsOn} to ${!localIsOn}`);
     
     try {
       const newState = !localIsOn;
       
       // Update state manager immediately for responsive UI - always 100% when turning on
       const newBrightness = newState ? 100 : 0;
       rvStateManager.updateLightState(lightId, newState, newBrightness);
       
       // Update local state
       setLocalIsOn(newState);
       setLocalValue(newBrightness);
       lastSentValueRef.current = 100;
       
       // Use the toggle command from Firefly protocol
       const result = await LightControlService.toggleLight(lightId);
       
       if (result.success) {
         console.log(`EnhancedMainLight: Successfully toggled ${lightId}`);
         
         // If dimming is supported and light was turned on, set to 100%
         if (newState && supportsDimming) {
           await LightControlService.setBrightness(lightId, 100);
         }
         
         // Notify parent
         onToggle(newState);
         onValueChange(newState ? 100 : 0);
       } else {
         console.error(`EnhancedMainLight: Failed to toggle ${lightId}:`, result);
         // Revert state on failure
         rvStateManager.updateLightState(lightId, !newState, 0);
         setLocalIsOn(!newState);
         setLocalValue(0);
       }
     } catch (error) {
       console.error(`EnhancedMainLight: Failed to toggle ${name}:`, error);
       
       // Revert state on error
       setLocalIsOn(!localIsOn);
       setLocalValue(!localIsOn ? 100 : 0);
       rvStateManager.updateLightState(lightId, !localIsOn, !localIsOn ? 100 : 0);
     } finally {
       setIsLoading(false);
     }
   };
 
   // Send brightness update to API
   const sendBrightnessUpdate = async (newValue) => {
     if (!localIsOn || isLoading) return;
     
     setIsLoading(true);
     try {
       console.log(`EnhancedMainLight: Setting brightness for ${lightId} to ${Math.round(newValue)}%`);
       
       // Update state manager immediately
       rvStateManager.updateLightState(lightId, true, newValue);
       
       const result = await LightControlService.setBrightness(lightId, newValue);
       
       if (result.success) {
         lastSentValueRef.current = newValue;
         onValueChange(newValue);
         console.log(`EnhancedMainLight: Successfully set brightness for ${lightId} to ${newValue}%`);
       } else {
         console.error(`EnhancedMainLight: Failed to set brightness for ${lightId}:`, result);
         // Revert to last known good value on failure
         rvStateManager.updateLightState(lightId, true, lastSentValueRef.current);
         setLocalValue(lastSentValueRef.current);
       }
     } catch (error) {
       console.error(`EnhancedMainLight: Failed to set brightness for ${name}:`, error);
       
       // Revert to last known good value
       rvStateManager.updateLightState(lightId, true, lastSentValueRef.current);
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
     
     // Update state manager with temporary value
     rvStateManager.updateLightState(lightId, true, percentage);
     
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

   // Handle quick select button press
   const handleQuickSelect = async (step) => {
     if (isLoading) return;
     
     console.log(`EnhancedMainLight: Quick select ${step}% for ${lightId}`);
     setLocalValue(step);
     rvStateManager.updateLightState(lightId, true, step);
     await sendBrightnessUpdate(step);
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
           
           {/* Toggle button */}
           {isLoading ? (
             <ActivityIndicator size="small" color="#FFB267" style={styles.statusIndicator} />
           ) : (
             <TouchableOpacity 
               style={[
                 styles.statusIndicator, 
                 { 
                   backgroundColor: localIsOn ? '#FFB267' : '#666',
                   borderWidth: localIsOn ? 2 : 0,
                   borderColor: '#FFF'
                 }
               ]}
               onPress={handleToggle}
             />
           )}
         </View>
       </View>
 
       {/* Custom slider component - only show if dimming is supported */}
       {supportsDimming && (
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
           {localIsOn && (
             <View style={styles.quickSelectContainer}>
               {brightnessSteps.map(step => (
                 <TouchableOpacity
                   key={step}
                   style={[
                     styles.quickSelectButton,
                     Math.abs(localValue - step) < 5 && styles.quickSelectActive
                   ]}
                   onPress={() => handleQuickSelect(step)}
                   disabled={isLoading}
                 >
                   <Text style={styles.quickSelectText}>{step}%</Text>
                 </TouchableOpacity>
               ))}
             </View>
           )}
         </View>
       )}
       
       {/* Show sync status */}
       {isSlidingActive && (
         <Text style={styles.syncText}>Syncing...</Text>
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
     marginRight: 5,
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
   syncText: {
     color: '#FFB267',
     fontSize: 9,
     textAlign: 'center',
     fontStyle: 'italic',
     marginTop: 2,
   }
 });

export default EnhancedMainLight;