// Firebase Client Initialization using dynamic environment variables from server (.env)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let app = null;
let analytics = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();

async function initFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Não foi possível carregar a configuração do Firebase.');
    }
    const firebaseConfig = await response.json();

    // Inicializa o Firebase com as variáveis lidas do .env
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);

    console.log('✅ Firebase e Autenticação inicializados com sucesso via .env!');
    return { app, analytics, auth };
  } catch (error) {
    console.error('❌ Erro ao inicializar o Firebase:', error);
  }
}

// Promise para garantir que o Auth está pronto antes de chamadas
const firebaseReady = initFirebase();

async function getAuthInstance() {
  await firebaseReady;
  return auth;
}

// Funções Auxiliares de Autenticação
async function loginWithEmail(email, password) {
  const authInst = await getAuthInstance();
  return signInWithEmailAndPassword(authInst, email, password);
}

async function registerWithEmail(email, password) {
  const authInst = await getAuthInstance();
  return createUserWithEmailAndPassword(authInst, email, password);
}

async function loginWithGoogle() {
  const authInst = await getAuthInstance();
  return signInWithPopup(authInst, googleProvider);
}

async function logoutUser() {
  const authInst = await getAuthInstance();
  return signOut(authInst);
}

async function onAuthChange(callback) {
  const authInst = await getAuthInstance();
  return onAuthStateChanged(authInst, callback);
}

export {
  app,
  analytics,
  auth,
  initFirebase,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  onAuthChange
};
