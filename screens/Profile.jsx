import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Color, FontFamily, isDarkMode } from '../GlobalStyles';
import { useScreenSize } from '../helper';
import { useAuth } from '../components/AuthContext';

const Profile = ({ onClose }) => {
  const isTablet = useScreenSize();
  const isDark = isDarkMode;
  const { user, updateProfileImage } = useAuth();

  const handleImagePress = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        {
          text: 'Upload from Gallery',
          onPress: pickImageFromGallery,
        },
        {
          text: 'Remove Photo',
          onPress: () => updateProfileImage(null),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await updateProfileImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const InfoRow = ({ label, value, icon }) => (
    <View style={[styles.infoRow, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: Color.colorSandybrown + '20' }]}>
          <Ionicons name={icon} size={20} color={Color.colorSandybrown} />
        </View>
      )}
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: isDark ? '#999' : '#666' }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Color.colorGray_200 : Color.colorWhitesmoke_100 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color={isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
          Profile
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
          <TouchableOpacity
            style={[styles.avatarCircle, { backgroundColor: user?.profileImage ? 'transparent' : Color.colorSandybrown }]}
            onPress={handleImagePress}
          >
            {user?.profileImage ? (
              <Image
                source={typeof user.profileImage === 'string' && user.profileImage.startsWith('http')
                  ? { uri: user.profileImage }
                  : typeof user.profileImage === 'string'
                  ? { uri: user.profileImage }
                  : user.profileImage
                }
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName[0]}${user.lastName[0]}`
                  : user?.username ? user.username.substring(0, 2).toUpperCase() : 'GU'}
              </Text>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.profileName, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || 'Guest User'}
          </Text>
          <Text style={[styles.profileEmail, { color: isDark ? '#999' : '#666' }]}>
            {user?.email || 'guest@coastapp.com'}
          </Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
            Account Information
          </Text>
          <InfoRow label="Username" value={user?.username || 'Not set'} icon="person-outline" />
          <InfoRow label="Email" value={user?.email || 'Not set'} icon="mail-outline" />
          <InfoRow label="Member Since" value="June 2023" icon="calendar-outline" />
        </View>

        {/* RV Information */}
        {user?.rvConnection && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
              RV Connection
            </Text>
            <InfoRow
              label="Connected RV"
              value={user.rvConnection.rvName || 'Unknown'}
              icon="construct-outline"
            />
            <InfoRow
              label="Connection Status"
              value="Active"
              icon="checkmark-circle-outline"
            />
          </View>
        )}

        {/* Settings Quick Access */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
            Preferences
          </Text>
          <TouchableOpacity style={[styles.actionRow, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
            <Ionicons name="notifications-outline" size={22} color={Color.colorSandybrown} />
            <Text style={[styles.actionText, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
              Notification Settings
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
            <Ionicons name="shield-outline" size={22} color={Color.colorSandybrown} />
            <Text style={[styles.actionText, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
              Privacy & Security
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#999'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Color.colorSandybrown,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default Profile;
