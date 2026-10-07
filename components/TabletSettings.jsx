import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import ToggleSwitch from './ToggleSwitch.jsx';
import { FontFamily } from '../GlobalStyles';
import { useRVConnection } from '../API/RVStateManager/RVStateHooks';

// Tablet settings: two-pane layout (profile + section list | selected section).

const ACCENT = '#FFB267';
const DANGER = '#FF6B6B';

const SECTION_ICONS = {
  'Account': 'person-circle-outline',
  'RV Connection': 'link-outline',
  'Notifications': 'notifications-outline',
  'Privacy': 'shield-checkmark-outline',
  'Network Configuration': 'wifi-outline',
  'Power Management': 'battery-charging-outline',
  'Display and Interface': 'tablet-landscape-outline',
  'Feature Specific Settings': 'options-outline',
  'About': 'information-circle-outline',
};

const DESTRUCTIVE_KEYS = ['signOut', 'rvDisconnect'];
const NOTIFICATION_CHILDREN = ['notifyMessages', 'notifyReminders'];

const TabletSettings = ({ sections, toggles, onToggle, onItemPress, user }) => {
  const [selected, setSelected] = useState(sections[0]?.title);
  const section = sections.find((s) => s.title === selected) || sections[0];

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.username ? user.username.substring(0, 2).toUpperCase() : 'GU';
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username || 'Guest User';

  // Banner turns on when the live link to the RV is up; saved RV details alone
  // only show as "offline" until the app can actually reach it.
  const isLinked = useRVConnection();
  const savedRV = user?.rvConnection;
  const rvStatus = isLinked
    ? { on: true, icon: 'checkmark-circle', text: savedRV ? `Connected to ${savedRV.rvName}` : 'Connected to RV' }
    : savedRV
      ? { on: false, icon: 'cloud-offline-outline', text: `${savedRV.rvName} · offline` }
      : { on: false, icon: 'close-circle-outline', text: 'No RV connected' };

  const renderItem = (item, index) => {
    const isLast = index === section.data.length - 1;
    const rowStyle = [styles.row, isLast && styles.rowLast];

    if (item.type === 'toggle') {
      const disabled = NOTIFICATION_CHILDREN.includes(item.key) && !toggles.pushNotifications;
      return (
        <View key={item.key} style={rowStyle}>
          <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{item.label}</Text>
          <ToggleSwitch
            isOn={disabled ? false : !!toggles[item.key]}
            setIsOn={() => onToggle(item.key)}
            disabled={disabled}
          />
        </View>
      );
    }

    const destructive = DESTRUCTIVE_KEYS.includes(item.key);
    const isInfo = item.type === 'info';

    return (
      <TouchableOpacity
        key={item.key}
        style={rowStyle}
        onPress={() => onItemPress(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <Text style={[styles.rowLabel, destructive && { color: DANGER }]}>{item.label}</Text>
        <Ionicons
          name={isInfo ? 'information-circle-outline' : 'chevron-forward'}
          size={20}
          color={destructive ? DANGER : '#9E9696'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.day}>{moment().format('dddd')}</Text>
          <Text style={styles.date}>{moment().format('MMMM Do, YYYY')}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color={ACCENT} />
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Left pane */}
        <View style={styles.leftPane}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || 'guest@coastapp.com'}</Text>
              <View
                style={[styles.rvBadge, !rvStatus.on && styles.rvBadgeOff]}
                accessible
                accessibilityLabel={`RV status: ${rvStatus.text}`}
              >
                <Ionicons name={rvStatus.icon} size={14} color={rvStatus.on ? ACCENT : '#9E9696'} />
                <Text style={[styles.rvBadgeText, !rvStatus.on && { color: '#9E9696' }]} numberOfLines={1}>
                  {rvStatus.text}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            {sections.map((s) => {
              const active = s.title === section.title;
              return (
                <TouchableOpacity
                  key={s.title}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => setSelected(s.title)}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.navIcon, active && styles.navIconActive]}>
                    <Ionicons
                      name={SECTION_ICONS[s.title] || 'ellipse-outline'}
                      size={18}
                      color={active ? '#1B1B1B' : '#C9C1C1'}
                    />
                  </View>
                  <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={active ? ACCENT : '#6B6363'} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.footer}>Coast App v1.0.0 · © 2025</Text>
        </View>

        {/* Right pane */}
        <View style={styles.rightPane}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name={SECTION_ICONS[section.title] || 'ellipse-outline'} size={22} color={ACCENT} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sectionCard}>{section.data.map(renderItem)}</View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  day: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: FontFamily.latoBold,
  },
  date: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
    marginRight: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: 24,
  },
  leftPane: {
    width: 340,
    marginRight: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#211D1D',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#1B1B1B',
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
  },
  profileEmail: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  rvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    maxWidth: '100%',
  },
  rvBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  rvBadgeText: {
    color: ACCENT,
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    marginLeft: 5,
    flexShrink: 1,
  },
  navList: {
    flex: 1,
    backgroundColor: '#211D1D',
    borderRadius: 20,
    padding: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2A2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIconActive: {
    backgroundColor: ACCENT,
  },
  navLabel: {
    flex: 1,
    color: '#C9C1C1',
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
  },
  footer: {
    color: '#6B6363',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    textAlign: 'center',
    marginTop: 12,
  },
  rightPane: {
    flex: 1,
    backgroundColor: '#211D1D',
    borderRadius: 20,
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
  },
  sectionCard: {
    backgroundColor: '#1B1B1B',
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    marginRight: 12,
  },
  rowLabelDisabled: {
    opacity: 0.45,
  },
});

export default TabletSettings;
