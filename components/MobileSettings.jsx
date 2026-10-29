import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ToggleSwitch from './ToggleSwitch.jsx';
import { FontFamily } from '../GlobalStyles';
import { useRVConnection } from '../API/RVStateManager/RVStateHooks';

// Mobile settings: profile card + grouped section cards, on the mobile Home screen's surfaces.

const ACCENT = '#FFB267';
const DANGER = '#FF6B6B';
const MUTED = '#9E9696';
// Surfaces, matching the mobile Home screen
const PAGE_BG = '#211D1D';
const CARD = '#1B1B1B';

const ITEM_ICONS = {
  profile: 'person-outline',
  changePassword: 'key-outline',
  signOut: 'log-out-outline',
  rvConnect: 'link-outline',
  rvDisconnect: 'unlink-outline',
  pushNotifications: 'notifications-outline',
  notifyMessages: 'chatbubble-outline',
  notifyReminders: 'alarm-outline',
  locationAccess: 'location-outline',
  dataSharing: 'share-social-outline',
  wifiToggle: 'wifi-outline',
  wifiSetup: 'construct-outline',
  wifiStatus: 'pulse-outline',
  batteryThresholds: 'battery-half-outline',
  generatorRules: 'flash-outline',
  shorePowerPrefs: 'flash-outline',
  solarOptimization: 'sunny-outline',
  displayBrightness: 'contrast-outline',
  layoutCustomization: 'grid-outline',
  widgetConfig: 'apps-outline',
  featureSettings: 'options-outline',
  about: 'information-circle-outline',
};

const DESTRUCTIVE_KEYS = ['signOut', 'rvDisconnect'];
const NOTIFICATION_CHILDREN = ['notifyMessages', 'notifyReminders'];
// Shown in the profile card instead of as a list row.
const HIDDEN_KEYS = ['rvStatus'];

const MobileSettings = ({ sections, toggles, onToggle, onItemPress, user }) => {
  const insets = useSafeAreaInsets();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.username ? user.username.substring(0, 2).toUpperCase() : 'GU';
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username || 'Guest User';

  const isLinked = useRVConnection();
  const savedRV = user?.rvConnection;
  const rvStatus = isLinked
    ? { on: true, icon: 'checkmark-circle', text: savedRV ? `Connected to ${savedRV.rvName}` : 'Connected to RV' }
    : savedRV
      ? { on: false, icon: 'cloud-offline-outline', text: `${savedRV.rvName} · offline` }
      : { on: false, icon: 'close-circle-outline', text: 'No RV connected' };

  const renderItem = (item, index, items) => {
    const isLast = index === items.length - 1;
    const destructive = DESTRUCTIVE_KEYS.includes(item.key);
    const disabled = item.type === 'toggle'
      && NOTIFICATION_CHILDREN.includes(item.key) && !toggles.pushNotifications;
    const tint = destructive ? DANGER : ACCENT;

    const content = (
      <>
        <View style={[styles.iconBox, { backgroundColor: destructive ? 'rgba(255, 107, 107, 0.14)' : 'rgba(255, 178, 103, 0.14)' }]}>
          <Ionicons name={ITEM_ICONS[item.key] || 'ellipse-outline'} size={18} color={tint} />
        </View>
        <View style={[styles.rowInner, !isLast && styles.rowDivider]}>
          <Text
            style={[styles.rowLabel, destructive && { color: DANGER }, disabled && styles.rowLabelDisabled]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {item.type === 'toggle' ? (
            <View style={styles.toggleWrap}>
              <ToggleSwitch
                isOn={disabled ? false : !!toggles[item.key]}
                setIsOn={() => onToggle(item.key)}
                disabled={disabled}
              />
            </View>
          ) : (
            <Ionicons
              name={item.type === 'info' ? 'information-circle-outline' : 'chevron-forward'}
              size={18}
              color={destructive ? DANGER : '#6B6363'}
            />
          )}
        </View>
      </>
    );

    if (item.type === 'toggle') {
      return <View key={item.key} style={styles.row}>{content}</View>;
    }

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.row}
        onPress={() => onItemPress(item)}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => onItemPress({ key: 'profile', label: 'Profile', type: 'link' })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Profile, ${displayName}. RV status: ${rvStatus.text}`}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || 'guest@coastapp.com'}</Text>
            <View style={[styles.rvBadge, !rvStatus.on && styles.rvBadgeOff]}>
              <Ionicons name={rvStatus.icon} size={13} color={rvStatus.on ? ACCENT : MUTED} />
              <Text style={[styles.rvBadgeText, !rvStatus.on && { color: MUTED }]} numberOfLines={1}>
                {rvStatus.text}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B6363" />
        </TouchableOpacity>

        {sections.map((section) => {
          const items = section.data.filter((item) => !HIDDEN_KEYS.includes(item.key));
          if (!items.length) return null;
          return (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.card}>
                {items.map((item, index) => renderItem(item, index, items))}
              </View>
            </View>
          );
        })}

        <Text style={styles.footer}>Coast App v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: FontFamily.latoBold,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#1B1B1B',
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
  },
  profileEmail: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  rvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: MUTED,
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingLeft: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 56,
    paddingRight: 14,
  },
  toggleWrap: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FontFamily.latoRegular,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginRight: 12,
  },
  rowLabelDisabled: {
    opacity: 0.45,
  },
  footer: {
    color: '#6B6363',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    textAlign: 'center',
    marginTop: 28,
  },
});

export default MobileSettings;
