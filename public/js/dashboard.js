// Dashboard Home Controller (index.html)

let foodLogs = [];
let waterLogs = [];
let recipeMatches = 0;
let healthGoals = {
  calories: 2000,
  water: 2000
};

const dom = {
  userGreetingName: document.getElementById('user-greeting-name'),
  dashboardDate: document.getElementById('dashboard-date'),
  
  // Progress elements
  calGoalLabel: document.getElementById('cal-goal-label'),
  calCurrentLabel: document.getElementById('cal-current-label'),
  calPercentLabel: document.getElementById('cal-percent-label'),
  calRemainingLabel: document.getElementById('cal-remaining-label'),
  calProgressFill: document.getElementById('cal-progress-fill'),

  waterGoalLabel: document.getElementById('water-goal-label'),
  waterCurrentLabel: document.getElementById('water-current-label'),
  waterPercentLabel: document.getElementById('water-percent-label'),
  waterRemainingLabel: document.getElementById('water-remaining-label'),
  waterProgressFill: document.getElementById('water-progress-fill'),
  
  recipesMatchText: document.getElementById('recipes-match-text'),
  recipesMatchSubtext: document.getElementById('recipes-match-subtext'),
  quoteDisplay: document.getElementById('quote-display')
};

const HEALTH_QUOTES = [
  "\"Alimentação saudável não é sobre limitações estritas, mas sim sobre se sentir bem e ter mais energia!\"",
  "\"A água regula quase todas as funções do seu corpo. Beba água para se manter ativo e focado!\"",
  "\"Pequenas escolhas diárias acumulam grandes resultados ao longo do tempo. Escolha alimentos naturais!\"",
  "\"A melhor receita é aquela feita com ingredientes de verdade e amor próprio. Planeje suas refeições!\"",
  "\"Macronutrientes equilibrados mantêm a saciedade e a energia estável ao longo de todo o dia.\"",
  "\"Pronto para um novo dia? Organize sua despensa para fazer escolhas alimentares mais fáceis e saudáveis!\""
];

async function init() {
  updateDashboardDate();
  showRandomQuote();

  // Listen to user auth load
  window.addEventListener('userAuthReady', async (e) => {
    const user = e.detail?.user;
    updateGreeting(user);
    await loadDashboardData();
  });

  // Direct load if auth is already resolved
  if (window._currentUser || localStorage.getItem('lemonNote_is_authenticated') === 'true') {
    updateGreeting(window._currentUser);
    await loadDashboardData();
  }
}

function updateDashboardDate() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  let formatted = new Date().toLocaleDateString('pt-BR', options);
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  if (dom.dashboardDate) {
    dom.dashboardDate.textContent = formatted;
  }
}

function showRandomQuote() {
  if (dom.quoteDisplay) {
    const index = Math.floor(Math.random() * HEALTH_QUOTES.length);
    dom.quoteDisplay.textContent = HEALTH_QUOTES[index];
  }
}

function updateGreeting(user) {
  if (dom.userGreetingName) {
    if (user) {
      const name = user.displayName || user.email.split('@')[0];
      // Capitalize first letter
      dom.userGreetingName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    } else {
      dom.userGreetingName.textContent = 'Usuário';
    }
  }
}

async function loadDashboardData() {
  const uid = getCurrentUserScope();
  
  // 1. Load Goals
  const localGoals = localStorage.getItem(`lemonNote_health_goals_${uid}`);
  if (localGoals) {
    try { healthGoals = JSON.parse(localGoals); } catch (e) {}
  }
  
  if (typeof window.getUserHealthGoals === 'function') {
    const fireGoals = await window.getUserHealthGoals(uid);
    if (fireGoals) {
      healthGoals = fireGoals;
      localStorage.setItem(`lemonNote_health_goals_${uid}`, JSON.stringify(healthGoals));
    }
  }

  // 2. Load food/water logs for today
  foodLogs = getLocalLogs('food');
  waterLogs = getLocalLogs('water');

  if (typeof window.getUserFoodLogs === 'function') {
    const fireFoods = await window.getUserFoodLogs(uid).catch(() => []);
    if (fireFoods && fireFoods.length > 0) {
      foodLogs = mergeLogs(foodLogs, fireFoods);
    }
  }

  if (typeof window.getUserWaterLogs === 'function') {
    const fireWaters = await window.getUserWaterLogs(uid).catch(() => []);
    if (fireWaters && fireWaters.length > 0) {
      waterLogs = mergeLogs(waterLogs, fireWaters);
    }
  }

  // 3. Load Pantry Ingredients & Recipes to count matching recipes
  try {
    const appData = await loadAppData();
    const ingredients = appData.ingredients || [];
    const recipes = appData.recipes || [];
    const selectedIngredients = new Set(Array.from(getPantry()));
    
    // Count recipes ready to make (0 ingredients missing)
    let readyCount = 0;
    recipes.forEach(recipe => {
      let missingCount = 0;
      const reqIngredients = (recipe && Array.isArray(recipe.ingredients)) ? recipe.ingredients : [];
      
      reqIngredients.forEach(reqIng => {
        if (!reqIng || !reqIng.ingredientId) return;
        const userHasIt = selectedIngredients.has(reqIng.ingredientId);
        if (!userHasIt) {
          missingCount++;
        }
      });
      
      if (reqIngredients.length > 0 && missingCount === 0) {
        readyCount++;
      }
    });

    recipeMatches = readyCount;
    if (recipeMatches > 0) {
      dom.recipesMatchText.textContent = `${recipeMatches} Receita${recipeMatches !== 1 ? 's' : ''}`;
      dom.recipesMatchSubtext.textContent = 'Prontas para cozinhar!';
      dom.recipesMatchText.style.color = 'var(--accent)';
    } else {
      dom.recipesMatchText.textContent = 'Nenhuma Pronta';
      dom.recipesMatchSubtext.textContent = 'Marque itens na despensa';
      dom.recipesMatchText.style.color = 'var(--text-muted)';
    }
  } catch (e) {
    console.warn('Erro ao carregar combinacoes de receitas no dashboard', e);
  }

  renderDashboardProgress();
}

function mergeLogs(localList, dbList) {
  const map = new Map();
  localList.forEach(log => map.set(log.id, log));
  dbList.forEach(log => map.set(log.id, log));
  return Array.from(map.values());
}

function getLocalLogs(type) {
  const uid = getCurrentUserScope();
  const saved = localStorage.getItem(`lemonNote_${type}_logs_${uid}`);
  return saved ? JSON.parse(saved) : [];
}

function getDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function renderDashboardProgress() {
  const dateStr = getDateString(new Date());

  const todayFoods = foodLogs.filter(f => f.dateStr === dateStr);
  const todayWaters = waterLogs.filter(w => w.dateStr === dateStr);

  let totalCalories = 0;
  todayFoods.forEach(f => totalCalories += f.calories || 0);

  let totalWater = 0;
  todayWaters.forEach(w => totalWater += w.amount || 0);

  // Render Calories
  const calPercent = Math.min(100, Math.round((totalCalories / healthGoals.calories) * 100)) || 0;
  dom.calGoalLabel.textContent = `Meta: ${healthGoals.calories} kcal`;
  dom.calCurrentLabel.textContent = `${totalCalories} kcal`;
  dom.calPercentLabel.textContent = `${calPercent}%`;
  dom.calProgressFill.style.width = `${calPercent}%`;

  const calRemaining = healthGoals.calories - totalCalories;
  if (calRemaining > 0) {
    dom.calRemainingLabel.textContent = `Faltam ${calRemaining} kcal`;
    dom.calRemainingLabel.style.color = 'var(--text-muted)';
  } else {
    dom.calRemainingLabel.textContent = `Meta atingida! (+${Math.abs(calRemaining)} kcal)`;
    dom.calRemainingLabel.style.color = 'var(--success)';
  }

  // Render Water
  const waterPercent = Math.min(100, Math.round((totalWater / healthGoals.water) * 100)) || 0;
  dom.waterGoalLabel.textContent = `Meta: ${healthGoals.water} ml`;
  dom.waterCurrentLabel.textContent = `${totalWater} ml`;
  dom.waterPercentLabel.textContent = `${waterPercent}%`;
  dom.waterProgressFill.style.width = `${waterPercent}%`;

  const waterRemaining = healthGoals.water - totalWater;
  if (waterRemaining > 0) {
    dom.waterRemainingLabel.textContent = `Faltam ${waterRemaining} ml`;
    dom.waterRemainingLabel.style.color = '#60a5fa';
  } else {
    dom.waterRemainingLabel.textContent = 'Meta de água atingida! 🥤';
    dom.waterRemainingLabel.style.color = 'var(--success)';
  }
}

// Auto run init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
