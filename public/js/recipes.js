// Recipes list logic (recipes.html)

let ingredients = [];
let recipes = [];
let selectedIngredients = new Set();
let activeFilter = 'all';

const dom = {
  selectedCount: document.getElementById('selected-count'),
  recipesSubCount: document.getElementById('recipes-sub-count'),
  recipesContainer: document.getElementById('recipes-container'),
  recipeSearch: document.getElementById('recipe-search'),
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

  if (dom.recipeSearch) {
    dom.recipeSearch.addEventListener('input', () => {
      updateRecipes();
    });
  }
}

function updateHeaderBadge() {
  if (typeof window.updateGlobalPantryBadge === 'function') {
    window.updateGlobalPantryBadge();
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
      const ingName = ingredientObj ? ingredientObj.name : (reqIng.name || reqIng.ingredientId);

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
  const favorites = getFavorites();
  const currentUid = getCurrentUserScope();

  if (activeFilter === 'ready') {
    filtered = matchedRecipes.filter(r => r.missingCount === 0);
  } else if (activeFilter === 'missing-few') {
    filtered = matchedRecipes.filter(r => r.missingCount > 0 && r.missingCount <= 2);
  } else if (activeFilter === 'favorites') {
    filtered = matchedRecipes.filter(r => favorites.has(r.id));
  } else if (activeFilter === 'my-recipes') {
    filtered = matchedRecipes.filter(r => r.userId && r.userId === currentUid);
  }

  // Filter according to search query if typed
  const searchQuery = dom.recipeSearch ? dom.recipeSearch.value.trim().toLowerCase() : '';
  if (searchQuery) {
    filtered = filtered.filter(r => {
      const matchName = r.name && r.name.toLowerCase().includes(searchQuery);
      const matchDesc = r.description && r.description.toLowerCase().includes(searchQuery);
      const matchIng = (r.have && r.have.some(n => n.toLowerCase().includes(searchQuery))) ||
                       (r.missing && r.missing.some(n => n.toLowerCase().includes(searchQuery)));
      return matchName || matchDesc || matchIng;
    });
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
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:16px;">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      <h3>Você ainda não selecionou ingredientes</h3>
      <p>Volte para a despensa e marque os ingredientes que tem em casa para receber sugestões personalizadas!</p>
      <a href="pantry.html" class="btn-primary" style="margin-top: 16px;">Ir para a Despensa</a>
    </div>
  `;
}

function renderRecipesList(recipesList) {
  const totalLength = recipesList.length;
  dom.recipesSubCount.textContent = `Encontramos ${totalLength} receita${totalLength !== 1 ? 's' : ''} correspondente${totalLength !== 1 ? 's' : ''}.`;

  if (totalLength === 0) {
    dom.recipesContainer.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:16px;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>Nenhuma receita encontrada</h3>
        <p>Tente ajustar os filtros, selecionar mais ingredientes na despensa ou criar uma nova receita.</p>
        <a href="pantry.html" class="btn-secondary" style="margin-top: 16px;">Voltar para Despensa</a>
      </div>
    `;
    return;
  }

  dom.recipesContainer.innerHTML = '';
  const favorites = getFavorites();

  recipesList.forEach(recipe => {
    const currentUid = getCurrentUserScope();
    const isCreator = recipe.userId && recipe.userId === currentUid;
    const isFav = favorites.has(recipe.id);

    const cardLink = document.createElement('a');
    cardLink.className = 'recipe-card-link';
    cardLink.href = `recipe-detail.html?id=${recipe.id}`;
    
    let badgeHTML = '';
    if (recipe.missingCount === 0) {
      badgeHTML = `<span class="badge-tag match-100">Pronta para Fazer</span>`;
    } else if (recipe.missingCount <= 2) {
      badgeHTML = `<span class="badge-tag match-partial">Faltam ${recipe.missingCount} ${recipe.missingCount === 1 ? 'item' : 'itens'}</span>`;
    } else {
      badgeHTML = `<span class="badge-tag">${recipe.matchedCount}/${recipe.totalCount} Ingredientes</span>`;
    }

    cardLink.innerHTML = `
      <div class="recipe-card" style="position:relative;">
        <div class="recipe-card-image">
          <div class="recipe-card-badges" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; width:100%;">
            ${badgeHTML}
            <span class="badge-tag">${recipe.prepTime} min</span>
            <button type="button" class="btn-fav-recipe" title="Favoritar receita" style="background:rgba(0,0,0,0.6); color:${isFav ? '#f59e0b' : '#9ca3af'}; border:none; padding:4px 8px; border-radius:12px; font-size:12px; cursor:pointer; margin-left:auto; display:inline-flex; align-items:center; z-index:10;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="${isFav ? '#f59e0b' : 'none'}" stroke="${isFav ? '#f59e0b' : 'currentColor'}" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            ${isCreator ? `<button type="button" class="btn-delete-recipe" title="Excluir receita" style="background:rgba(239,68,68,0.9); color:white; border:none; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600; cursor:pointer; z-index:10;">Excluir</button>` : ''}
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

    const favBtn = cardLink.querySelector('.btn-fav-recipe');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleFavorite(recipe.id);
        updateRecipes();
      });
    }

    const deleteBtn = cardLink.querySelector('.btn-delete-recipe');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const confirmed = await showConfirm(`Deseja realmente excluir a receita "${recipe.name}"?`, { title: 'Excluir Receita', confirmText: 'Excluir' });
        if (confirmed) {
          await deleteRecipe(recipe);
          await init();
        }
      });
    }

    dom.recipesContainer.appendChild(cardLink);
  });
}

document.addEventListener('DOMContentLoaded', init);
