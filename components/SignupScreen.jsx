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

  const containerStyle = isTablet ? styles.tabletContainer : styles.mobileContainer;
  const cardStyle = isTablet ? styles.tabletCard : styles.mobileCard;

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, cardStyle]}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/icon.png')}
                style={[styles.logo, isTablet && styles.tabletLogo]}
              />
              <Text style={[styles.appTitle, isTablet && styles.tabletAppTitle]}>
                Coast RV
              </Text>
              <Text style={[styles.appSubtitle, isTablet && styles.tabletAppSubtitle]}>
                Create your account
              </Text>
            </View>

            {/* Signup Form */}
            <View style={styles.formContainer}>
              <Text style={[styles.title, isTablet && styles.tabletTitle]}>
                Join Coast RV
              </Text>
              
              {/* Name Inputs Row */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isTablet && styles.tabletInput]}
                    placeholder="First Name"
                    placeholderTextColor="#888"
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                  />
                </View>
                
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isTablet && styles.tabletInput]}
                    placeholder="Last Name"
                    placeholderTextColor="#888"
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="at-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  placeholder="Username"
                  placeholderTextColor="#888"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  placeholder="Email Address"
                  placeholderTextColor="#888"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor="#888"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#888"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, isTablet && styles.tabletSignupButton]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#66BB6A', '#4CAF50', '#388E3C']}
                  style={styles.signupGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.signupButtonText, isTablet && styles.tabletSignupButtonText]}>
                      Create Account
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login Link */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={onSwitchToLogin}
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
    backgroundColor: 'rgba(40, 41, 43, 0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  mobileCard: {
    marginVertical: 20,
  },
  tabletCard: {
    maxWidth: 600,
    alignSelf: 'center',
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
  },
  tabletLogo: {
    width: 100,
    height: 75,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tabletAppTitle: {
    fontSize: 36,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  tabletAppSubtitle: {
    fontSize: 18,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  tabletTitle: {
    fontSize: 32,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  tabletInput: {
    height: 60,
    fontSize: 18,
  },
  eyeIcon: {
    padding: 5,
  },
  signupButton: {
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletSignupButton: {
    marginTop: 30,
  },
  signupGradient: {
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabletSignupButtonText: {
    fontSize: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#888',
    marginHorizontal: 15,
    fontSize: 14,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    color: '#888',
    fontSize: 16,
  },
  tabletLoginText: {
    fontSize: 18,
  },
  loginLinkText: {
    color: '#66BB6A',
    fontWeight: 'bold',
  },
});

export default SignupScreen;