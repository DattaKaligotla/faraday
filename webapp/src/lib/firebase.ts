import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDrSxodXwA2rIxYJSau7eCTS7yMMyqy9gI",
  authDomain: "faraday-49784.firebaseapp.com",
  projectId: "faraday-49784",
  storageBucket: "faraday-49784.firebasestorage.app",
  messagingSenderId: "860074896580",
  appId: "1:860074896580:web:1bfdbe68ec517afb69ad91",
  measurementId: "G-66GG1R5DMV",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
