import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiUrjoClpA8XK1RaEiMXDHrFOXX2To2YA",
  authDomain: "service-orchestrator-c9c7e.firebaseapp.com",
  projectId: "service-orchestrator-c9c7e",
  storageBucket: "service-orchestrator-c9c7e.firebasestorage.app",
  measurementId: "G-RXZDJEPFVD",
  messagingSenderId: "270804314714",
  appId: "1:270804314714:web:e48b9376957553cb1fc663"
};

// Safely initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

// Safely initialize or retrieve Firebase Auth instance with ReactNativeAsyncStorage to prevent duplicate registration
let authInstance;
try {
  authInstance = getAuth(app);
} catch (e) {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export const auth = authInstance;
