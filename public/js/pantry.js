// Pantry screen logic (index.html)

let ingredients = [];
let selectedIngredients = new Set();

const dom = {
  selectedCount: document.getElementById('selected-count'),
  btnClearPantry: document.getElementById('btn-clear-pantry'),
  pantrySearch: document.getElementById('pantry-search'),
  ingredientsContainer: document.getElementById('ingredients-container'),
  selectedTagsContainer: document.getElementById('selected-tags-container'),
  emptySelection: document.getElementById('empty-selection'),
  btnSubmit: document.getElementById('btn-submit')
};

async function init() {
  try {
    const data = await loadAppData();
    ingredients = data.ingredients;
    selectedIngredients = getPantry();

    setupEventListeners();
    renderPantry();
    updateSelectionPanel();
  } catch (error) {
    console.error('Initialization error:', error);
    dom.ingredientsContainer.innerHTML = `
      <div class="loading-spinner" style="color: var(--danger)">
        Erro ao inicializar despensa. Por favor tente novamente.
      </div>
    `;
  }
}

function setupEventListeners() {
  // Clear Pantry Selection
  dom.btnClearPantry.addEventListener('click', () => {
    selectedIngredients.clear();
    savePantry(selectedIngredients);
    
    // Uncheck boxes in DOM
    const checkboxes = dom.ingredientsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Reset category highlight classes
    const groups = dom.ingredientsContainer.querySelectorAll('.category-group');
    groups.forEach(g => g.classList.remove('has-selected'));
    
    updateHeaderBadge();
    updateSelectionPanel();
  });

  // Dynamic Search Filter
  dom.pantrySearch.addEventListener('input', (e) => {
    filterIngredients(e.target.value.trim().toLowerCase());
  });

  setupIngredientModal();
}

function setupIngredientModal() {
  const modalOverlay = document.getElementById('modal-ing-overlay');
  const btnOpen = document.getElementById('btn-open-ing-modal');
  const btnClose = document.getElementById('btn-close-ing-modal');
  const btnCancel = document.getElementById('btn-cancel-ing-modal');
  const form = document.getElementById('modal-ing-form');

  if (!modalOverlay || !btnOpen || !form) return;

  const openModal = () => { modalOverlay.style.display = 'flex'; };
  const closeModal = () => { modalOverlay.style.display = 'none'; form.reset(); };

  btnOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('modal-ing-name').value.trim();
    const category = document.getElementById('modal-ing-category').value.trim();
    const baseAmount = parseFloat(document.getElementById('modal-ing-base').value);
    const calories = parseFloat(document.getElementById('modal-ing-cal').value) || 0;
    const protein = parseFloat(document.getElementById('modal-ing-prot').value) || 0;
    const carbs = parseFloat(document.getElementById('modal-ing-carb').value) || 0;
    const fat = parseFloat(document.getElementById('modal-ing-fat').value) || 0;
    const isPublic = document.getElementById('modal-ing-public').checked;

    if (!name || !category || isNaN(baseAmount)) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    // Check duplicate
    const currentAppData = await loadAppData();
    const liveIngredients = (currentAppData && currentAppData.ingredients) ? currentAppData.ingredients : ingredients;
    const normTarget = normalizeString(name);
    const alreadyExists = liveIngredients.some(i => i && i.name && normalizeString(i.name) === normTarget);

    if (alreadyExists) {
      alert(`⚠️ O ingrediente "${name}" já existe no catálogo!`);
      return;
    }

    const newIngId = generateSlug(name, isPublic ? 'ing' : 'custom_ing');
    const newIng = {
      id: newIngId,
      name,
      category,
      macroBaseAmount: baseAmount,
      macros: { calories, protein, carbs, fat }
    };

    await saveCustomIngredient(newIng, isPublic);

    // Auto-select the newly created ingredient into the user's pantry
    selectedIngredients.add(newIngId);
    savePantry(selectedIngredients);

    closeModal();
    alert(`Ingrediente "${name}" criado com sucesso e adicionado à sua despensa!`);

    // Reload pantry dynamically in place
    await init();
  });
}

function updateHeaderBadge() {
  const count = selectedIngredients ? selectedIngredients.size : 0;
  const badgeElements = document.querySelectorAll('#selected-count');
  badgeElements.forEach(badge => {
    badge.textContent = count;
  });
}

function renderPantry() {
  // Group ingredients by category
  const categories = {};
  ingredients.forEach(ing => {
    if (!categories[ing.category]) {
      categories[ing.category] = [];
    }
    categories[ing.category].push(ing);
  });

  dom.ingredientsContainer.innerHTML = '';

  Object.entries(categories).forEach(([categoryName, items]) => {
    const hasSelected = items.some(item => selectedIngredients.has(item.id));
    
    const categoryGroup = document.createElement('div');
    categoryGroup.className = `category-group ${hasSelected ? 'has-selected' : ''}`;

    // Header Button
    const headerBtn = document.createElement('button');
    headerBtn.className = 'category-header';
    headerBtn.innerHTML = `
      <div class="category-header-title">
        <span>${categoryName}</span>
        <span class="category-badge">${items.length}</span>
      </div>
      <svg class="category-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    
    headerBtn.addEventListener('click', () => {
      categoryGroup.classList.toggle('collapsed');
    });

    // Content container (checkbox list)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'category-content';

    items.forEach(ing => {
      const isChecked = selectedIngredients.has(ing.id);
      const currentUid = getCurrentUserScope();
      const isCreator = ing.userId && ing.userId === currentUid;
      
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      label.dataset.name = ing.name.toLowerCase();
      
      label.innerHTML = `
        <input type="checkbox" data-id="${ing.id}" ${isChecked ? 'checked' : ''}>
        <span class="checkbox-custom"></span>
        <span class="ingredient-name-text" style="flex:1;">${ing.name}</span>
        ${isCreator ? `<button type="button" class="btn-delete-item" title="Excluir ingrediente" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; padding:2px 6px; opacity:0.75; transition:opacity 0.2s;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
      `;

      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedIngredients.add(ing.id);
        } else {
          selectedIngredients.delete(ing.id);
        }
        
        savePantry(selectedIngredients);
        updateHeaderBadge();
        updateCategoryStatus(categoryGroup, items);
        updateSelectionPanel();
      });

      const deleteBtn = label.querySelector('.btn-delete-item');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const confirmed = await showConfirm(`Deseja realmente excluir o ingrediente "${ing.name}"?`, { title: 'Excluir Ingrediente', confirmText: 'Excluir' });
          if (confirmed) {
            const success = await deleteIngredient(ing);
            if (success) {
              selectedIngredients.delete(ing.id);
              savePantry(selectedIngredients);
              await init();
            }
          }
        });
      }

      contentDiv.appendChild(label);
    });

    categoryGroup.appendChild(headerBtn);
    categoryGroup.appendChild(contentDiv);
    dom.ingredientsContainer.appendChild(categoryGroup);
  });

  updateHeaderBadge();
}

function updateCategoryStatus(groupEl, items) {
  const hasSelected = items.some(item => selectedIngredients.has(item.id));
  if (hasSelected) {
    groupEl.classList.add('has-selected');
  } else {
    groupEl.classList.remove('has-selected');
  }
}

function filterIngredients(query) {
  const groups = dom.ingredientsContainer.querySelectorAll('.category-group');
  
  groups.forEach(group => {
    let visibleItems = 0;
    const items = group.querySelectorAll('.checkbox-item');
    
    items.forEach(item => {
      const name = item.dataset.name;
      if (name.includes(query)) {
        item.style.display = 'flex';
        visibleItems++;
      } else {
        item.style.display = 'none';
      }
    });

    if (query === '') {
      group.style.display = 'block';
      group.classList.remove('collapsed');
    } else if (visibleItems > 0) {
      group.style.display = 'block';
      group.classList.remove('collapsed');
    } else {
      group.style.display = 'none';
    }
  });
}

// Render selected ingredients tag panel on the right
function updateSelectionPanel() {
  const panelBadge = document.getElementById('panel-badge');
  const emptySelection = dom.emptySelection || document.getElementById('empty-selection');
  const tagsContainer = dom.selectedTagsContainer || document.getElementById('selected-tags-container');
  const btnSubmit = dom.btnSubmit || document.getElementById('btn-submit') || document.getElementById('btn-see-recipes');

  const count = selectedIngredients.size;
  if (panelBadge) panelBadge.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    if (emptySelection) emptySelection.style.display = 'flex';
    if (tagsContainer) {
      tagsContainer.style.display = 'none';
      tagsContainer.innerHTML = '';
    }
    if (btnSubmit) {
      btnSubmit.style.opacity = '0.5';
      btnSubmit.style.pointerEvents = 'none';
    }
    return;
  }

  if (emptySelection) emptySelection.style.display = 'none';
  if (tagsContainer) {
    tagsContainer.style.display = 'flex';
    tagsContainer.innerHTML = '';
  }
  if (btnSubmit) {
    btnSubmit.style.opacity = '1';
    btnSubmit.style.pointerEvents = 'auto';
  }

  if (tagsContainer) {
    selectedIngredients.forEach(ingId => {
      const ingObj = ingredients.find(i => i && i.id === ingId);
      if (!ingObj) return;

      const tag = document.createElement('div');
      tag.className = 'selection-tag';
      tag.innerHTML = `
        <span>${ingObj.name}</span>
        <span class="tag-remove">&times;</span>
      `;

      tag.addEventListener('click', () => {
        selectedIngredients.delete(ingId);
        savePantry(selectedIngredients);
        
        const checkbox = dom.ingredientsContainer ? dom.ingredientsContainer.querySelector(`input[data-id="${ingId}"]`) : null;
        if (checkbox) {
          checkbox.checked = false;
          const groupEl = checkbox.closest('.category-group');
          if (groupEl) {
            const titleEl = groupEl.querySelector('.category-header-title span');
            if (titleEl) {
              const catName = titleEl.textContent;
              const groupItems = ingredients.filter(i => i.category === catName);
              updateCategoryStatus(groupEl, groupItems);
            }
          }
        }

        updateHeaderBadge();
        updateSelectionPanel();
      });

      tagsContainer.appendChild(tag);
    });
  }
}

window.addEventListener('userAuthReady', init);

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
