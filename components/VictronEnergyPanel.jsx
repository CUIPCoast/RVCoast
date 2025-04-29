import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { VictronEnergyService } from '../API/VictronEnergyService';

/**
 * Component to display Victron Energy data from Cerbo GX
 */
const VictronEnergyPanel = ({ onError, refreshInterval = 10000 }) => {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch energy data
  const fetchEnergyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await VictronEnergyService.getAllData();
      setEnergyData(data);
      setLastUpdated(new Date());
      
      if (onError && error) {
        // Clear any previous error if this call succeeds
        onError(null);
      }
    } catch (err) {
      console.error('Failed to fetch energy data:', err);
      setError('Unable to connect to Victron system');
      if (onError) {
        onError(err.message || 'Failed to connect to Victron system');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount and at the specified interval
  useEffect(() => {
    fetchEnergyData();

    // Set up periodic refresh
    const intervalId = setInterval(fetchEnergyData, refreshInterval);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEnergyData();
  };

  // Helper to determine battery color based on state of charge
  const getBatteryColor = (soc) => {
    if (soc >= 80) return '#4CAF50'; // Green
    if (soc >= 50) return '#FFC107'; // Yellow/Amber
    if (soc >= 20) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  // Helper to format power values
  const formatPower = (watts) => {
    return `${Math.abs(watts)}W${watts < 0 ? ' (from battery)' : ''}`;
  };

  // Display loading state
  if (loading && !energyData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB267" />
        <Text style={styles.loadingText}>Connecting to Victron system...</Text>
      </View>
    );
  }

  // Display error state
  if (error && !energyData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Connection Error</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEnergyData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format the last updated time
  const formattedUpdateTime = lastUpdated 
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Energy System</Text>
        {!loading ? (
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        ) : (
          <ActivityIndicator size="small" color="#FFB267" />
        )}
      </View>

      {error && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{error}</Text>
        </View>
      )}

      {energyData && (
        <>
          {/* Battery Status Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Battery</Text>
              <Text style={styles.statusTime}>{energyData.systemOverview.state}</Text>
            </View>
            
            <View style={styles.batteryContainer}>
              <View style={styles.batteryPercentage}>
                <Text style={[styles.batteryValue, { color: getBatteryColor(energyData.battery.soc) }]}>
                {energyData.battery.soc.toFixed(1)}%

                </Text>
                <Text style={styles.batteryState}>
                  {energyData.battery.state}
                </Text>
              </View>
              
              <View style={styles.batteryDetails}>
                <Text style={styles.detailText}>
                  {energyData.battery.power}W
                </Text>
                <Text style={styles.detailText}>
                  {energyData.battery.voltagev}V • {energyData.battery.current.toFixed(1)}A
                </Text>
              </View>
            </View>
          </View>

          {/* Power Flow Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Power Flow</Text>
            </View>
            
            <View style={styles.powerFlowContainer}>
              <View style={styles.powerItem}>
                <Text style={styles.powerLabel}>AC Loads</Text>
                <Text style={styles.powerValue}>{formatPower(energyData.acLoads.power)}</Text>
              </View>
              
              <View style={styles.powerItem}>
                <Text style={styles.powerLabel}>PV Charger</Text>
                <Text style={styles.powerValue}>{formatPower(energyData.pvCharger.power)}</Text>
              </View>
              
              <View style={styles.powerItem}>
                <Text style={styles.powerLabel}>DC System</Text>
                <Text style={styles.powerValue}>{formatPower(energyData.dcSystem.power)}</Text>
              </View>
            </View>
          </View>

          {/* System Status Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>System</Text>
              <Text style={styles.statusTime}>{energyData.battery.timeToGo}</Text>
            </View>
            
            <View style={styles.systemContainer}>
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>Name</Text>
                <Text style={styles.systemValue}>{energyData.systemOverview.name}</Text>
              </View>
              
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>AC Mode</Text>
                <Text style={styles.systemValue}>{energyData.systemOverview.mode}</Text>
              </View>
              
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>AC Limit</Text>
                <Text style={styles.systemValue}>{energyData.systemOverview.acLimit}A</Text>
              </View>
            </View>
          </View>

          {/* Last update time */}
          <Text style={styles.lastUpdated}>
            Last updated: {formattedUpdateTime}
          </Text>
        </>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  refreshButtonText: {
    color: '#FFB267',
    fontSize: 12,
  },
  loadingContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minHeight: 150,
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetail: {
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFB267',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  warningBanner: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  warningText: {
    color: '#FF5722',
    fontSize: 12,
  },
  panel: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    color: '#FFB267',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusTime: {
    color: '#999',
    fontSize: 14,
  },
  batteryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryPercentage: {
    alignItems: 'center',
  },
  batteryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFC107',
  },
  batteryState: {
    color: '#999',
    fontSize: 14,
  },
  batteryDetails: {
    alignItems: 'flex-end',
  },
  detailText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  powerFlowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  powerItem: {
    width: '30%',
    marginBottom: 8,
  },
  powerLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  powerValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  systemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  systemItem: {
    width: '30%',
    marginBottom: 8,
  },
  systemLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  systemValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lastUpdated: {
    color: '#999',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default VictronEnergyPanel;