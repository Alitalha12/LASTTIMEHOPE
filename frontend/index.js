import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';

// 1. Register for standard Expo Go (registers 'main')
registerRootComponent(App);

// 2. Register for custom Dev Clients, emulators, or native shells to avoid 'Component X has not been registered' crashes
AppRegistry.registerComponent('Auth', () => App);
AppRegistry.registerComponent('auth', () => App);
AppRegistry.registerComponent('frontend', () => App);
AppRegistry.registerComponent('kaamKonnect', () => App);
