// Shared utility functions and state persistence

// LocalStorage keys
const PANTRY_KEY = 'lemonNote_pantry';
const CUSTOM_ING_KEY = 'lemonNote_custom_ingredients';
const CUSTOM_REC_KEY = 'lemonNote_custom_recipes';
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

async function saveCustomIngredient(ing) {
  const uid = getCurrentUserScope();
  ing.userId = uid;
  ing.isCustom = true;

  // Local storage backup
  const custom = getCustomIngredients();
  custom.push(ing);
  localStorage.setItem(getCustomIngredientsKey(), JSON.stringify(custom));

  // Sync with Firebase Firestore
  if (uid && typeof window.saveUserCustomIngredient === 'function') {
    await window.saveUserCustomIngredient(uid, ing);
  }
}

function getCustomRecipes() {
  const saved = localStorage.getItem(getCustomRecipesKey());
  return saved ? JSON.parse(saved) : [];
}

async function saveCustomRecipe(rec) {
  const uid = getCurrentUserScope();
  rec.userId = uid;
  rec.isCustom = true;

  // Local storage backup
  const custom = getCustomRecipes();
  custom.push(rec);
  localStorage.setItem(getCustomRecipesKey(), JSON.stringify(custom));

  // Sync with Firebase Firestore
  if (uid && typeof window.saveUserCustomRecipe === 'function') {
    await window.saveUserCustomRecipe(uid, rec);
  }
}

// Fetch public catalog from Firebase Firestore (with static JSON fallback) and merge with user custom items
async function loadAppData() {
  let defaultIngredients = [];
  let defaultRecipes = [];

  // Always load static JSON catalog as solid baseline fallback
  try {
    const [ingRes, recRes] = await Promise.all([
      fetch('/data/ingredients.json'),
      fetch('/data/recipes.json')
    ]);

    if (ingRes.ok && recRes.ok) {
      defaultIngredients = await ingRes.json();
      defaultRecipes = await recRes.json();
    }
  } catch (error) {
    console.error('Static data loading error:', error);
  }

  // Try reading public catalog from Firebase Firestore (if API is enabled & online)
  try {
    if (typeof window.getPublicIngredientsFromFirestore === 'function') {
      const fsIngs = await window.getPublicIngredientsFromFirestore().catch(() => []);
      if (Array.isArray(fsIngs) && fsIngs.length > 0) {
        defaultIngredients = fsIngs;
      }
    }
    if (typeof window.getPublicRecipesFromFirestore === 'function') {
      const fsRecs = await window.getPublicRecipesFromFirestore().catch(() => []);
      if (Array.isArray(fsRecs) && fsRecs.length > 0) {
        defaultRecipes = fsRecs;
      }
    }
  } catch (e) {
    console.warn('Firestore public catalog read fallback to static JSON:', e);
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
