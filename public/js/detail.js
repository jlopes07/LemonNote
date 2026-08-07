// Recipe detail screen logic (recipe-detail.html)

let ingredients = [];
let recipe = null;
let selectedIngredients = new Set();
let currentServings = 1;
let baseServings = 1;

const dom = {
  selectedCount: document.getElementById('selected-count'),
  detailContainer: document.getElementById('detail-container')
};

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('id');

    if (!recipeId) {
      renderError('Nenhuma receita foi selecionada.');
      return;
    }

    const data = await loadAppData();
    ingredients = data.ingredients;
    selectedIngredients = getPantry();

    recipe = data.recipes.find(r => r.id === recipeId);
    if (!recipe) {
      renderError('A receita solicitada não foi encontrada no nosso banco de dados.');
      return;
    }

    baseServings = recipe.servings;
    currentServings = baseServings;

    updateHeaderBadge();
    renderRecipeDetails();
  } catch (error) {
    console.error('Initialization error:', error);
    renderError('Erro ao carregar os dados desta receita.');
  }
}

function updateHeaderBadge() {
  if (dom.selectedCount) {
    dom.selectedCount.textContent = selectedIngredients.size;
  }
}

function renderError(message) {
  dom.detailContainer.innerHTML = `
    <div class="detail-card" style="text-align: center; padding: 60px;">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent); margin-bottom: 20px;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2 style="font-family: var(--font-title); font-size: 24px; margin-bottom: 12px;">Ops! Algo deu errado</h2>
      <p style="color: var(--text-muted); margin-bottom: 24px;">${message}</p>
      <a href="recipes.html" class="btn-primary">Voltar para Receitas</a>
    </div>
  `;
}

function renderRecipeDetails() {
  const baseMacros = calculateRecipeMacros(recipe, ingredients);
  const factor = currentServings / baseServings;
  const currentUid = getCurrentUserScope();
  const isCreator = recipe && recipe.userId && recipe.userId === currentUid;
  const favorites = getFavorites();
  const isFav = recipe && favorites.has(recipe.id);

  dom.detailContainer.innerHTML = `
    <div class="detail-card">
      <div class="detail-grid">
        <!-- Header Info -->
        <div class="detail-header-info">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:12px; flex-wrap:wrap;">
            <div style="display:flex; gap:10px; align-items:center;">
              <span class="badge-tag" style="background: var(--bg-element); color: var(--accent);">${recipe.prepTime} minutos de preparo</span>
              <button type="button" id="btn-fav-recipe-detail" style="background:var(--bg-element); color:${isFav ? '#f59e0b' : 'var(--text-muted)'}; border:1px solid var(--border-color); padding:6px 14px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="${isFav ? '#f59e0b' : 'none'}" stroke="${isFav ? '#f59e0b' : 'currentColor'}" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>${isFav ? 'Favoritada' : 'Favoritar'}</span>
              </button>
            </div>
            ${isCreator ? `<button type="button" id="btn-delete-recipe-detail" style="background:rgba(239,68,68,0.9); color:white; border:none; padding:6px 14px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">Excluir Receita</button>` : ''}
          </div>
          <h2 class="recipe-title">${recipe.name}</h2>
          <p class="recipe-desc">${recipe.description}</p>
        </div>

        <!-- Recipe Image -->
        <div class="recipe-image-container">
          <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&auto=format&fit=crop&q=80'">
        </div>

        <!-- Left Column: Portions & Ingredients -->
        <div class="detail-left-col" style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Portion Control Slider -->
          <div class="portion-control-container">
            <div class="portion-header">
              <span class="portion-label">Ajustar Rendimento (Porções)</span>
              <div class="portion-counter">
                <button class="btn-counter" id="btn-portion-dec">−</button>
                <span class="portion-val" id="label-portion-val">${currentServings}</span>
                <button class="btn-counter" id="btn-portion-inc">+</button>
              </div>
            </div>
            <div class="portion-slider-wrapper">
              <input type="range" class="portion-slider" id="input-portion-slider" min="1" max="12" value="${currentServings}">
            </div>
          </div>

          <!-- Dynamic Ingredients Checklist -->
          <div class="ingredients-section">
            <h3>Ingredientes Necessários</h3>
            <div class="ingredients-list" id="detail-ingredients-list">
              ${recipe.ingredients.map(ing => {
    const scaledQty = ing.amount * factor;
    const hasIt = selectedIngredients.has(ing.ingredientId);
    const ingObj = ingredients.find(i => i.id === ing.ingredientId);
    const name = ingObj ? ingObj.name : (ing.name || ing.ingredientId);
    const formattedQty = Number(scaledQty.toFixed(1)).toString().replace('.', ',');

    return `
                  <div class="ing-item ${hasIt ? 'have-ing' : 'missing-ing'}">
                    <div class="ing-name">
                      <span class="ing-status-icon">${hasIt ? '✓' : '✕'}</span>
                      <span>${name}</span>
                    </div>
                    <span class="ing-qty">${formattedQty} ${ing.unit}</span>
                  </div>
                `;
  }).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Cooking Steps -->
        <div class="detail-right-col">
          <div class="instructions-section">
            <h3>Modo de Preparo</h3>
            <div class="steps-list">
              ${recipe.instructions.map((step, idx) => `
                <div class="step-item" data-step-id="${idx}">
                  <div class="step-checkbox"></div>
                  <div class="step-text">${step}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Full Dynamic Macros Section -->
        <div class="macros-section">
          <h3>Valores Nutricionais Proporcionais</h3>
          
          <div class="macros-bar-container">
            <div class="macro-bar-item calories">
              <span class="macro-bar-label">Energia</span>
              <span class="macro-bar-val" id="macro-calories">${Math.round(baseMacros.calories * factor)} kcal</span>
              <div class="macro-progress-track">
                <div class="macro-progress-fill" id="fill-calories" style="width: ${Math.min(100, ((baseMacros.calories * factor) / 1000) * 100)}%"></div>
              </div>
            </div>
            
            <div class="macro-bar-item protein">
              <span class="macro-bar-label">Proteínas</span>
              <span class="macro-bar-val" id="macro-protein">${Math.round(baseMacros.protein * factor)}g</span>
              <div class="macro-progress-track">
                <div class="macro-progress-fill" id="fill-protein" style="width: ${Math.min(100, ((baseMacros.protein * factor) / 75) * 100)}%"></div>
              </div>
            </div>
            
            <div class="macro-bar-item carbs">
              <span class="macro-bar-label">Carboidratos</span>
              <span class="macro-bar-val" id="macro-carbs">${Math.round(baseMacros.carbs * factor)}g</span>
              <div class="macro-progress-track">
                <div class="macro-progress-fill" id="fill-carbs" style="width: ${Math.min(100, ((baseMacros.carbs * factor) / 150) * 100)}%"></div>
              </div>
            </div>
            
            <div class="macro-bar-item fat">
              <span class="macro-bar-label">Gorduras</span>
              <span class="macro-bar-val" id="macro-fat">${Math.round(baseMacros.fat * factor)}g</span>
              <div class="macro-progress-track">
                <div class="macro-progress-fill" id="fill-fat" style="width: ${Math.min(100, ((baseMacros.fat * factor) / 75) * 100)}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind portion selectors
  const slider = document.getElementById('input-portion-slider');
  const labelVal = document.getElementById('label-portion-val');
  const btnDec = document.getElementById('btn-portion-dec');
  const btnInc = document.getElementById('btn-portion-inc');

  const updatePortions = (newVal) => {
    newVal = Math.max(1, Math.min(12, newVal));
    currentServings = newVal;
    slider.value = newVal;
    labelVal.textContent = newVal;

    const currentFactor = newVal / baseServings;

    // Scale ingredients quantities in DOM
    const ingQtyElements = dom.detailContainer.querySelectorAll('.ing-qty');
    recipe.ingredients.forEach((ing, idx) => {
      const targetEl = ingQtyElements[idx];
      if (targetEl) {
        const scaledQty = ing.amount * currentFactor;
        const formattedQty = Number(scaledQty.toFixed(1)).toString().replace('.', ',');
        targetEl.textContent = `${formattedQty} ${ing.unit}`;
      }
    });

    // Update macros values & fills in DOM
    const caloriesVal = Math.round(baseMacros.calories * currentFactor);
    const proteinVal = Math.round(baseMacros.protein * currentFactor);
    const carbsVal = Math.round(baseMacros.carbs * currentFactor);
    const fatVal = Math.round(baseMacros.fat * currentFactor);

    document.getElementById('macro-calories').textContent = `${caloriesVal} kcal`;
    document.getElementById('macro-protein').textContent = `${proteinVal}g`;
    document.getElementById('macro-carbs').textContent = `${carbsVal}g`;
    document.getElementById('macro-fat').textContent = `${fatVal}g`;

    document.getElementById('fill-calories').style.width = `${Math.min(100, (caloriesVal / 1000) * 100)}%`;
    document.getElementById('macro-protein-fill').style.width = `${Math.min(100, (proteinVal / 80) * 100)}%`;
    document.getElementById('macro-carbs-fill').style.width = `${Math.min(100, (carbsVal / 100) * 100)}%`;
    document.getElementById('macro-fat-fill').style.width = `${Math.min(100, (fatVal / 50) * 100)}%`;
  };

  slider.addEventListener('input', (e) => updatePortions(parseInt(e.target.value)));
  btnDec.addEventListener('click', () => updatePortions(currentServings - 1));
  btnInc.addEventListener('click', () => updatePortions(currentServings + 1));

  const favBtn = document.getElementById('btn-fav-recipe-detail');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      toggleFavorite(recipe.id);
      renderRecipeDetails();
    });
  }

  const deleteBtn = document.getElementById('btn-delete-recipe-detail');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(`Deseja realmente excluir a receita "${recipe.name}"?`, { title: 'Excluir Receita', confirmText: 'Excluir' });
      if (confirmed) {
        await deleteRecipe(recipe);
        window.location.href = 'recipes.html';
      }
    });
  }

  // Interactive instructions checkboxes
  const stepItems = dom.detailContainer.querySelectorAll('.step-item');
  stepItems.forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('checked');
    });
  });
}

window.addEventListener('DOMContentLoaded', init);
