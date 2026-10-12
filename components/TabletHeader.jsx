// components/TabletHeader.jsx
// Shared tablet page header: calendar tile + weekday/date, live clock, optional page title,
// and the trailer logo on the right (unchanged from the original headers).
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import moment from 'moment';
import { Color, FontFamily } from '../GlobalStyles';

const ACCENT = Color.colorSandybrown;
const MUTED = '#9E9696';

// Re-render on each minute boundary so the clock and date stay current
const useMinuteClock = () => {
  const [now, setNow] = useState(moment());

  useEffect(() => {
    let interval;
    const timeout = setTimeout(() => {
      setNow(moment());
      interval = setInterval(() => setNow(moment()), 60000);
    }, (60 - moment().seconds()) * 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return now;
};

const TabletHeader = ({ title, accessory, showLogo = true, style }) => {
  const now = useMinuteClock();

  return (
    <View style={[styles.container, style]}>
      {/* Calendar tile */}
      <View style={styles.calendar} accessible accessibilityLabel={now.format('dddd, MMMM Do YYYY')}>
        <View style={styles.calendarTop}>
          <Text style={styles.calendarMonth}>{now.format('MMM')}</Text>
        </View>
        <View style={styles.calendarBody}>
          <Text style={styles.calendarDay}>{now.format('D')}</Text>
        </View>
      </View>

      <View style={styles.dateText}>
        <Text style={styles.weekday}>{now.format('dddd')}</Text>
        <Text style={styles.fullDate}>{now.format('MMMM Do, YYYY')}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.clock}>
        <Text style={styles.time}>{now.format('h:mm')}</Text>
        <Text style={styles.meridiem}>{now.format('A')}</Text>
      </View>

      <View style={styles.spacer} />

      {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}

      {showLogo && (
        <Image source={require('../assets/trailer.png')} style={styles.logo} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000',
  },
  calendar: {
    width: 54,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#211D1D',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.35)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  calendarTop: {
    alignSelf: 'stretch',
    backgroundColor: ACCENT,
    paddingVertical: 2,
    alignItems: 'center',
  },
  calendarMonth: {
    color: '#1B1B1B',
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.5,
  },
  // Fills the space under the month band so the number centers in it
  calendarBody: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDay: {
    color: Color.white0,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: FontFamily.latoBold,
    textAlign: 'center',
    includeFontPadding: false, // Android adds extra top padding that pushes the digits off-center
    textAlignVertical: 'center',
  },
  dateText: {
    marginLeft: 14,
  },
  weekday: {
    color: Color.white0,
    fontSize: 26,
    fontFamily: FontFamily.latoBold,
    lineHeight: 30,
  },
  fullDate: {
    color: MUTED,
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 20,
  },
  clock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  time: {
    color: Color.white0,
    fontSize: 34,
    fontFamily: FontFamily.latoLight,
    letterSpacing: 0.5,
  },
  meridiem: {
    color: ACCENT,
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
  },
  spacer: {
    flex: 1,
  },
  title: {
    color: Color.white0,
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
    marginRight: 18,
  },
  accessory: {
    marginRight: 14,
  },
  logo: {
    width: 90,
    height: 55,
    backgroundColor: 'black',
  },
});

export default TabletHeader;
