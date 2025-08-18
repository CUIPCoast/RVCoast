import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { useScreenSize } from '../helper';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SignupScreen = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  const { signup } = useAuth();
  const isTablet = useScreenSize();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { firstName, lastName, username, email, password, confirmPassword } = formData;
    
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signup(formData);
      
      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = (config) => {
    const {
      field,
      placeholder,
      icon,
      secureTextEntry = false,
      keyboardType = 'default',
      autoCapitalize = 'none',
      showPasswordToggle = false,
      showPasswordState,
      setShowPasswordState,
      style = {}
    } = config;

    const isFocused = focusedInput === field;
    const hasValue = formData[field]?.length > 0;

    return (
      <View style={[
        styles.inputContainer,
        style,
        isFocused && styles.inputContainerFocused,
        isTablet && styles.tabletInputContainer
      ]}>
        <View style={styles.inputIconContainer}>
          <Ionicons 
            name={icon} 
            size={isTablet ? 24 : 20} 
            color={isFocused ? '#FFB267' : hasValue ? '#FF7043' : '#666'} 
          />
        </View>
        
        <TextInput
          style={[
            styles.input, 
            isTablet && styles.tabletInput,
            isFocused && styles.inputFocused
          ]}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={formData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
          onFocus={() => setFocusedInput(field)}
          onBlur={() => setFocusedInput(null)}
          secureTextEntry={secureTextEntry && !showPasswordState}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setShowPasswordState(!showPasswordState)}
            style={styles.eyeIconContainer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPasswordState ? "eye-outline" : "eye-off-outline"}
              size={isTablet ? 24 : 20}
              color={isFocused ? '#FFB267' : '#666'}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const containerStyle = isTablet ? styles.tabletContainer : styles.mobileContainer;
  const cardStyle = isTablet ? styles.tabletCard : styles.mobileCard;

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0D1117', '#1B1B1B', '#27303F']}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, cardStyle]}>
            
            {/* Header Section */}
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#FFB267', '#FF7043', '#FF5722']}
                  style={[styles.logoGradient, isTablet && styles.tabletLogoGradient]}
                >
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={[styles.logo, isTablet && styles.tabletLogo]}
                  />
                </LinearGradient>
              </View>
              
              <Text style={[styles.appTitle, isTablet && styles.tabletAppTitle]}>
                Coast RV
              </Text>
              
              <View style={styles.titleUnderline} />
              
              <Text style={[styles.welcomeText, isTablet && styles.tabletWelcomeText]}>
                Join the Coast RV Community
              </Text>
              <Text style={[styles.subtitleText, isTablet && styles.tabletSubtitleText]}>
                Control your RV from anywhere
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              
              {/* Name Fields Row */}
              <View style={styles.nameRowContainer}>
                {renderInputField({
                  field: 'firstName',
                  placeholder: 'First Name',
                  icon: 'person-outline',
                  autoCapitalize: 'words',
                  style: [styles.nameInput, { marginRight: 8 }]
                })}
                
                {renderInputField({
                  field: 'lastName',
                  placeholder: 'Last Name',
                  icon: 'person-outline',
                  autoCapitalize: 'words',
                  style: [styles.nameInput, { marginLeft: 8 }]
                })}
              </View>

              {/* Username Field */}
              {renderInputField({
                field: 'username',
                placeholder: 'Username',
                icon: 'at-outline'
              })}

              {/* Email Field */}
              {renderInputField({
                field: 'email',
                placeholder: 'Email Address',
                icon: 'mail-outline',
                keyboardType: 'email-address'
              })}

              {/* Password Field */}
              {renderInputField({
                field: 'password',
                placeholder: 'Password (min 6 characters)',
                icon: 'lock-closed-outline',
                secureTextEntry: true,
                showPasswordToggle: true,
                showPasswordState: showPassword,
                setShowPasswordState: setShowPassword
              })}

              {/* Confirm Password Field */}
              {renderInputField({
                field: 'confirmPassword',
                placeholder: 'Confirm Password',
                icon: 'lock-closed-outline',
                secureTextEntry: true,
                showPasswordToggle: true,
                showPasswordState: showConfirmPassword,
                setShowPasswordState: setShowConfirmPassword
              })}

              {/* Password Strength Indicator */}
              {formData.password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={[
                    styles.passwordStrengthBar,
                    formData.password.length >= 6 
                      ? styles.passwordStrengthGood 
                      : styles.passwordStrengthWeak
                  ]} />
                  <Text style={[
                    styles.passwordStrengthText,
                    formData.password.length >= 6 
                      ? styles.passwordStrengthTextGood 
                      : styles.passwordStrengthTextWeak
                  ]}>
                    {formData.password.length >= 6 ? 'Strong password' : 'Password too short'}
                  </Text>
                </View>
              )}

              {/* Create Account Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton, 
                  isTablet && styles.tabletSignupButton,
                  isLoading && styles.disabledButton
                ]}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFB267', '#FF7043', '#FF5722']}
                  style={[styles.signupGradient, isTablet && styles.tabletSignupGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size={isTablet ? 'large' : 'default'} />
                  ) : (
                    <>
                      <Ionicons 
                        name="rocket-outline" 
                        size={isTablet ? 24 : 20} 
                        color="#fff" 
                        style={{ marginRight: 8 }} 
                      />
                      <Text style={[styles.signupButtonText, isTablet && styles.tabletSignupButtonText]}>
                        Create Account
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>What you get:</Text>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFB267" />
                  <Text style={styles.featureText}>Remote RV control</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFB267" />
                  <Text style={styles.featureText}>Real-time monitoring</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFB267" />
                  <Text style={styles.featureText}>Smart automation</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login Link */}
              <TouchableOpacity
                style={styles.loginLinkContainer}
                onPress={onSwitchToLogin}
                activeOpacity={0.7}
              >
                <Text style={[styles.loginText, isTablet && styles.tabletLoginText]}>
                  Already have an account?{' '}
                  <Text style={styles.loginLinkText}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileContainer: {
    paddingHorizontal: 20,
  },
  tabletContainer: {
    paddingHorizontal: 60,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  card: {
    backgroundColor: 'rgba(27, 27, 27, 0.95)',
    borderRadius: 24,
    padding: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.1)',
  },
  mobileCard: {
    marginHorizontal: 0,
  },
  tabletCard: {
    maxWidth: 600,
    alignSelf: 'center',
    padding: 40,
    marginHorizontal: 20,
  },
  
  // Header Styles
  headerContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tabletLogoGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  tabletLogo: {
    width: 65,
    height: 65,
    borderRadius: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tabletAppTitle: {
    fontSize: 42,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#FFB267',
    marginBottom: 16,
    borderRadius: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 6,
    textAlign: 'center',
  },
  tabletWelcomeText: {
    fontSize: 24,
  },
  subtitleText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  tabletSubtitleText: {
    fontSize: 18,
  },

  // Form Styles
  formSection: {
    width: '100%',
  },
  nameRowContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 178, 103, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: '#FFB267',
    backgroundColor: 'rgba(39, 48, 63, 0.95)',
    shadowColor: '#FFB267',
    shadowOpacity: 0.2,
  },
  tabletInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  inputIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  tabletInput: {
    height: 64,
    fontSize: 18,
  },
  eyeIconContainer: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Password Strength
  passwordStrengthContainer: {
    marginBottom: 20,
    marginTop: -10,
  },
  passwordStrengthBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  passwordStrengthWeak: {
    backgroundColor: '#FF5722',
    width: '30%',
  },
  passwordStrengthGood: {
    backgroundColor: '#4CAF50',
    width: '100%',
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordStrengthTextWeak: {
    color: '#FF5722',
  },
  passwordStrengthTextGood: {
    color: '#4CAF50',
  },

  // Button Styles
  signupButton: {
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 25,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tabletSignupButton: {
    marginTop: 20,
    marginBottom: 30,
  },
  signupGradient: {
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletSignupGradient: {
    height: 64,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabletSignupButtonText: {
    fontSize: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },

  // Features Section
  featuresContainer: {
    backgroundColor: 'rgba(39, 48, 63, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.1)',
  },
  featuresTitle: {
    color: '#FFB267',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },

  // Login Link
  loginLinkContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  tabletLoginText: {
    fontSize: 18,
  },
  loginLinkText: {
    color: '#FFB267',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;