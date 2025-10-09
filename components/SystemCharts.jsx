import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

const SystemCharts = () => {
  const { width } = useWindowDimensions(); // matches OverviewPage width

  return (
    <View style={[styles.tabletContainer, { width }]}>
      <Text style={styles.title}>System Charts</Text>
      {/* Add your chart components here */}
    </View>
  );
};

const styles = StyleSheet.create({
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    // Remove offsets so it aligns with OverviewPage
    // top: 20,
    // right: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default SystemCharts;
