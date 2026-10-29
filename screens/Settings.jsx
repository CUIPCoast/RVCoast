import React, { useState } from 'react';
import { Alert } from 'react-native';
import RVConnectionModal from '../components/RVConnectionModal';
import TabletSettings from '../components/TabletSettings';
import MobileSettings from '../components/MobileSettings';
import { useScreenSize, handleSettingsToggle, handleSettingsItemPress } from '../helper';
import { useAuth } from '../components/AuthContext';



const Settings = () => {
  const isTablet = useScreenSize();
  const { user, logout, disconnectFromRV } = useAuth();
  const [showRVModal, setShowRVModal] = useState(false);
  const [toggles, setToggles] = useState({
    pushNotifications: false,
    notifyMessages: true,
    notifyReminders: true,
    locationAccess: false,
    dataSharing: true,
    wifiToggle: true,
  });

  const onToggle = key => {
    handleSettingsToggle(key, toggles, setToggles);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleDisconnectRV = () => {
    Alert.alert(
      'Disconnect RV',
      'Are you sure you want to disconnect from your RV?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            const result = await disconnectFromRV();
            if (result.success) {
              Alert.alert('Success', 'Disconnected from RV successfully');
            }
          }
        },
      ]
    );
  };

  const sections = [
    {
      title: 'Account',
      data: [
        { key: 'profile', label: 'Profile', type: 'link' },
        { key: 'changePassword', label: 'Change Password', type: 'link' },
        { key: 'signOut', label: 'Sign Out', type: 'action' },
      ],
    },
    {
      title: 'RV Connection',
      data: [
        { key: 'rvConnect', label: user?.rvConnection ? 'Update RV Connection' : 'Connect to RV', type: 'action' },
        ...(user?.rvConnection ? [{ key: 'rvDisconnect', label: 'Disconnect from RV', type: 'action' }] : []),
        ...(user?.rvConnection ? [{ key: 'rvStatus', label: `Connected to ${user.rvConnection.rvName}`, type: 'info' }] : []),
      ],
    },
    {
      title: 'Notifications',
      data: [
        { key: 'pushNotifications', label: 'Push Notifications', type: 'toggle' },
        { key: 'notifyMessages', label: 'Messages', type: 'toggle' },
        { key: 'notifyReminders', label: 'Reminders', type: 'toggle' },
      ],
    },
    {
      title: 'Privacy',
      data: [
        { key: 'locationAccess', label: 'Location Access', type: 'toggle' },
        { key: 'dataSharing', label: 'Data Sharing Preferences', type: 'toggle' },
      ],
    },
    {
      title: 'Network Configuration',
      data: [
        { key: 'wifiToggle', label: 'Wi-Fi', type: 'toggle' },
        { key: 'wifiSetup', label: 'Wi-Fi Setup', type: 'link' },
        { key: 'wifiStatus', label: 'Wi-Fi Status', type: 'info' },
      ],
    },
    {
      title: 'Power Management',
      data: [
        { key: 'batteryThresholds', label: 'Battery Thresholds and Alerts', type: 'link' },
        { key: 'generatorRules', label: 'Generator Auto-Start Rules', type: 'link' },
        { key: 'shorePowerPrefs', label: 'Shore Power Preferences', type: 'link' },
        { key: 'solarOptimization', label: 'Solar Optimization Settings', type: 'link' },
      ],
    },
    {
      title: 'Display and Interface',
      data: [
        { key: 'displayBrightness', label: 'Display Brightness Control', type: 'link' },
        { key: 'layoutCustomization', label: 'Layout Customization', type: 'link' },
        { key: 'widgetConfig', label: 'Widget Configuration', type: 'link' },
      ],
    },
    {
      title: 'Feature Specific Settings',
      data: [
        { key: 'featureSettings', label: 'Open Feature Settings', type: 'link' },
      ],
    },
    {
      title: 'About',
      data: [
        { key: 'about', label: 'About This App', type: 'link' },
      ],
    },
  ];

  const handleItemPress = (item) => {
    if (item.key === 'signOut') {
      handleSignOut();
    } else if (item.key === 'rvConnect') {
      setShowRVModal(true);
    } else if (item.key === 'rvDisconnect') {
      handleDisconnectRV();
    } else {
      handleSettingsItemPress(item, Alert.alert);
    }
  };

  if (isTablet) {
    return (
      <>
        <TabletSettings
          sections={sections}
          toggles={toggles}
          onToggle={onToggle}
          onItemPress={handleItemPress}
          user={user}
        />
        <RVConnectionModal
          visible={showRVModal}
          onClose={() => setShowRVModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <MobileSettings
        sections={sections}
        toggles={toggles}
        onToggle={onToggle}
        onItemPress={handleItemPress}
        user={user}
      />
      <RVConnectionModal
        visible={showRVModal}
        onClose={() => setShowRVModal(false)}
      />
    </>
  );
};

export default Settings;