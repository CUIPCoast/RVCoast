import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { FontFamily } from "../GlobalStyles";
const SystemCharts = () => {
  const { width } = useWindowDimensions(); // matches OverviewPage width

  return (
    <View style={[styles.tabletContainer, { width }]}>
      <Text style={styles.title}>System Charts</Text>
        <View style={[styles.chartBox]}>


        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartBox: {
  
    width:500,
    height:300,
    marginTop: 16,
    backgroundColor: '#333',
    borderRadius: 15,
  }

});

export default SystemCharts;
