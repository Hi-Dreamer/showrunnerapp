import { registerRootComponent } from 'expo';

// Polyfill window/global addEventListener/removeEventListener for ActionCable
if (typeof global.addEventListener !== 'function') {
  global.addEventListener = () => {};
}
if (typeof global.removeEventListener !== 'function') {
  global.removeEventListener = () => {};
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
