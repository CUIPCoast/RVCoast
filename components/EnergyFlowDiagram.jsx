import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Circle } from 'react-native-svg';

/**
 * Visual representation of energy flow in the Victron system
 * Similar to what is shown in the third screenshot
 */
const EnergyFlowDiagram = ({ energyData }) => {
  if (!energyData) return null;

  const {
    battery,
    acLoads,
    pvCharger,
    dcSystem,
  } = energyData;

  // Function to determine if a connection is active
  const isActive = (power) => power > 0;

  // Helper to create a formatted power label with the right color
  const powerLabel = (watts) => {
    if (watts === 0) return '--W';
    return `${Math.abs(watts)}W`;
  };

  // Determine if the battery is charging or discharging
  const isBatteryCharging = battery.current > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Energy Flow</Text>
      </View>
      
      <View style={styles.diagramContainer}>
        <Svg height="200" width="100%" viewBox="0 0 300 200">
          {/* PV Charger Box */}
          <Rect 
            x="10" 
            y="10" 
            width="80" 
            height="40" 
            rx="5" 
            ry="5" 
            fill={isActive(pvCharger.power) ? "#4CAF50" : "#333"}
          />
          <SvgText
            x="50"
            y="30"
            textAnchor="middle"
            fill="white"
            fontWeight="bold"
            fontSize="10"
          >
            PV Charger
          </SvgText>
          <SvgText
            x="50"
            y="45"
            textAnchor="middle"
            fill="white"
            fontSize="10"
          >
            {powerLabel(pvCharger.power)}
          </SvgText>

          {/* Inverter Box (Center) */}
          <Rect 
            x="120" 
            y="80" 
            width="60" 
            height="40" 
            rx="5" 
            ry="5" 
            fill="#1976D2"
          />
          <SvgText
            x="150"
            y="100"
            textAnchor="middle"
            fill="white"
            fontWeight="bold"
            fontSize="10"
          >
            Inverting
          </SvgText>
          <SvgText
            x="150"
            y="115"
            textAnchor="middle"
            fill="white"
            fontSize="10"
          >
            {powerLabel(dcSystem.power)}
          </SvgText>

          {/* AC Loads Box */}
          <Rect 
            x="210" 
            y="10" 
            width="80" 
            height="40" 
            rx="5" 
            ry="5" 
            fill={isActive(acLoads.power) ? "#F44336" : "#333"}
          />
          <SvgText
            x="250"
            y="30"
            textAnchor="middle"
            fill="white"
            fontWeight="bold"
            fontSize="10"
          >
            AC Loads
          </SvgText>
          <SvgText
            x="250"
            y="45"
            textAnchor="middle"
            fill="white"
            fontSize="10"
          >
            {powerLabel(acLoads.power)}
          </SvgText>

          {/* Battery Box */}
          <Rect 
            x="120" 
            y="150" 
            width="60" 
            height="40" 
            rx="5" 
            ry="5" 
            fill={isBatteryCharging ? "#4CAF50" : "#FFC107"}
          />
          <SvgText
            x="150"
            y="170"
            textAnchor="middle"
            fill="black"
            fontWeight="bold"
            fontSize="10"
          >
            {battery.soc}%
          </SvgText>
          <SvgText
            x="150"
            y="185"
            textAnchor="middle"
            fill="black"
            fontSize="9"
          >
            {battery.voltage}V {battery.current}A
          </SvgText>

          {/* Connection Lines */}
          {/* PV to Inverter */}
          <Line 
            x1="90" 
            y1="30" 
            x2="120" 
            y2="80" 
            stroke={isActive(pvCharger.power) ? "#4CAF50" : "#666"} 
            strokeWidth="2"
          />
          
          {/* Inverter to AC Loads */}
          <Line 
            x1="180" 
            y1="100" 
            x2="210" 
            y2="30" 
            stroke={isActive(acLoads.power) ? "#F44336" : "#666"} 
            strokeWidth="2"
          />
          
          {/* Battery to Inverter */}
          <Line 
            x1="150" 
            y1="150" 
            x2="150" 
            y2="120" 
            stroke={isBatteryCharging ? "#4CAF50" : "#FFC107"} 
            strokeWidth="2"
          />
          
          {/* Flow direction indicators */}
          <Circle 
            cx={isBatteryCharging ? "145" : "155"} 
            cy="135" 
            r="3" 
            fill={isBatteryCharging ? "#4CAF50" : "#FFC107"}
          />
          
          <Circle 
            cx="110" 
            cy="60" 
            r="3" 
            fill={isActive(pvCharger.power) ? "#4CAF50" : "#666"}
          />
          
          <Circle 
            cx="195" 
            cy="60" 
            r="3" 
            fill={isActive(acLoads.power) ? "#F44336" : "#666"}
          />
        </Svg>
      </View>
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Charging/Input</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Consumption</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
          <Text style={styles.legendText}>Discharging</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  diagramContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#CCC',
    fontSize: 12,
  },
});

export default EnergyFlowDiagram;