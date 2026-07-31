import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyACof4RgGw9WR_P7QDvxJVYTazOAabieoQ",
  authDomain: "e-pra-ja-a410d.firebaseapp.com",
  projectId: "e-pra-ja-a410d",
  storageBucket: "e-pra-ja-a410d.firebasestorage.app",
  messagingSenderId: "69983283333",
  appId: "1:69983283333:android:3102342a93e2a094be61ec",
};

export const app = initializeApp(firebaseConfig);
console.log("[Firebase] Firebase App inicializado para o projeto:", firebaseConfig.projectId);

export let analytics: any = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("[Firebase] Analytics ativo");
      
      logEvent(analytics, "app_open");
      console.log("[Firebase] Evento app_open enviado");

      logEvent(analytics, "screen_view", { screen_name: "Marketplace_Home" });
      console.log("[Firebase] Evento screen_view enviado");
    }
  }).catch((err) => {
    console.warn("[Firebase] Falha ao verificar suporte a Analytics:", err);
  });
}
