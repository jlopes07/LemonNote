// Firebase Client Initialization with Auth and Firestore
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
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let app = null;
let analytics = null;
let auth = null;
let db = null;
const googleProvider = new GoogleAuthProvider();

async function initFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Não foi possível carregar a configuração do Firebase.');
    }
    const firebaseConfig = await response.json();

    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    console.log('✅ Firebase Auth e Firestore inicializados com sucesso!');
    return { app, analytics, auth, db };
  } catch (error) {
    console.error('❌ Erro ao inicializar o Firebase:', error);
  }
}

const firebaseReady = initFirebase();

async function getAuthInstance() {
  await firebaseReady;
  return auth;
}

async function getDbInstance() {
  await firebaseReady;
  return db;
}

// Authentication Helpers
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

// Firestore Public Catalog Helpers
async function getPublicIngredientsFromFirestore() {
  try {
    const firestore = await getDbInstance();
    if (!firestore) return [];
    const colRef = collection(firestore, 'public_ingredients');
    const snapshot = await getDocs(colRef);
    const result = [];
    snapshot.forEach(docSnap => result.push(docSnap.data()));
    return result;
  } catch (e) {
    console.warn('Aviso leitura public_ingredients Firestore:', e);
    return [];
  }
}

async function getPublicRecipesFromFirestore() {
  try {
    const firestore = await getDbInstance();
    if (!firestore) return [];
    const colRef = collection(firestore, 'public_recipes');
    const snapshot = await getDocs(colRef);
    const result = [];
    snapshot.forEach(docSnap => result.push(docSnap.data()));
    return result;
  } catch (e) {
    console.warn('Aviso leitura public_recipes Firestore:', e);
    return [];
  }
}

async function savePublicIngredient(ingredient) {
  try {
    const firestore = await getDbInstance();
    if (!firestore) return;
    const ingRef = doc(firestore, `public_ingredients/${ingredient.id}`);
    await setDoc(ingRef, ingredient);
  } catch (e) {
    console.warn('Aviso salvamento ingrediente público Firestore:', e);
  }
}

async function savePublicRecipe(recipe) {
  try {
    const firestore = await getDbInstance();
    if (!firestore) return;
    const recRef = doc(firestore, `public_recipes/${recipe.id}`);
    await setDoc(recRef, recipe);
  } catch (e) {
    console.warn('Aviso salvamento receita pública Firestore:', e);
  }
}

async function deletePublicIngredient(ingredientId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !ingredientId) return;
    await deleteDoc(doc(firestore, `public_ingredients/${ingredientId}`));
  } catch (e) {
    console.warn('Aviso exclusão ingrediente público:', e);
  }
}

async function deletePublicRecipe(recipeId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !recipeId) return;
    await deleteDoc(doc(firestore, `public_recipes/${recipeId}`));
  } catch (e) {
    console.warn('Aviso exclusão receita pública:', e);
  }
}

// Firestore User-Scoped Data Helpers
async function saveUserCustomIngredient(userId, ingredient) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return;
    const ingRef = doc(firestore, `users/${userId}/custom_ingredients/${ingredient.id}`);
    await setDoc(ingRef, ingredient);
  } catch (e) {
    console.warn('Aviso Firestore ingrediente:', e);
  }
}

async function getUserCustomIngredients(userId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return [];
    const colRef = collection(firestore, `users/${userId}/custom_ingredients`);
    const snapshot = await getDocs(colRef);
    const result = [];
    snapshot.forEach(docSnap => result.push(docSnap.data()));
    return result;
  } catch (e) {
    console.warn('Aviso leitura ingrediente Firestore:', e);
    return [];
  }
}

async function deleteUserCustomIngredient(userId, ingredientId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId || !ingredientId) return;
    await deleteDoc(doc(firestore, `users/${userId}/custom_ingredients/${ingredientId}`));
  } catch (e) {
    console.warn('Aviso exclusão ingrediente privado:', e);
  }
}

async function saveUserCustomRecipe(userId, recipe) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return;
    const recRef = doc(firestore, `users/${userId}/custom_recipes/${recipe.id}`);
    await setDoc(recRef, recipe);
  } catch (e) {
    console.warn('Aviso Firestore receita:', e);
  }
}

async function getUserCustomRecipes(userId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return [];
    const colRef = collection(firestore, `users/${userId}/custom_recipes`);
    const snapshot = await getDocs(colRef);
    const result = [];
    snapshot.forEach(docSnap => result.push(docSnap.data()));
    return result;
  } catch (e) {
    console.warn('Aviso leitura receita Firestore:', e);
    return [];
  }
}

async function deleteUserCustomRecipe(userId, recipeId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId || !recipeId) return;
    await deleteDoc(doc(firestore, `users/${userId}/custom_recipes/${recipeId}`));
  } catch (e) {
    console.warn('Aviso exclusão receita privada:', e);
  }
}

async function saveUserPantry(userId, pantryArray) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return;
    const pantryRef = doc(firestore, `users/${userId}/data/pantry`);
    await setDoc(pantryRef, { items: pantryArray, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn('Aviso Firestore despensa:', e);
  }
}

async function getUserPantry(userId) {
  try {
    const firestore = await getDbInstance();
    if (!firestore || !userId) return null;
    const pantryRef = doc(firestore, `users/${userId}/data/pantry`);
    const docSnap = await getDoc(pantryRef);
    if (docSnap.exists()) {
      return docSnap.data().items || [];
    }
  } catch (e) {
    console.warn('Aviso leitura despensa Firestore:', e);
  }
  return null;
}

// Expose Firestore helpers on window object for legacy module access
if (typeof window !== 'undefined') {
  window.getPublicIngredientsFromFirestore = getPublicIngredientsFromFirestore;
  window.getPublicRecipesFromFirestore = getPublicRecipesFromFirestore;
  window.savePublicIngredient = savePublicIngredient;
  window.savePublicRecipe = savePublicRecipe;
  window.deletePublicIngredient = deletePublicIngredient;
  window.deletePublicRecipe = deletePublicRecipe;
  window.saveUserCustomIngredient = saveUserCustomIngredient;
  window.getUserCustomIngredients = getUserCustomIngredients;
  window.deleteUserCustomIngredient = deleteUserCustomIngredient;
  window.saveUserCustomRecipe = saveUserCustomRecipe;
  window.getUserCustomRecipes = getUserCustomRecipes;
  window.deleteUserCustomRecipe = deleteUserCustomRecipe;
  window.saveUserPantry = saveUserPantry;
  window.getUserPantry = getUserPantry;
}

export {
  app,
  analytics,
  auth,
  db,
  initFirebase,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  onAuthChange,
  getPublicIngredientsFromFirestore,
  getPublicRecipesFromFirestore,
  savePublicIngredient,
  savePublicRecipe,
  deletePublicIngredient,
  deletePublicRecipe,
  saveUserCustomIngredient,
  getUserCustomIngredients,
  deleteUserCustomIngredient,
  saveUserCustomRecipe,
  getUserCustomRecipes,
  deleteUserCustomRecipe,
  saveUserPantry,
  getUserPantry
};
