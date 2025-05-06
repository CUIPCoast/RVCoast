import React, { useEffect, useState } from 'react';
import Svg, { 
  Rect, 
  LinearGradient, 
  Stop, 
  Path,
  Text as SvgText
} from 'react-native-svg';
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

const BatteryCard = ({ width = 250, height = 150, children }) => {
  // State to track parsed values
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [batteryPower, setBatteryPower] = useState("0W");
  const [isLoading, setIsLoading] = useState(true);
  
  // Parse children when they change
  useEffect(() => {
    let foundLevel = 0;
    let foundPower = "0W";
    let stillLoading = true;
    
    // Parse battery info from children
    const parseChildren = (child) => {
      if (!child) return;
      
      // Handle fragments or arrays of children
      if (child.type === React.Fragment) {
        React.Children.forEach(child.props.children, parseChildren);
        return;
      }
      
      // Parse text content
      if (child.props && child.props.children) {
        const childText = String(child.props.children);
        
        // Look for percentage values
        if (childText.includes('%')) {
          const match = childText.match(/(\d+(?:\.\d+)?)%/);
          if (match && match[1]) {
            foundLevel = parseFloat(match[1]);
            stillLoading = false;
            // Log for debugging
            console.log(`Found battery level: ${foundLevel}%`);
          }
        } 
        
        // Look for power values
        if (childText.includes('W')) {
          foundPower = childText;
          // Log for debugging
          console.log(`Found battery power: ${foundPower}`);
        }
      }
    };
    
    // Start the parsing process
    React.Children.forEach(children, parseChildren);
    
    // Update state with what we found
    setBatteryLevel(foundLevel);
    setBatteryPower(foundPower);
    setIsLoading(stillLoading);
  }, [children]);
  
  // Calculate dynamic values
  const padding = 8;
  const cornerRadius = 16;
  const batteryBody = width - 15; // Account for the cap
  const capWidth = 15;
  const capHeight = height * 0.4;
  const innerPadding = 6;
  
  // Important fix: ensure levelWidth calculation is correct
  const maxFillWidth = batteryBody - (innerPadding * 2) - padding * 1.5;
  const levelWidth = isLoading ? 0 : (maxFillWidth * batteryLevel / 100);
  
  // Determine battery color based on level
  let fillColor = '#4CAF50'; // Green for good battery
  let gradientColors = ['#57c25c', '#2E7D32'];
  
  if (batteryLevel <= 20) {
    fillColor = '#D32F2F'; // Red for low battery (matching your red card)
    gradientColors = ['#FF5252', '#B71C1C'];
  } else if (batteryLevel <= 50) {
    fillColor = '#F57C00'; // Orange for medium battery (matching your orange card)
    gradientColors = ['#FFB74D', '#E65100'];
  }

  // For debugging - log the fill level
  console.log(`Rendering battery at ${batteryLevel}% - levelWidth: ${levelWidth}/${maxFillWidth}`);

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Battery body shell - outer case with gradient */}
        <LinearGradient id="batteryBodyGradient" x1="0" y1="0" x2="0" y2={height}>
          <Stop offset="0" stopColor="#424242" />
          <Stop offset="0.5" stopColor="#303030" />
          <Stop offset="1" stopColor="#212121" />
        </LinearGradient>
        <Rect
          x={padding / 2}
          y={padding / 2}
          width={batteryBody - padding}
          height={height - padding}
          rx={cornerRadius}
          ry={cornerRadius}
          fill="url(#batteryBodyGradient)"
          stroke="#424242"
          strokeWidth="2"
        />
        
        {/* Battery cap */}
        <LinearGradient id="batteryCapGradient" x1="0" y1="0" x2="0" y2={capHeight}>
          <Stop offset="0" stopColor="#424242" />
          <Stop offset="1" stopColor="#212121" />
        </LinearGradient>
        <Rect
          x={batteryBody - padding}
          y={(height - capHeight) / 2}
          width={capWidth}
          height={capHeight}
          rx={4}
          ry={4}
          fill="url(#batteryCapGradient)"
          stroke="#424242"
          strokeWidth="2"
        />
        
        {/* Battery inner area - black background */}
        <Rect
          x={innerPadding + padding}
          y={innerPadding + padding}
          width={batteryBody - (innerPadding * 2) - padding * 1.5}
          height={height - (innerPadding * 2) - padding}
          rx={cornerRadius / 2}
          ry={cornerRadius / 2}
          fill="#121212"
        />
        
        {/* Battery level fill with gradient */}
        {!isLoading && (
          <LinearGradient id="batteryLevelGradient" x1="0" y1="0" x2="0" y2={height}>
            <Stop offset="0" stopColor={gradientColors[0]} />
            <Stop offset="1" stopColor={gradientColors[1]} />
          </LinearGradient>
        )}
        {!isLoading && levelWidth > 0 && (
          <Rect
            x={innerPadding + padding}
            y={innerPadding + padding}
            width={levelWidth}
            height={height - (innerPadding * 2) - padding}
            rx={cornerRadius / 2}
            ry={cornerRadius / 2}
            fill="url(#batteryLevelGradient)"
          />
        )}
        
        {/* Battery percentage display */}
        {!isLoading && (
          <SvgText
            x={width / 2}
            y={height / 2 + 5}
            fontSize="24"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            {`${batteryLevel}%`}
          </SvgText>
        )}
        
        {/* Battery label */}
        <SvgText
          x={width / 2}
          y={25}
          fontSize="16"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
        >
          Battery
        </SvgText>
        
        {/* Highlight effect on top */}
        <Path
          d={`M${padding + 5},${padding + 5} 
              H${batteryBody - padding - 10} 
              C${batteryBody - padding - 5},${padding + 5} 
              ${batteryBody - padding - 5},${padding + 5} 
              ${batteryBody - padding - 5},${padding + 10} 
              V${padding + 15}`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
        />
        
        {/* Battery terminals */}
        <Rect 
          x={width - 22} 
          y={height/2 - 10} 
          width={5} 
          height={20} 
          fill="#111" 
          stroke="#666" 
          strokeWidth="1" 
        />
        <Rect 
          x={width - 24} 
          y={height/2 - 5} 
          width={8} 
          height={10} 
          fill="#333" 
          stroke="#666" 
          strokeWidth="1" 
        />
      </Svg>
      
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 250,
    height: 150,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
  }
});

export default BatteryCard;