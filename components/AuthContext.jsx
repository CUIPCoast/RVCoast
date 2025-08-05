import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const token = await AsyncStorage.getItem('authToken');
      
      if (userData && token) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } else {
        // Check for shared user data from remote mobile login
        const sharedUserData = await AsyncStorage.getItem('sharedUserData');
        if (sharedUserData) {
          const parsedData = JSON.parse(sharedUserData);
          setUser(parsedData);
          // Don't set isAuthenticated for tablet - it has direct access regardless
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      // For now, we'll simulate authentication
      const mockUser = {
        id: Date.now(),
        username: credentials.username,
        email: `${credentials.username}@coastapp.com`,
        rvConnection: null,
        createdAt: new Date().toISOString(),
      };

      // Store user data and token
      await AsyncStorage.setItem('userData', JSON.stringify(mockUser));
      await AsyncStorage.setItem('authToken', `token_${Date.now()}`);
      
      // Also store as shared data for tablet sync
      await AsyncStorage.setItem('sharedUserData', JSON.stringify(mockUser));
      
      setUser(mockUser);
      setIsAuthenticated(true);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would be an API call
      const newUser = {
        id: Date.now(),
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        rvConnection: null,
        createdAt: new Date().toISOString(),
      };

      // Store user data and token
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      await AsyncStorage.setItem('authToken', `token_${Date.now()}`);
      
      // Also store as shared data for tablet sync
      await AsyncStorage.setItem('sharedUserData', JSON.stringify(newUser));
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('rvConnection');
      await AsyncStorage.removeItem('sharedUserData');
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const connectToRV = async (rvData) => {
    try {
      const updatedUser = {
        ...user,
        rvConnection: {
          rvId: rvData.rvId,
          rvName: rvData.rvName,
          rvModel: rvData.rvModel,
          connectedAt: new Date().toISOString(),
        }
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('rvConnection', JSON.stringify(rvData));
      
      // Update shared data for tablet sync
      await AsyncStorage.setItem('sharedUserData', JSON.stringify(updatedUser));
      
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('RV connection error:', error);
      return { success: false, error: error.message };
    }
  };

  const disconnectFromRV = async () => {
    try {
      const updatedUser = {
        ...user,
        rvConnection: null
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      await AsyncStorage.removeItem('rvConnection');
      
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('RV disconnection error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = {
        ...user,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    connectToRV,
    disconnectFromRV,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};