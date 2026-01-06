
import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Automatically configure API Base URL for Mobile App
if (Capacitor.isNativePlatform()) {
    // Cloud Run Production URL (Retrieved from deployment)
    axios.defaults.baseURL = 'https://vtrustx-service-ewhlzzsutq-uc.a.run.app';
    console.log("Running on Android/iOS - using production API:", axios.defaults.baseURL);
} else {
    // Web: Rely on Vite proxy (relative paths)
    console.log("Running on Web - using proxy");
    // No change needed (defaults to relative)
}
