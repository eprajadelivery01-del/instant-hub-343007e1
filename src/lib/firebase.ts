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
      try {
        analytics = getAnalytics(app);
        
        try { logEvent(analytics, "app_open"); } catch {}
        try { logEvent(analytics, "screen_view" as any, { screen_name: "Marketplace_Home" } as any); } catch {}
      } catch (e) {
        console.warn("[Firebase] Erro ao inicializar Analytics:", e);
      }
    }
  }).catch((err) => {
    console.warn("[Firebase] Falha ao verificar suporte a Analytics:", err);
  });
}
