import React, {useState} from 'react';
import {Alert, Modal, StyleSheet, Text, Pressable, View, Image} from 'react-native';
import {SafeAreaView, SafeAreaProvider} from 'react-native-safe-area-context';
import Settings from '../screens/Settings';
import Devices from '../screens/Devices';
import AirCon from '../screens/AirCon';
import Home from '../screens/Home';
import System from '../screens/System';
import GroupComponent from './GroupComponent';
import AwningControlModal from './AwningControlModal';
import MainScreen from '../screens/MainScreen';
import Wifi from './Wifi';

const ModalComponent = ({nameComponent}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const renderLogo = (nameComponent) => {
    switch (nameComponent) {
      case 'Settings':
        return <Settings />;
      case 'Home':
        return <Home />;
      case 'Devices':
        return <Devices />;
       case 'Wifi':
        return <Wifi />;
      // case 'Awning':
      //   return <AwningControlModal />;
      default:
        return <Text>Screen not found!</Text>;
    }
  };

  const renderContent = (nameComponent) => {
    switch (nameComponent) {
      case 'Settings':
        return <GroupComponent />;
      case 'Home':
        return <Home />;
      case 'Devices':
        return <Wifi />;
      default:
        return <Text>Screen not found!</Text>;
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 justify-center items-center">
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert('Modal has been closed.');
            setModalVisible(!modalVisible);
          }}>
          <View className="flex-1 justify-center items-center">
            <View className="bg-gray-200 items-end rounded-xl">
              <Pressable
                onPress={() => setModalVisible(!modalVisible)}>
                <Text className="text-bold text-white pt-4 pr-6">X</Text>
              </Pressable>
              <Text className="m-4">
                {renderContent(nameComponent)}
              </Text>

            </View>
          </View>
        </Modal>
        <Pressable
          onPress={() => setModalVisible(true)}
        >
          <View>{renderLogo(nameComponent)}</View>
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default ModalComponent;