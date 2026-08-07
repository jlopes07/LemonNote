// Recipes list logic (recipes.html)

let ingredients = [];
let recipes = [];
let selectedIngredients = new Set();
let activeFilter = 'all';

const dom = {
  selectedCount: document.getElementById('selected-count'),
  recipesSubCount: document.getElementById('recipes-sub-count'),
  recipesContainer: document.getElementById('recipes-container'),
  filterTabs: document.querySelectorAll('.filter-tab')
};

async function init() {
  try {
    const data = await loadAppData();
    ingredients = data.ingredients;
    recipes = data.recipes;
    selectedIngredients = getPantry();

    setupEventListeners();
    updateHeaderBadge();
    updateRecipes();
  } catch (error) {
    console.error('Initialization error:', error);
    dom.recipesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Erro ao carregar dados</h3>
        <p>Não foi possível carregar as receitas do banco de dados.</p>
      </div>
    `;
  }
}

function setupEventListeners() {
  dom.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      updateRecipes();
    });
  });
}

function updateHeaderBadge() {
  if (dom.selectedCount) {
    dom.selectedCount.textContent = selectedIngredients.size;
  }
}

function updateRecipes() {
  const hasIngredients = selectedIngredients.size > 0;

  if (!hasIngredients) {
    renderEmptyState();
    return;
  }

  // Calculate Match Score and dynamic macros for each recipe
  const matchedRecipes = recipes.map(recipe => {
    let matchedCount = 0;
    const have = [];
    const missing = [];
    const reqIngredients = (recipe && Array.isArray(recipe.ingredients)) ? recipe.ingredients : [];

    reqIngredients.forEach(reqIng => {
      if (!reqIng || !reqIng.ingredientId) return;
      const userHasIt = selectedIngredients.has(reqIng.ingredientId);
      const ingredientObj = ingredients.find(i => i && i.id === reqIng.ingredientId);
      const ingName = ingredientObj ? ingredientObj.name : reqIng.ingredientId;

      if (userHasIt) {
        matchedCount++;
        have.push(ingName);
      } else {
        missing.push(ingName);
      }
    });

    const totalCount = reqIngredients.length;
    const matchPercentage = totalCount > 0 ? (matchedCount / totalCount) * 100 : 0;
    const missingCount = totalCount - matchedCount;

    // Calculate dynamic macros per base serving of this recipe
    const computedMacros = calculateRecipeMacros(recipe, ingredients);

    return {
      ...recipe,
      matchedCount,
      totalCount,
      matchPercentage,
      missingCount,
      have,
      missing,
      computedMacros
    };
  });

  // Filter according to selected tab
  let filtered = matchedRecipes;
  if (activeFilter === 'ready') {
    filtered = matchedRecipes.filter(r => r.missingCount === 0);
  } else if (activeFilter === 'missing-few') {
    filtered = matchedRecipes.filter(r => r.missingCount > 0 && r.missingCount <= 2);
  }

  // Sort: highest match percentage first, then least missing items, then alphabetically
  filtered.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }
    return a.name.localeCompare(b.name);
  });

  renderRecipesList(filtered);
}

function renderEmptyState() {
  dom.recipesSubCount.textContent = 'Sua despensa está vazia.';
  dom.recipesContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🍳</div>
      <h3>Você ainda não selecionou ingredientes</h3>
      <p>Volte para a despensa e marque os ingredientes que tem em casa para receber sugestões personalizadas!</p>
      <a href="index.html" class="btn-primary" style="margin-top: 16px;">Ir para a Despensa</a>
    </div>
  `;
}

function renderRecipesList(recipesList) {
  const totalLength = recipesList.length;
  dom.recipesSubCount.textContent = `Encontramos ${totalLength} receita${totalLength !== 1 ? 's' : ''} correspondente${totalLength !== 1 ? 's' : ''}.`;

  if (totalLength === 0) {
    dom.recipesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Nenhuma receita correspondente encontrada</h3>
        <p>Tente selecionar mais ingredientes básicos na sua despensa, como azeite, sal, alho ou cebola.</p>
        <a href="index.html" class="btn-secondary" style="margin-top: 16px;">Voltar para Despensa</a>
      </div>
    `;
    return;
  }

  dom.recipesContainer.innerHTML = '';

  recipesList.forEach(recipe => {
    const cardLink = document.createElement('a');
    cardLink.className = 'recipe-card-link';
    cardLink.href = `recipe-detail.html?id=${recipe.id}`;
    
    let badgeHTML = '';
    if (recipe.missingCount === 0) {
      badgeHTML = `<span class="badge-tag match-100">✨ Pronta para Fazer</span>`;
    } else if (recipe.missingCount <= 2) {
      badgeHTML = `<span class="badge-tag match-partial">⚠️ Faltam ${recipe.missingCount} item${recipe.missingCount !== 1 ? 'ns' : ''}</span>`;
    } else {
      badgeHTML = `<span class="badge-tag">${recipe.matchedCount}/${recipe.totalCount} Ingredientes</span>`;
    }

    cardLink.innerHTML = `
      <div class="recipe-card">
        <div class="recipe-card-image">
          <div class="recipe-card-badges">
            ${badgeHTML}
            <span class="badge-tag">⏱️ ${recipe.prepTime} min</span>
          </div>
          <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&auto=format&fit=crop&q=80'">
        </div>
        <div class="recipe-card-content">
          <h3>${recipe.name}</h3>
          <p class="desc">${recipe.description}</p>
          
          <div class="card-ingredient-status">
            <strong>Ingredientes:</strong>
            <div class="ingredient-check-list">
              ${recipe.have.slice(0, 3).map(name => `<span class="ing-badge have">✓ ${name}</span>`).join('')}
              ${recipe.missing.slice(0, 3).map(name => `<span class="ing-badge missing">✕ ${name}</span>`).join('')}
              ${recipe.totalCount > 6 ? `<span class="ing-badge" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color)">+ ${recipe.totalCount - 6}</span>` : ''}
            </div>
          </div>

          <div class="card-macros">
            <div class="macro-mini calories-mini">
              <strong>${recipe.computedMacros.calories} kcal</strong>
              <span>Calorias</span>
            </div>
            <div class="macro-mini">
              <strong>${recipe.computedMacros.protein}g</strong>
              <span>Proteínas</span>
            </div>
            <div class="macro-mini">
              <strong>${recipe.computedMacros.carbs}g</strong>
              <span>Carboidratos</span>
            </div>
            <div class="macro-mini">
              <strong>${recipe.computedMacros.fat}g</strong>
              <span>Gorduras</span>
            </div>
          </div>
        </div>
      </div>
    `;

    dom.recipesContainer.appendChild(cardLink);
  });
}

window.addEventListener('userAuthReady', init);

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
