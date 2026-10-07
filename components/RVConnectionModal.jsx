import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { useScreenSize } from '../helper';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from "../GlobalStyles";

const ACCENT = '#FFB267';

const RVConnectionModal = ({ visible, onClose }) => {
  const [rvData, setRvData] = useState({
    rvId: '',
    rvName: '',
    rvModel: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { connectToRV, user } = useAuth();
  const isTablet = useScreenSize();
  const insets = useSafeAreaInsets();
  const [focusedField, setFocusedField] = useState(null);

  const handleConnect = async () => {
    if (!rvData.rvId.trim() || !rvData.rvName.trim()) {
      Alert.alert('Error', 'Please fill in RV ID and Name');
      return;
    }

    setIsLoading(true);
    try {
      const result = await connectToRV(rvData);
      
      if (result.success) {
        Alert.alert('Success', 'Connected to RV successfully!');
        setRvData({ rvId: '', rvName: '', rvModel: '' });
        onClose();
      } else {
        Alert.alert('Connection Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setRvData(prev => ({ ...prev, [field]: value }));
  };

  // ——— Bottom sheet on phones, centered card on tablets ———
  const canSubmit = rvData.rvId.trim() && rvData.rvName.trim() && !isLoading;
  const fields = [
    { key: 'rvId', label: 'RV ID', icon: 'keypad-outline', placeholder: 'e.g. RV123456', autoCapitalize: 'characters', required: true },
    { key: 'rvName', label: 'RV Name', icon: 'home-outline', placeholder: 'e.g. My Coast RV', autoCapitalize: 'words', required: true },
    { key: 'rvModel', label: 'RV Model', icon: 'car-outline', placeholder: 'Optional', autoCapitalize: 'words' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isTablet ? 'fade' : 'slide'}
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.backdrop, isTablet && styles.backdropTablet]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, isTablet ? styles.sheetTablet : { paddingBottom: insets.bottom + 20 }]}>
          {!isTablet && <View style={styles.grabber} />}

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="link" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Connect to RV</Text>
              <Text style={styles.subtitle}>Enter your RV details to pair</Text>
            </View>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {user?.rvConnection && (
              <View style={styles.currentCard}>
                <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.currentCaption}>CURRENTLY CONNECTED</Text>
                  <Text style={styles.currentName} numberOfLines={1}>
                    {user.rvConnection.rvName} ({user.rvConnection.rvId})
                  </Text>
                  <Text style={styles.currentDate}>
                    Since {new Date(user.rvConnection.connectedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            {fields.map(({ key, label, icon, placeholder, autoCapitalize, required }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>
                  {label}
                  {required ? <Text style={{ color: ACCENT }}> *</Text> : null}
                </Text>
                <View style={[styles.inputWrap, focusedField === key && styles.inputWrapFocused]}>
                  <Ionicons
                    name={icon}
                    size={18}
                    color={focusedField === key ? ACCENT : '#9E9696'}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#6B6363"
                    value={rvData[key]}
                    onChangeText={(value) => handleInputChange(key, value)}
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    accessibilityLabel={label}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              onPress={handleConnect}
              disabled={!canSubmit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#1B1B1B" />
              ) : (
                <>
                  <Ionicons name="link-outline" size={20} color="#1B1B1B" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>
                    {user?.rvConnection ? 'Update Connection' : 'Connect to RV'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.helper}>
              Your RV ID is on the control panel or in your RV documentation.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTablet: {
    width: 520,
    maxWidth: '90%',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#211D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
  },
  subtitle: {
    color: '#9E9696',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 178, 103, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.35)',
    padding: 14,
    marginBottom: 20,
  },
  currentCaption: {
    color: ACCENT,
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 1,
  },
  currentName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    marginTop: 2,
  },
  currentDate: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginTop: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: '#C9C1C1',
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: ACCENT,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#1B1B1B',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
  },
  helper: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 14,
  },
});

export default RVConnectionModal;