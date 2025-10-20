import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { FontFamily } from "../GlobalStyles";
import { VictronEnergyService } from "../API/VictronEnergyService";

const SystemCharts = () => {
  const { width } = useWindowDimensions();
  const [victronData, setVictronData] = useState(null);
  const [powerHistory, setPowerHistory] = useState({
    solar: [],
    battery: [],
    grid: [],
    loads: []
  });

  // Fetch Victron data and update power history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await VictronEnergyService.getAllData();
        setVictronData(data);

        // Update power history (keep last 20 readings)
        setPowerHistory(prev => ({
          solar: [...prev.solar.slice(-19), data?.pvCharger?.power || 0],
          battery: [...prev.battery.slice(-19), data?.battery?.power || 0],
          grid: [...prev.grid.slice(-19), data?.grid?.power || 0],
          loads: [...prev.loads.slice(-19), data?.acLoads?.power || 0]
        }));
      } catch (error) {
        console.error("Failed to load Victron data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    if (!victronData) return null;

    const batterySOC = (victronData.battery?.soc || 0) * 100;
    const batteryVoltage = victronData.battery?.voltage || 0;
    const batteryCurrent = victronData.battery?.current || 0;
    const batteryPower = victronData.battery?.power || 0;

    const solarPower = victronData.pvCharger?.power || 0;
    const gridPower = victronData.grid?.power || 0;
    const loadPower = victronData.acLoads?.power || 0;

    // Calculate averages from history
    const avgSolar = powerHistory.solar.length > 0
      ? powerHistory.solar.reduce((a, b) => a + b, 0) / powerHistory.solar.length
      : 0;
    const avgBattery = powerHistory.battery.length > 0
      ? powerHistory.battery.reduce((a, b) => a + b, 0) / powerHistory.battery.length
      : 0;

    return {
      batterySOC,
      batteryVoltage,
      batteryCurrent,
      batteryPower,
      solarPower,
      gridPower,
      loadPower,
      avgSolar,
      avgBattery,
      isCharging: batteryPower < 0, // Negative = charging
      isDischarging: batteryPower > 0,
      powerBalance: solarPower + gridPower - loadPower
    };
  };

  const stats = calculateStats();

  const formatPower = (value) => {
    if (value === null || value === undefined) return '--';
    return `${Math.abs(parseFloat(value)).toFixed(1)}W`;
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '--';
    return parseFloat(value).toFixed(decimals);
  };

  return (
    <View style={[styles.tabletContainer, { width }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Energy Analytics</Text>
          <Text style={styles.subtitle}>Real-time Power & System Metrics</Text>
        </View>

        {/* Power Flow Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.solarCard]}>
            <Text style={styles.summaryLabel}>Solar Generation</Text>
            <Text style={styles.summaryValue}>{formatPower(stats?.solarPower)}</Text>
            <Text style={styles.summarySubtext}>
              Avg: {formatPower(stats?.avgSolar)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.batteryCard]}>
            <Text style={styles.summaryLabel}>Battery</Text>
            <Text style={styles.summaryValue}>{stats?.batterySOC?.toFixed(0)}%</Text>
            <Text style={styles.summarySubtext}>
              {stats?.isCharging ? '⚡ Charging' : stats?.isDischarging ? '🔋 Discharging' : '⏸ Idle'}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.loadCard]}>
            <Text style={styles.summaryLabel}>Total Load</Text>
            <Text style={styles.summaryValue}>{formatPower(stats?.loadPower)}</Text>
            <Text style={styles.summarySubtext}>
              AC Consumption
            </Text>
          </View>
        </View>

        {/* Battery Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battery Analytics</Text>
          <View style={styles.metricsGrid}>
            <MetricBox
              label="State of Charge"
              value={`${stats?.batterySOC?.toFixed(1)}%`}
              color="#4CAF50"
            />
            <MetricBox
              label="Voltage"
              value={`${formatNumber(stats?.batteryVoltage)} V`}
              color="#2196F3"
            />
            <MetricBox
              label="Current"
              value={`${formatNumber(stats?.batteryCurrent)} A`}
              color="#FF9800"
            />
            <MetricBox
              label="Power"
              value={formatPower(stats?.batteryPower)}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Power Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Sources & Consumption</Text>
          <View style={styles.metricsGrid}>
            <MetricBox
              label="Solar (PV)"
              value={formatPower(stats?.solarPower)}
              color="#FFD700"
            />
            <MetricBox
              label="Shore Power"
              value={formatPower(stats?.gridPower)}
              color="#D32F2F"
            />
            <MetricBox
              label="AC Loads"
              value={formatPower(stats?.loadPower)}
              color="#388E3C"
            />
            <MetricBox
              label="Power Balance"
              value={formatPower(stats?.powerBalance)}
              color={stats?.powerBalance >= 0 ? '#4CAF50' : '#F44336'}
            />
          </View>
        </View>

        {/* Simple Power History Graph */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Trends (Last 20 readings)</Text>
          <View style={styles.chartContainer}>
            <PowerBarChart data={powerHistory.solar} label="Solar" color="#FFD700" />
            <PowerBarChart data={powerHistory.battery} label="Battery" color="#2196F3" />
            <PowerBarChart data={powerHistory.loads} label="Loads" color="#388E3C" />
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusGrid}>
            <StatusItem
              label="Connection"
              value={victronData ? "Connected" : "Disconnected"}
              isGood={!!victronData}
            />
            <StatusItem
              label="Grid Status"
              value={victronData?.grid?.isConnected ? "Connected" : "Disconnected"}
              isGood={victronData?.grid?.isConnected}
            />
            <StatusItem
              label="Solar Active"
              value={stats?.solarPower > 0 ? "Yes" : "No"}
              isGood={stats?.solarPower > 0}
            />
            <StatusItem
              label="Battery Health"
              value={stats?.batterySOC >= 50 ? "Good" : stats?.batterySOC >= 20 ? "Fair" : "Low"}
              isGood={stats?.batterySOC >= 50}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Metric Box Component
const MetricBox = ({ label, value, color }) => (
  <View style={[styles.metricBox, { borderLeftColor: color }]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

// Status Item Component
const StatusItem = ({ label, value, isGood }) => (
  <View style={styles.statusItem}>
    <View style={[styles.statusDot, { backgroundColor: isGood ? '#4CAF50' : '#F44336' }]} />
    <View style={styles.statusText}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  </View>
);

// Simple Bar Chart Component
const PowerBarChart = ({ data, label, color }) => {
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const height = (Math.abs(value) / maxValue) * 60;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: height || 2,
                  backgroundColor: color,
                  opacity: 0.3 + (index / data.length) * 0.7
                }
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.chartValue}>{Math.abs(data[data.length - 1] || 0).toFixed(0)}W</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
  },

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  solarCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  batteryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  loadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#388E3C',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 36,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: '#888',
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 8,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
  },

  // Chart Container
  chartContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartLabel: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
    width: 80,
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 2,
  },
  chartValue: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: '#FFF',
    width: 70,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Status Grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default SystemCharts;
