// Reports and evolution tracker controller (reports.html)

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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dom = {
  avgCalories: document.getElementById('avg-calories'),
  avgCaloriesGoal: document.getElementById('avg-calories-goal'),
  totalWater: document.getElementById('total-water'),
  avgWater: document.getElementById('avg-water'),
  latestWeight: document.getElementById('latest-weight'),
  weightTrend: document.getElementById('weight-trend'),
  caloriesChart: document.getElementById('calories-chart-container'),
  waterChart: document.getElementById('water-chart-container'),
  evolutionTableBody: document.getElementById('evolution-table-body')
};

async function init() {
  // Listen to user auth load
  window.addEventListener('userAuthReady', async () => {
    await loadAllLogs();
  });

  // Direct load if auth is already resolved
  if (window._currentUser || localStorage.getItem('lemonNote_is_authenticated') === 'true') {
    await loadAllLogs();
  }
}

async function loadAllLogs() {
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

  // 2. Load lists
  foodLogs = getLocalLogs('food');
  waterLogs = getLocalLogs('water');
  weightLogs = getLocalLogs('weight');

  if (typeof window.getUserFoodLogs === 'function') {
    const fireFoods = await window.getUserFoodLogs(uid);
    if (fireFoods && fireFoods.length > 0) {
      foodLogs = mergeLogs(foodLogs, fireFoods);
    }
  }

  if (typeof window.getUserWaterLogs === 'function') {
    const fireWaters = await window.getUserWaterLogs(uid);
    if (fireWaters && fireWaters.length > 0) {
      waterLogs = mergeLogs(waterLogs, fireWaters);
    }
  }

  if (typeof window.getUserWeightLogs === 'function') {
    const fireWeights = await window.getUserWeightLogs(uid);
    if (fireWeights && fireWeights.length > 0) {
      weightLogs = mergeLogs(weightLogs, fireWeights);
    }
  }

  renderReports();
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

// Date generator for last 7 days
function getLast7Days() {
  const list = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(d);
  }
  return list;
}

function getDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function renderReports() {
  const daysList = getLast7Days();
  const dailyCalories = [];
  const dailyWater = [];

  // Gather stats for last 7 days
  daysList.forEach(date => {
    const dateStr = getDateString(date);
    
    // Sum food calories
    const dayFoods = foodLogs.filter(f => f.dateStr === dateStr);
    let kcal = 0;
    dayFoods.forEach(f => kcal += f.calories || 0);
    dailyCalories.push({ date, dateStr, value: kcal });

    // Sum water
    const dayWaters = waterLogs.filter(w => w.dateStr === dateStr);
    let ml = 0;
    dayWaters.forEach(w => ml += w.amount || 0);
    dailyWater.push({ date, dateStr, value: ml });
  });

  // 1. Process Calories Statistics
  const sumCalories = dailyCalories.reduce((sum, d) => sum + d.value, 0);
  const avgCalVal = Math.round(sumCalories / 7);
  dom.avgCalories.textContent = `${avgCalVal} kcal`;
  dom.avgCaloriesGoal.textContent = `Meta Diária: ${healthGoals.calories} kcal`;

  // 2. Process Water Statistics
  const sumWater = dailyWater.reduce((sum, d) => sum + d.value, 0);
  const avgWaterVal = Math.round(sumWater / 7);
  dom.totalWater.textContent = `${(sumWater / 1000).toFixed(1)} Litros`;
  dom.avgWater.textContent = `Média: ${avgWaterVal} ml/dia`;

  // 3. Process Weight Highlights & Trend
  const sortedWeights = [...weightLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (sortedWeights.length > 0) {
    const latest = sortedWeights[sortedWeights.length - 1];
    dom.latestWeight.textContent = `${latest.weight} kg`;
    
    if (sortedWeights.length > 1) {
      const prev = sortedWeights[sortedWeights.length - 2];
      const diff = latest.weight - prev.weight;
      if (diff < 0) {
        dom.weightTrend.textContent = `Perda de ${Math.abs(diff).toFixed(1)} kg desde o último registro`;
        dom.weightTrend.style.color = 'var(--success)';
      } else if (diff > 0) {
        dom.weightTrend.textContent = `Ganho de ${diff.toFixed(1)} kg desde o último registro`;
        dom.weightTrend.style.color = '#ef4444';
      } else {
        dom.weightTrend.textContent = 'Peso estável';
        dom.weightTrend.style.color = 'var(--text-muted)';
      }
    } else {
      dom.weightTrend.textContent = 'Métricas iniciadas';
    }
  } else {
    dom.latestWeight.textContent = '-- kg';
    dom.weightTrend.textContent = 'Nenhum registro recente';
  }

  // 4. Render Calorie Bar Chart
  renderBarChart(dom.caloriesChart, dailyCalories, healthGoals.calories, 'kcal', 'linear-gradient(180deg, var(--accent-light), var(--accent))');
  
  // 5. Render Water Bar Chart
  renderBarChart(dom.waterChart, dailyWater, healthGoals.water, 'ml', 'linear-gradient(180deg, #60a5fa, #3b82f6)');

  // 6. Render Weight Evolution Table
  renderEvolutionTable(sortedWeights);
}

function renderBarChart(container, data, goal, unit, backgroundStyle) {
  if (!container) return;

  const maxValue = Math.max(...data.map(d => d.value), goal, 500);

  container.innerHTML = '';
  
  data.forEach(d => {
    const barCol = document.createElement('div');
    barCol.className = 'chart-bar-col';
    
    const percentage = maxValue > 0 ? (d.value / maxValue) * 82 : 0;
    const goalPercentage = goal > 0 ? Math.round((d.value / goal) * 100) : 0;
    
    const labelDateStr = `${d.date.getDate()}/${String(d.date.getMonth() + 1).padStart(2, '0')}`;
    const weekdayName = WEEKDAYS[d.date.getDay()];

    barCol.innerHTML = `
      <span class="chart-bar-value" style="font-size: 10px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; z-index: 2;">${d.value}</span>
      <div class="chart-bar-fill" style="height: ${percentage}%; background: ${backgroundStyle};"></div>
      <div class="chart-bar-tooltip">
        <strong>${d.value} ${unit}</strong> (${goalPercentage}%)<br/>
        <span style="font-size:10px; color:var(--text-muted);">${d.date.toLocaleDateString('pt-BR')}</span>
      </div>
      <div class="chart-bar-label">
        <span>${weekdayName}</span><br/>
        <span style="font-size:9px; color:var(--text-muted);">${labelDateStr}</span>
      </div>
    `;
    
    container.appendChild(barCol);
  });
}

function renderEvolutionTable(sortedWeightsList) {
  if (!dom.evolutionTableBody) return;

  if (sortedWeightsList.length === 0) {
    dom.evolutionTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
          Nenhum registro físico encontrado. Adicione seu peso no diário para acompanhar!
        </td>
      </tr>
    `;
    return;
  }

  dom.evolutionTableBody.innerHTML = '';
  // Show list most recent first
  const listToRender = [...sortedWeightsList].reverse();

  listToRender.forEach((log, index) => {
    const row = document.createElement('tr');
    
    const date = new Date(log.timestamp);
    const dateFormatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    
    let trendBadge = `<span class="trend-badge trend-stable">Estável</span>`;
    
    // Compare with the logically previous weight log (next item in list since list is reversed)
    const prevLogIndex = index + 1;
    if (prevLogIndex < listToRender.length) {
      const prevLog = listToRender[prevLogIndex];
      const diff = log.weight - prevLog.weight;
      if (diff < 0) {
        trendBadge = `<span class="trend-badge trend-down">↓ ${Math.abs(diff).toFixed(1)} kg</span>`;
      } else if (diff > 0) {
        trendBadge = `<span class="trend-badge trend-up">↑ ${diff.toFixed(1)} kg</span>`;
      }
    } else {
      trendBadge = `<span class="trend-badge trend-stable">Inicial</span>`;
    }

    row.innerHTML = `
      <td data-label="Data" style="font-weight:600;">${dateFormatted}</td>
      <td data-label="Peso" style="font-weight:700; color:var(--text-heading);">${log.weight} kg</td>
      <td data-label="Gordura">${log.bodyFat ? `${log.bodyFat}%` : '--'}</td>
      <td data-label="Músculo">${log.muscleMass ? `${log.muscleMass}%` : '--'}</td>
      <td data-label="Tendência">${trendBadge}</td>
    `;
    
    dom.evolutionTableBody.appendChild(row);
  });
}

// Auto run init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
