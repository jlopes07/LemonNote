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

function updateGlobalPantryBadge() {
  const saved = localStorage.getItem(PANTRY_KEY);
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
  const saved = localStorage.getItem(PANTRY_KEY);
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
  localStorage.setItem(PANTRY_KEY, JSON.stringify(arr));
  updateGlobalPantryBadge();
}

// Custom items storage helpers
function getCustomIngredients() {
  const saved = localStorage.getItem(CUSTOM_ING_KEY);
  return saved ? JSON.parse(saved) : [];
}

async function saveCustomIngredient(ing) {
  // Salva no localStorage para redundância local
  const custom = getCustomIngredients();
  custom.push(ing);
  localStorage.setItem(CUSTOM_ING_KEY, JSON.stringify(custom));

  // Tenta persistir no Banco de Dados local SQLite via API backend
  try {
    await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ing)
    });
  } catch (e) {
    console.warn('Backend API não disponível, mantido apenas no localStorage local.', e);
  }
}

function getCustomRecipes() {
  const saved = localStorage.getItem(CUSTOM_REC_KEY);
  return saved ? JSON.parse(saved) : [];
}

async function saveCustomRecipe(rec) {
  // Salva no localStorage para redundância local
  const custom = getCustomRecipes();
  custom.push(rec);
  localStorage.setItem(CUSTOM_REC_KEY, JSON.stringify(custom));

  // Tenta persistir no Banco de Dados local SQLite via API backend
  try {
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec)
    });
  } catch (e) {
    console.warn('Backend API não disponível, mantido apenas no localStorage local.', e);
  }
}

// Fetch data from local SQLite database API (with fallback to JSON files)
async function loadAppData() {
  try {
    // Tenta carregar do banco de dados local SQLite via API
    const [ingRes, recRes] = await Promise.all([
      fetch('/api/ingredients'),
      fetch('/api/recipes')
    ]);

    if (ingRes.ok && recRes.ok) {
      const dbIngredients = await ingRes.json();
      const dbRecipes = await recRes.json();
      return {
        ingredients: dbIngredients,
        recipes: dbRecipes
      };
    }
  } catch (apiErr) {
    console.info('Servidor API não detectado. Carregando dos arquivos estáticos JSON localmente.', apiErr);
  }

  // Fallback: carregar dos arquivos JSON locais e mesclar com localStorage
  try {
    const [ingRes, recRes] = await Promise.all([
      fetch('data/ingredients.json'),
      fetch('data/recipes.json')
    ]);

    if (!ingRes.ok || !recRes.ok) {
      throw new Error('Erro ao carregar arquivos JSON do banco de dados.');
    }

    const defaultIngredients = await ingRes.json();
    const defaultRecipes = await recRes.json();

    const customIngredients = getCustomIngredients();
    const customRecipes = getCustomRecipes();

    return {
      ingredients: [...defaultIngredients, ...customIngredients],
      recipes: [...defaultRecipes, ...customRecipes]
    };
  } catch (error) {
    console.error('Data loading error:', error);
    throw error;
  }
}

// Calculate total recipe macros based on ingredient macros dynamically
function calculateRecipeMacros(recipe, ingredientsList) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  recipe.ingredients.forEach(reqIng => {
    const ingInfo = ingredientsList.find(i => i.id === reqIng.ingredientId);
    if (ingInfo && ingInfo.macros) {
      // ratio = quantity used in recipe / base quantity defined in ingredients
      const ratio = reqIng.amount / ingInfo.macroBaseAmount;
      
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
