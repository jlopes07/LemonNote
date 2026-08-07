// Shared utility functions and state persistence

// Global Constants & State
const PANTRY_KEY = 'lemonNote_pantry_v1';
const CUSTOM_ING_KEY = 'lemonNote_custom_ingredients_v1';
const CUSTOM_REC_KEY = 'lemonNote_custom_recipes_v1';
const FAVORITES_KEY = 'lemonNote_favorites_v1';

// Pantry counter helper
function updateGlobalPantryBadge() {
  const pantry = getPantry();
  const count = pantry ? pantry.size : 0;
  const badgeEls = document.querySelectorAll('#selected-count, .selected-count');
  badgeEls.forEach(el => {
    el.textContent = count;
  });
}
window.updateGlobalPantryBadge = updateGlobalPantryBadge;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', updateGlobalPantryBadge);
  window.addEventListener('userAuthReady', updateGlobalPantryBadge);
  window.addEventListener('load', updateGlobalPantryBadge);
}

// Favorites Helpers
function getFavorites() {
  const saved = localStorage.getItem(FAVORITES_KEY);
  return saved ? new Set(JSON.parse(saved)) : new Set();
}

function saveFavorites(favoritesSet) {
  const arr = Array.from(favoritesSet);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
}

function toggleFavorite(recipeId) {
  const favorites = getFavorites();
  if (favorites.has(recipeId)) {
    favorites.delete(recipeId);
  } else {
    favorites.add(recipeId);
  }
  saveFavorites(favorites);
  return favorites.has(recipeId);
}

window.getFavorites = getFavorites;
window.saveFavorites = saveFavorites;
window.toggleFavorite = toggleFavorite;

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

// Global Theme Controller (Claro, Escuro, Sistema)
function getThemeSetting() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system'; // Default for new users
}

function getEffectiveTheme(settingMode) {
  const mode = settingMode || getThemeSetting();
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return mode === 'light' ? 'light' : 'dark';
}

function setTheme(themeMode) {
  const validMode = (themeMode === 'light' || themeMode === 'dark' || themeMode === 'system') ? themeMode : 'system';
  localStorage.setItem(THEME_KEY, validMode);

  const effectiveTheme = getEffectiveTheme(validMode);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-theme-setting', validMode);
    
    if (effectiveTheme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { setting: validMode, effectiveTheme } }));
  }
}

// Backward compatibility helper
function getTheme() {
  return getThemeSetting();
}

function initTheme() {
  const currentSetting = getThemeSetting();
  setTheme(currentSetting);

  // Listen to system color scheme preference changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (getThemeSetting() === 'system') {
        setTheme('system');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }
}

window.getThemeSetting = getThemeSetting;
window.getEffectiveTheme = getEffectiveTheme;
window.getTheme = getTheme;
window.setTheme = setTheme;
window.initTheme = initTheme;

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
  if (!ing || !ing.id) return false;
  const uid = getCurrentUserScope();

  // Check if ingredient is linked to any recipe created by the current user
  let userRecipes = [];
  try {
    const appData = await loadAppData();
    userRecipes = appData.recipes || [];
  } catch (e) {
    userRecipes = getCustomRecipes();
  }

  const linkedRecipes = userRecipes.filter(recipe => {
    // Only check recipes owned/created by the current user
    const isOwner = (recipe.userId === uid) || (!recipe.userId && recipe.isCustom);
    if (!isOwner) return false;

    if (!Array.isArray(recipe.ingredients)) return false;
    return recipe.ingredients.some(reqIng => reqIng && (reqIng.ingredientId === ing.id || reqIng.id === ing.id));
  });

  if (linkedRecipes.length > 0) {
    const recipeNames = linkedRecipes.map(r => `"${r.name}"`).join(', ');
    alert(`Não é possível excluir o ingrediente "${ing.name}" pois ele está sendo utilizado na(s) seguinte(s) receita(s): ${recipeNames}. Remova o ingrediente da(s) receita(s) ou exclua a(s) receita(s) primeiro.`);
    return false;
  }

  // Remove from localStorage
  const localCustom = getCustomIngredients().filter(i => i.id !== ing.id);
  localStorage.setItem(getCustomIngredientsKey(), JSON.stringify(localCustom));

  // Remove from Firestore
  if (ing.isPublic && typeof window.deletePublicIngredient === 'function') {
    await window.deletePublicIngredient(ing.id);
  } else if (uid && typeof window.deleteUserCustomIngredient === 'function') {
    await window.deleteUserCustomIngredient(uid, ing.id);
  }

  return true;
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

// Calculate total recipe macros based on ingredient macros dynamically using UnitConverter
function calculateRecipeMacros(recipe, ingredientsList) {
  if (!recipe || !Array.isArray(recipe.ingredients)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  if (typeof UnitConverter !== 'undefined' && typeof UnitConverter.calculateRecipeTotals === 'function') {
    return UnitConverter.calculateRecipeTotals(recipe.ingredients, ingredientsList || []);
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  recipe.ingredients.forEach(reqIng => {
    if (!reqIng || (!reqIng.ingredientId && !reqIng.id)) return;
    const targetId = reqIng.ingredientId || reqIng.id;
    let ingInfo = (ingredientsList || []).find(i => i && i.id === targetId);
    if (!ingInfo && reqIng.macros) {
      ingInfo = reqIng;
    }
    if (ingInfo && ingInfo.macros) {
      const refAmount = ingInfo.macroBaseAmount || 100;
      const ingAmt = reqIng.baseAmount !== undefined ? reqIng.baseAmount : (reqIng.amount || 0);
      const ratio = ingAmt / refAmount;
      
      calories += (ingInfo.macros.calories || 0) * ratio;
      protein += (ingInfo.macros.protein || 0) * ratio;
      carbs += (ingInfo.macros.carbs || 0) * ratio;
      fat += (ingInfo.macros.fat || 0) * ratio;
    }
  });

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10
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

/* ==========================================================================
   IN-APP TOAST NOTIFICATION & CONFIRM MODAL SYSTEM
   ========================================================================== */

function showToast(message, type = 'info', duration = 3500) {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');

  // Detect type based on keywords if not explicitly specified
  let toastType = type;
  const msgLower = (message || '').toString().toLowerCase();
  if (type === 'info') {
    if (msgLower.includes('sucesso') || msgLower.includes('cadastrada') || msgLower.includes('salvo') || msgLower.includes('enviado')) {
      toastType = 'success';
    } else if (msgLower.includes('erro') || msgLower.includes('⚠️') || msgLower.includes('não é possível') || msgLower.includes('obrigatório') || msgLower.includes('já foi') || msgLower.includes('preencha')) {
      toastType = 'error';
    }
  }

  toast.className = `toast-notification toast-${toastType}`;

  let iconSymbol = 'ℹ️';
  if (toastType === 'success') {
    iconSymbol = '✓';
  } else if (toastType === 'error' || toastType === 'warning') {
    iconSymbol = '⚠️';
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSymbol}</div>
    <div class="toast-content">${message}</div>
    <button type="button" class="toast-close-btn" aria-label="Fechar">&times;</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn');
  let autoCloseTimer;

  const removeToast = () => {
    if (toast.classList.contains('toast-hiding')) return;
    toast.classList.add('toast-hiding');
    clearTimeout(autoCloseTimer);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };

  closeBtn.addEventListener('click', removeToast);
  autoCloseTimer = setTimeout(removeToast, duration);

  container.appendChild(toast);
}

function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';

    const title = options.title || 'Confirmação';
    const confirmText = options.confirmText || 'Confirmar';
    const cancelText = options.cancelText || 'Cancelar';
    const isDanger = options.danger !== false;

    overlay.innerHTML = `
      <div class="app-confirm-box">
        <div class="app-confirm-header">
          <span class="app-confirm-title">${title}</span>
          <button type="button" class="toast-close-btn btn-close-modal" style="font-size:22px;">&times;</button>
        </div>
        <div class="app-confirm-body">${message}</div>
        <div class="app-confirm-actions">
          <button type="button" class="btn-confirm-cancel">${cancelText}</button>
          <button type="button" class="btn-confirm-ok" style="${isDanger ? 'background:var(--danger, #ef4444);' : 'background:var(--accent);'}">${confirmText}</button>
        </div>
      </div>
    `;

    const closeModal = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('.btn-confirm-cancel').addEventListener('click', () => closeModal(false));
    overlay.querySelector('.btn-close-modal').addEventListener('click', () => closeModal(false));
    overlay.querySelector('.btn-confirm-ok').addEventListener('click', () => closeModal(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(false);
    });

    document.body.appendChild(overlay);
  });
}

window.showToast = showToast;
window.showConfirm = showConfirm;

// Override native window.alert to use in-app toasts seamlessly
if (typeof window !== 'undefined') {
  window.alert = function(msg) {
    showToast(msg);
  };
}

