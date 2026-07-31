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
console.log("[Firebase] FirebaseApp inicializado para o projeto:", firebaseConfig.projectId);

export let analytics: any = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      logEvent(analytics, "app_open");
      logEvent(analytics, "screen_view", { screen_name: "Marketplace_Home" });
      logEvent(analytics, "notification_test");
      console.log("[Firebase Analytics] Eventos inicializados e reportando ao painel em tempo real!");
    }
  }).catch((err) => {
    console.warn("[Firebase Analytics] Analytics não suportado neste ambiente:", err);
  });
}
