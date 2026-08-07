// Shared utility functions and state persistence

// Global Constants & State
const PANTRY_KEY = 'lemonNote_pantry_v1';
const CUSTOM_ING_KEY = 'lemonNote_custom_ingredients_v1';
const CUSTOM_REC_KEY = 'lemonNote_custom_recipes_v1';

// String normalization helper (removes accents, special characters, and extra spaces)
function normalizeString(str) {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function generateSlug(name, prefix = 'rec') {
  const norm = normalizeString(name)
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return norm ? `${prefix}_${norm}` : `${prefix}_${Date.now()}`;
}

window.normalizeString = normalizeString;
window.generateSlug = generateSlug;
const THEME_KEY = 'lemonNote_theme';

// Global Theme Controller (Dark Green vs Light Green)
function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(themeName) {
  const theme = themeName === 'light' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);

  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
}

function initTheme() {
  const currentTheme = getTheme();
  setTheme(currentTheme);
}

// Auto-run theme initialization
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
}

// Helper to get active user scope ID
function getCurrentUserScope() {
  if (window._currentUser && window._currentUser.uid) {
    return window._currentUser.uid;
  }
  const extra = localStorage.getItem('lemonNote_user_profile_extra');
  if (extra) {
    try {
      const parsed = JSON.parse(extra);
      if (parsed.email) return parsed.email.replace(/[^a-zA-Z0-9]/g, '_');
    } catch (e) {}
  }
  return 'default_user';
}

function getPantryKey() {
  return `${PANTRY_KEY}_${getCurrentUserScope()}`;
}

function getCustomIngredientsKey() {
  return `${CUSTOM_ING_KEY}_${getCurrentUserScope()}`;
}

function getCustomRecipesKey() {
  return `${CUSTOM_REC_KEY}_${getCurrentUserScope()}`;
}

function updateGlobalPantryBadge() {
  const saved = localStorage.getItem(getPantryKey());
  let count = 0;
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      count = Array.isArray(arr) ? arr.length : 0;
    } catch (e) {
      count = 0;
    }
  }
  const badges = document.querySelectorAll('#selected-count');
  badges.forEach(b => { b.textContent = count; });
}

window.updateGlobalPantryBadge = updateGlobalPantryBadge;

function getPantry() {
  const saved = localStorage.getItem(getPantryKey());
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error('Error parsing pantry', e);
      return new Set();
    }
  }
  return new Set();
}

function savePantry(selectedSet) {
  const arr = Array.from(selectedSet);
  localStorage.setItem(getPantryKey(), JSON.stringify(arr));
  updateGlobalPantryBadge();

  // Sync pantry selection to Firebase Firestore
  const uid = getCurrentUserScope();
  if (uid && typeof window.saveUserPantry === 'function') {
    window.saveUserPantry(uid, arr);
  }
}

// User-scoped custom items storage helpers
function getCustomIngredients() {
  const saved = localStorage.getItem(getCustomIngredientsKey());
  return saved ? JSON.parse(saved) : [];
}

async function saveCustomIngredient(ing, isPublic = false) {
  const uid = getCurrentUserScope();
  ing.userId = uid;
  ing.isCustom = !isPublic;
  ing.isPublic = isPublic;

  // Local storage backup
  const custom = getCustomIngredients();
  custom.push(ing);
  localStorage.setItem(getCustomIngredientsKey(), JSON.stringify(custom));

  // Sync with Firebase Firestore (Public catalog or User collection)
  if (isPublic && typeof window.savePublicIngredient === 'function') {
    await window.savePublicIngredient(ing);
  } else if (uid && typeof window.saveUserCustomIngredient === 'function') {
    await window.saveUserCustomIngredient(uid, ing);
  }
}

function getCustomRecipes() {
  const saved = localStorage.getItem(getCustomRecipesKey());
  return saved ? JSON.parse(saved) : [];
}

async function saveCustomRecipe(rec, isPublic = false) {
  const uid = getCurrentUserScope();
  rec.userId = uid;
  rec.isCustom = !isPublic;
  rec.isPublic = isPublic;

  // Local storage backup
  const custom = getCustomRecipes();
  custom.push(rec);
  localStorage.setItem(getCustomRecipesKey(), JSON.stringify(custom));

  // Sync with Firebase Firestore (Public catalog or User collection)
  if (isPublic && typeof window.savePublicRecipe === 'function') {
    await window.savePublicRecipe(rec);
  } else if (uid && typeof window.saveUserCustomRecipe === 'function') {
    await window.saveUserCustomRecipe(uid, rec);
  }
}

async function deleteIngredient(ing) {
  if (!ing || !ing.id) return;
  const uid = getCurrentUserScope();

  // Remove from localStorage
  const localCustom = getCustomIngredients().filter(i => i.id !== ing.id);
  localStorage.setItem(getCustomIngredientsKey(), JSON.stringify(localCustom));

  // Remove from Firestore
  if (ing.isPublic && typeof window.deletePublicIngredient === 'function') {
    await window.deletePublicIngredient(ing.id);
  } else if (uid && typeof window.deleteUserCustomIngredient === 'function') {
    await window.deleteUserCustomIngredient(uid, ing.id);
  }
}

async function deleteRecipe(rec) {
  if (!rec || !rec.id) return;
  const uid = getCurrentUserScope();

  // Remove from localStorage
  const localCustom = getCustomRecipes().filter(r => r.id !== rec.id);
  localStorage.setItem(getCustomRecipesKey(), JSON.stringify(localCustom));

  // Remove from Firestore
  if (rec.isPublic && typeof window.deletePublicRecipe === 'function') {
    await window.deletePublicRecipe(rec.id);
  } else if (uid && typeof window.deleteUserCustomRecipe === 'function') {
    await window.deleteUserCustomRecipe(uid, rec.id);
  }
}

window.deleteIngredient = deleteIngredient;
window.deleteRecipe = deleteRecipe;

// Fetch public catalog directly from Firebase Firestore and merge with user custom items
async function loadAppData() {
  let defaultIngredients = [];
  let defaultRecipes = [];

  // 1. Read public catalog directly from Firebase Firestore (with in-memory fallback if connecting)
  try {
    if (typeof window.getPublicIngredientsFromFirestore === 'function') {
      defaultIngredients = await window.getPublicIngredientsFromFirestore().catch(() => []);
    }
    if (typeof window.getPublicRecipesFromFirestore === 'function') {
      defaultRecipes = await window.getPublicRecipesFromFirestore().catch(() => []);
    }
  } catch (e) {
    console.warn('Firestore public catalog read fallback:', e);
  }



  // Load custom ingredients & recipes for the logged-in user from localStorage and Firestore
  const uid = getCurrentUserScope();
  const localCustomIngredients = getCustomIngredients();
  const localCustomRecipes = getCustomRecipes();

  let firestoreIngredients = [];
  let firestoreRecipes = [];

  try {
    if (uid && typeof window.getUserCustomIngredients === 'function') {
      firestoreIngredients = await window.getUserCustomIngredients(uid).catch(() => []);
    }
    if (uid && typeof window.getUserCustomRecipes === 'function') {
      firestoreRecipes = await window.getUserCustomRecipes(uid).catch(() => []);
    }
  } catch (e) {
    console.warn('Firestore user custom read fallback:', e);
  }

  // Combine public catalog + user's custom additions into unified lists
  const ingMap = new Map();
  if (Array.isArray(defaultIngredients)) defaultIngredients.forEach(i => i && i.id && ingMap.set(i.id, i));
  if (Array.isArray(localCustomIngredients)) localCustomIngredients.forEach(i => i && i.id && ingMap.set(i.id, i));
  if (Array.isArray(firestoreIngredients)) firestoreIngredients.forEach(i => i && i.id && ingMap.set(i.id, i));

  const recMap = new Map();
  if (Array.isArray(defaultRecipes)) defaultRecipes.forEach(r => r && r.id && recMap.set(r.id, r));
  if (Array.isArray(localCustomRecipes)) localCustomRecipes.forEach(r => r && r.id && recMap.set(r.id, r));
  if (Array.isArray(firestoreRecipes)) firestoreRecipes.forEach(r => r && r.id && recMap.set(r.id, r));

  return {
    ingredients: Array.from(ingMap.values()),
    recipes: Array.from(recMap.values())
  };
}

// Calculate total recipe macros based on ingredient macros dynamically
function calculateRecipeMacros(recipe, ingredientsList) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(ingredientsList)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  recipe.ingredients.forEach(reqIng => {
    if (!reqIng || !reqIng.ingredientId) return;
    const ingInfo = ingredientsList.find(i => i && i.id === reqIng.ingredientId);
    if (ingInfo && ingInfo.macros) {
      const ratio = ingInfo.macroBaseAmount ? (reqIng.amount / ingInfo.macroBaseAmount) : 1;
      
      calories += (ingInfo.macros.calories || 0) * ratio;
      protein += (ingInfo.macros.protein || 0) * ratio;
      carbs += (ingInfo.macros.carbs || 0) * ratio;
      fat += (ingInfo.macros.fat || 0) * ratio;
    }
  });

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
}

// Initialize navigation dropdown menu across pages
function initNavDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(dropdown => {
    const btn = dropdown.querySelector('.nav-dropdown-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other dropdowns if any
      dropdowns.forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });

      dropdown.classList.toggle('open');
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    dropdowns.forEach(d => d.classList.remove('open'));
  });
}

window.addEventListener('DOMContentLoaded', initNavDropdowns);
