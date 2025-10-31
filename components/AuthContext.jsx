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
  const [user, setUser] = useState({
    id: 1,
    username: 'Brian@Aero',
    email: 'owner@coastapp.com',
    firstName: 'Brian',
    lastName: 'Fuente',
    profileImage: require("../assets/brian.photo.jpg"), // Can be a URI or require() path
    rvConnection: null,
    createdAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        // Override old data with current default values, but keep RV connection
        const mergedUser = {
          ...parsedData,
          id: 1,
          username: 'Brian@Aero',
          email: 'owner@coastapp.com',
          firstName: 'Brian',
          lastName: 'Fuente',
          profileImage: require("../assets/brian.photo.jpg"),
          // Keep the RV connection from stored data if it exists
          rvConnection: parsedData.rvConnection || null,
        };
        setUser(mergedUser);
        // Save the updated data back to storage
        await AsyncStorage.setItem('userData', JSON.stringify(mergedUser));
      } else {
        // No stored data, save the default user
        const defaultUser = {
          id: 1,
          username: 'Brian@Aero',
          email: 'owner@coastapp.com',
          firstName: 'Brian',
          lastName: 'Fuente',
          profileImage: require("../assets/brian.photo.jpg"),
          rvConnection: null,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('userData', JSON.stringify(defaultUser));
        setUser(defaultUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
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

  const updateProfileImage = async (imageUri) => {
    try {
      const updatedUser = {
        ...user,
        profileImage: imageUri,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      console.error('Profile image update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    isLoading,
    connectToRV,
    disconnectFromRV,
    updateProfile,
    updateProfileImage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};