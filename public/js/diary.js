// Health, nutrition, water and metrics diary controller (diary.html)

let activeSelectedIngredient = null;
let appIngredients = [];
let foodLogs = [];
let waterLogs = [];
let weightLogs = [];
let healthGoals = {
  calories: 2000,
  water: 2000,
  protein: 120,
  carbs: 200,
  fat: 65
};

// Date tracking state
let currentDate = new Date();

const dom = {
  dateDisplay: document.getElementById('date-display'),
  btnPrevDay: document.getElementById('btn-prev-day'),
  btnNextDay: document.getElementById('btn-next-day'),
  
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
  
  macroProtValues: document.getElementById('macro-prot-values'),
  macroProtFill: document.getElementById('macro-prot-fill'),
  macroCarbValues: document.getElementById('macro-carb-values'),
  macroCarbFill: document.getElementById('macro-carb-fill'),
  macroFatValues: document.getElementById('macro-fat-values'),
  macroFatFill: document.getElementById('macro-fat-fill'),
  
  // Tabs and Forms
  tabButtons: document.querySelectorAll('.tab-selector-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  formFood: document.getElementById('form-log-food'),
  formWater: document.getElementById('form-log-water'),
  formBody: document.getElementById('form-log-body'),
  formGoals: document.getElementById('form-health-goals'),
  
  foodInput: document.getElementById('food-input'),
  foodQty: document.getElementById('food-qty'),
  foodUnit: document.getElementById('food-unit'),
  foodCalories: document.getElementById('food-calories'),
  foodProtein: document.getElementById('food-protein'),
  foodCarbs: document.getElementById('food-carbs'),
  foodFat: document.getElementById('food-fat'),
  
  historyContainer: document.getElementById('history-logs-container'),
  historySummaryText: document.getElementById('history-summary-text'),
  
  weightBadge: document.getElementById('latest-weight-badge'),
  weightBadgeVal: document.getElementById('weight-badge-val')
};

// Start Up
async function init() {
  updateDateDisplay();
  setupEventListeners();
  
  // Listen to user auth load
  window.addEventListener('userAuthReady', async () => {
    await loadAllData();
  });

  // Direct load if auth is already resolved
  if (window._currentUser || localStorage.getItem('lemonNote_is_authenticated') === 'true') {
    await loadAllData();
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Date navigation
  dom.btnPrevDay.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    renderDayData();
  });

  dom.btnNextDay.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    renderDayData();
  });

  // Tab switching
  dom.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.tabButtons.forEach(b => b.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Autocomplete & autofill nutrition calculations
  dom.foodInput.addEventListener('input', (e) => {
    const value = e.target.value.trim().toLowerCase();
    const matched = appIngredients.find(ing => ing.name.toLowerCase() === value);
    if (matched) {
      activeSelectedIngredient = matched;
      // Pre-fill base quantity conversion or default 100g
      if (!dom.foodQty.value) {
        dom.foodQty.value = matched.macroBaseAmount || 100;
      }
      calculateAndFillMacros();
    } else {
      activeSelectedIngredient = null;
    }
  });

  dom.foodQty.addEventListener('input', () => {
    if (activeSelectedIngredient) {
      calculateAndFillMacros();
    }
  });

  dom.foodUnit.addEventListener('change', () => {
    if (activeSelectedIngredient) {
      calculateAndFillMacros();
    }
  });

  // Quick water logging buttons
  document.querySelectorAll('.btn-quick-water').forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.dataset.amount);
      if (!amount) return;
      await addWaterLog(amount);
    });
  });

  // Food logging form submit
  dom.formFood.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = dom.foodInput.value.trim();
    const qty = parseFloat(dom.foodQty.value);
    const unit = dom.foodUnit.value;
    const calories = parseFloat(dom.foodCalories.value) || 0;
    const protein = parseFloat(dom.foodProtein.value) || 0;
    const carbs = parseFloat(dom.foodCarbs.value) || 0;
    const fat = parseFloat(dom.foodFat.value) || 0;

    if (!name || isNaN(qty)) {
      alert('Por favor, preencha o nome do alimento e a quantidade.');
      return;
    }

    const logId = `food_log_${Date.now()}`;
    const log = {
      id: logId,
      type: 'food',
      name,
      qty,
      unit,
      calories,
      protein,
      carbs,
      fat,
      dateStr: getDateString(currentDate),
      timestamp: new Date().toISOString()
    };

    foodLogs.push(log);
    saveLocalLogs('food', foodLogs);

    const uid = getCurrentUserScope();
    if (uid && typeof window.saveUserFoodLog === 'function') {
      await window.saveUserFoodLog(uid, log);
    }

    dom.formFood.reset();
    activeSelectedIngredient = null;
    renderDayData();
    showToastNotification('Alimentação registrada com sucesso!');
  });

  // Water logging form submit
  dom.formWater.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = parseInt(document.getElementById('water-qty').value);
    if (isNaN(qty) || qty <= 0) return;
    
    await addWaterLog(qty);
    dom.formWater.reset();
  });

  // Weight metrics form submit
  dom.formBody.addEventListener('submit', async (e) => {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('body-weight').value);
    const bodyFat = parseFloat(document.getElementById('body-fat').value) || null;
    const muscle = parseFloat(document.getElementById('body-muscle').value) || null;

    if (isNaN(weight) || weight <= 0) return;

    const logId = `body_log_${Date.now()}`;
    const log = {
      id: logId,
      type: 'body',
      weight,
      bodyFat,
      muscleMass: muscle,
      dateStr: getDateString(currentDate),
      timestamp: new Date().toISOString()
    };

    weightLogs.push(log);
    saveLocalLogs('weight', weightLogs);

    const uid = getCurrentUserScope();
    if (uid && typeof window.saveUserWeightLog === 'function') {
      await window.saveUserWeightLog(uid, log);
    }

    dom.formBody.reset();
    renderDayData();
    showToastNotification('Métricas corporais atualizadas!');
  });

  // Health goals form submit
  dom.formGoals.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cal = parseInt(document.getElementById('goal-calories').value);
    const water = parseInt(document.getElementById('goal-water').value);
    const prot = parseInt(document.getElementById('goal-protein').value) || 0;
    const carbs = parseInt(document.getElementById('goal-carbs').value) || 0;
    const fat = parseInt(document.getElementById('goal-fat').value) || 0;

    if (isNaN(cal) || isNaN(water)) return;

    healthGoals = { calories: cal, water, protein: prot, carbs, fat };
    
    const uid = getCurrentUserScope();
    localStorage.setItem(`lemonNote_health_goals_${uid}`, JSON.stringify(healthGoals));

    if (uid && typeof window.saveUserHealthGoals === 'function') {
      await window.saveUserHealthGoals(uid, healthGoals);
    }

    renderDayData();
    showToastNotification('Metas nutricionais atualizadas!');
  });
}

// Add water helper
async function addWaterLog(qty) {
  const logId = `water_log_${Date.now()}`;
  const log = {
    id: logId,
    type: 'water',
    amount: qty,
    dateStr: getDateString(currentDate),
    timestamp: new Date().toISOString()
  };

  waterLogs.push(log);
  saveLocalLogs('water', waterLogs);

  const uid = getCurrentUserScope();
  if (uid && typeof window.saveUserWaterLog === 'function') {
    await window.saveUserWaterLog(uid, log);
  }

  renderDayData();
  showToastNotification(`+${qty}ml de água registrados!`, 'info');
}

// Calculate macros based on quantity & selected ingredient conversion factors
function calculateAndFillMacros() {
  if (!activeSelectedIngredient) return;

  const qty = parseFloat(dom.foodQty.value) || 0;
  const unit = dom.foodUnit.value;
  
  // Base values for reference amount (e.g. 100g)
  const baseAmount = activeSelectedIngredient.macroBaseAmount || activeSelectedIngredient.baseAmount || 100;
  const macros = activeSelectedIngredient.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  // Calculate quantity in base unit grams/ml
  let qtyInGrams = qty;
  if (unit !== 'g' && unit !== 'ml' && activeSelectedIngredient.conversions) {
    const conversionFactor = activeSelectedIngredient.conversions[unit] || activeSelectedIngredient.conversions['unidade'] || 1;
    qtyInGrams = qty * conversionFactor;
  }

  const factor = qtyInGrams / baseAmount;

  dom.foodCalories.value = Math.max(0, Math.round(macros.calories * factor));
  dom.foodProtein.value = Math.max(0, parseFloat((macros.protein * factor).toFixed(1)));
  dom.foodCarbs.value = Math.max(0, parseFloat((macros.carbs * factor).toFixed(1)));
  dom.foodFat.value = Math.max(0, parseFloat((macros.fat * factor).toFixed(1)));
}

// Date Formatting Utilities
function getDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function updateDateDisplay() {
  const todayStr = getDateString(new Date());
  const selectedStr = getDateString(currentDate);

  if (selectedStr === todayStr) {
    dom.dateDisplay.textContent = 'Hoje';
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedStr === getDateString(yesterday)) {
      dom.dateDisplay.textContent = 'Ontem';
    } else {
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      let formatted = currentDate.toLocaleDateString('pt-BR', options);
      // Capitalize first letter
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      dom.dateDisplay.textContent = formatted;
    }
  }
}

// Load functions
async function loadAllData() {
  const uid = getCurrentUserScope();
  
  // 1. Load Ingredient Catalog for autocomplete
  try {
    const appData = await loadAppData();
    appIngredients = appData.ingredients || [];
    
    const datalist = document.getElementById('diary-ingredients-datalist');
    if (datalist) {
      datalist.innerHTML = appIngredients.map(ing => `<option value="${ing.name}"></option>`).join('');
    }
  } catch (e) {
    console.warn('Erro cataloging ingredients', e);
  }

  // 2. Load Goals (local storage + firestore sync)
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

  // 3. Load Logs lists
  foodLogs = getLocalLogs('food');
  waterLogs = getLocalLogs('water');
  weightLogs = getLocalLogs('weight');

  if (typeof window.getUserFoodLogs === 'function') {
    const fireFoods = await window.getUserFoodLogs(uid);
    if (fireFoods && fireFoods.length > 0) {
      foodLogs = mergeLogs(foodLogs, fireFoods);
      saveLocalLogs('food', foodLogs);
    }
  }

  if (typeof window.getUserWaterLogs === 'function') {
    const fireWaters = await window.getUserWaterLogs(uid);
    if (fireWaters && fireWaters.length > 0) {
      waterLogs = mergeLogs(waterLogs, fireWaters);
      saveLocalLogs('water', waterLogs);
    }
  }

  if (typeof window.getUserWeightLogs === 'function') {
    const fireWeights = await window.getUserWeightLogs(uid);
    if (fireWeights && fireWeights.length > 0) {
      weightLogs = mergeLogs(weightLogs, fireWeights);
      saveLocalLogs('weight', weightLogs);
    }
  }

  // Populated fields in goals editor form
  document.getElementById('goal-calories').value = healthGoals.calories;
  document.getElementById('goal-water').value = healthGoals.water;
  document.getElementById('goal-protein').value = healthGoals.protein || 0;
  document.getElementById('goal-carbs').value = healthGoals.carbs || 0;
  document.getElementById('goal-fat').value = healthGoals.fat || 0;

  renderDayData();
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

function saveLocalLogs(type, logsArray) {
  const uid = getCurrentUserScope();
  localStorage.setItem(`lemonNote_${type}_logs_${uid}`, JSON.stringify(logsArray));
}

// Render values and details
function renderDayData() {
  const dateStr = getDateString(currentDate);

  // Filter logs for selected day
  const todayFoods = foodLogs.filter(f => f.dateStr === dateStr);
  const todayWaters = waterLogs.filter(w => w.dateStr === dateStr);
  const todayWeights = weightLogs.filter(b => b.dateStr === dateStr);

  // Calculations
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  todayFoods.forEach(f => {
    totalCalories += f.calories || 0;
    totalProtein += f.protein || 0;
    totalCarbs += f.carbs || 0;
    totalFat += f.fat || 0;
  });

  let totalWater = 0;
  todayWaters.forEach(w => {
    totalWater += w.amount || 0;
  });

  // Display latest weight metric logged (any date, most recent first)
  const sortedWeights = [...weightLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (sortedWeights.length > 0) {
    dom.weightBadge.style.display = 'inline-flex';
    const recent = sortedWeights[0];
    let weightVal = `${recent.weight} kg`;
    if (recent.bodyFat) weightVal += ` (BF: ${recent.bodyFat}%)`;
    dom.weightBadgeVal.textContent = weightVal;
  } else {
    dom.weightBadge.style.display = 'none';
  }

  // 1. Render Calories Progress
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

  // 2. Render Water Progress
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

  // 3. Render Macros Progress
  const goalP = healthGoals.protein || 120;
  const goalC = healthGoals.carbs || 200;
  const goalF = healthGoals.fat || 65;

  dom.macroProtValues.textContent = `${totalProtein.toFixed(1)}g / ${goalP}g`;
  dom.macroProtFill.style.width = `${Math.min(100, (totalProtein / goalP) * 100)}%`;

  dom.macroCarbValues.textContent = `${totalCarbs.toFixed(1)}g / ${goalC}g`;
  dom.macroCarbFill.style.width = `${Math.min(100, (totalCarbs / goalC) * 100)}%`;

  dom.macroFatValues.textContent = `${totalFat.toFixed(1)}g / ${goalF}g`;
  dom.macroFatFill.style.width = `${Math.min(100, (totalFat / goalF) * 100)}%`;

  // 4. Render logs list
  const combinedLogs = [];
  todayFoods.forEach(l => combinedLogs.push(l));
  todayWaters.forEach(l => combinedLogs.push(l));
  todayWeights.forEach(l => combinedLogs.push(l));

  // Sort chronologically
  combinedLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const totalLogs = combinedLogs.length;
  dom.historySummaryText.textContent = `${totalLogs} registro${totalLogs !== 1 ? 's' : ''} cadastrado${totalLogs !== 1 ? 's' : ''} nesta data.`;

  if (totalLogs === 0) {
    dom.historyContainer.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 44px; height: 44px; color: var(--text-muted); margin-bottom: 12px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Nenhum registro encontrado para esta data</h3>
        <p>Selecione uma data acima ou utilize os formulários para registrar alimentação, água ou peso corporal.</p>
      </div>
    `;
    return;
  }

  dom.historyContainer.innerHTML = '';
  combinedLogs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'log-item';

    let logHTML = '';
    if (log.type === 'food') {
      logHTML = `
        <div class="log-item-details">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="log-type-tag log-type-food">Alimento</span>
            <span class="log-item-title">${log.name}</span>
          </div>
          <div class="log-item-meta">
            <span class="log-item-meta-item">Qtd: ${log.qty} ${log.unit === 'g' ? 'g' : log.unit === 'ml' ? 'ml' : log.unit}</span>
            <span class="log-item-meta-item" style="color:var(--accent-light); font-weight:700;">${log.calories} kcal</span>
          </div>
          <div class="log-item-macros">
            <span>P: <strong>${log.protein}g</strong></span>
            <span>C: <strong>${log.carbs}g</strong></span>
            <span>G: <strong>${log.fat}g</strong></span>
          </div>
        </div>
      `;
    } else if (log.type === 'water') {
      logHTML = `
        <div class="log-item-details">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="log-type-tag log-type-water">Água</span>
            <span class="log-item-title">Consumo de Água</span>
          </div>
          <div class="log-item-meta">
            <span class="log-item-meta-item" style="color:#60a5fa; font-weight:700;">${log.amount} ml</span>
          </div>
        </div>
      `;
    } else if (log.type === 'body') {
      let compositionText = '';
      if (log.bodyFat) compositionText += `Gordura: ${log.bodyFat}% `;
      if (log.muscleMass) compositionText += `Músculo: ${log.muscleMass}%`;

      logHTML = `
        <div class="log-item-details">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="log-type-tag log-type-weight">Corporal</span>
            <span class="log-item-title">Medição Física</span>
          </div>
          <div class="log-item-meta">
            <span class="log-item-meta-item" style="color:#f59e0b; font-weight:700;">Peso: ${log.weight} kg</span>
            ${compositionText ? `<span class="log-item-meta-item">${compositionText}</span>` : ''}
          </div>
        </div>
      `;
    }

    item.innerHTML = `
      ${logHTML}
      <div class="log-item-actions">
        <button type="button" class="btn-delete-log" data-id="${log.id}" data-type="${log.type}" title="Excluir Registro">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // Bind delete event
    const delBtn = item.querySelector('.btn-delete-log');
    delBtn.addEventListener('click', async () => {
      const type = delBtn.dataset.type;
      const id = delBtn.dataset.id;
      
      const confirmOk = confirm('Deseja realmente excluir este registro?');
      if (!confirmOk) return;

      await deleteLog(type, id);
    });

    dom.historyContainer.appendChild(item);
  });
}

// Delete Log function
async function deleteLog(type, id) {
  const uid = getCurrentUserScope();

  if (type === 'food') {
    foodLogs = foodLogs.filter(f => f.id !== id);
    saveLocalLogs('food', foodLogs);
    if (uid && typeof window.deleteUserFoodLog === 'function') {
      await window.deleteUserFoodLog(uid, id);
    }
  } else if (type === 'water') {
    waterLogs = waterLogs.filter(w => w.id !== id);
    saveLocalLogs('water', waterLogs);
    if (uid && typeof window.deleteUserWaterLog === 'function') {
      await window.deleteUserWaterLog(uid, id);
    }
  } else if (type === 'body') {
    weightLogs = weightLogs.filter(b => b.id !== id);
    saveLocalLogs('weight', weightLogs);
    if (uid && typeof window.deleteUserWeightLog === 'function') {
      await window.deleteUserWeightLog(uid, id);
    }
  }

  renderDayData();
  showToastNotification('Registro excluído com sucesso!', 'warning');
}

// Toast helper
function showToastNotification(msg, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    // Basic fallback alert
    console.log(`[Toast ${type}] ${msg}`);
  }
}

// Auto run init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
