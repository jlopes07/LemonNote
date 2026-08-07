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

  // Search input filtering
  dom.pantrySearch.addEventListener('input', (e) => {
    filterIngredients(e.target.value.trim().toLowerCase());
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
      
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      label.dataset.name = ing.name.toLowerCase();
      
      label.innerHTML = `
        <input type="checkbox" data-id="${ing.id}" ${isChecked ? 'checked' : ''}>
        <span class="checkbox-custom"></span>
        <span class="ingredient-name-text">${ing.name}</span>
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
  const count = selectedIngredients.size;

  if (count === 0) {
    dom.emptySelection.style.display = 'flex';
    dom.selectedTagsContainer.style.display = 'none';
    dom.btnSubmit.style.opacity = '0.5';
    dom.btnSubmit.style.pointerEvents = 'none';
    dom.selectedTagsContainer.innerHTML = '';
    return;
  }

  dom.emptySelection.style.display = 'none';
  dom.selectedTagsContainer.style.display = 'flex';
  dom.btnSubmit.style.opacity = '1';
  dom.btnSubmit.style.pointerEvents = 'auto';

  dom.selectedTagsContainer.innerHTML = '';

  selectedIngredients.forEach(ingId => {
    const ingObj = ingredients.find(i => i.id === ingId);
    if (!ingObj) return;

    const tag = document.createElement('div');
    tag.className = 'selection-tag';
    tag.innerHTML = `
      <span>${ingObj.name}</span>
      <span class="tag-remove">&times;</span>
    `;

    // Clicking a tag removes it from selection
    tag.addEventListener('click', () => {
      selectedIngredients.delete(ingId);
      savePantry(selectedIngredients);
      
      // Update DOM Checkbox
      const checkbox = dom.ingredientsContainer.querySelector(`input[data-id="${ingId}"]`);
      if (checkbox) {
        checkbox.checked = false;
        
        // Update category group status
        const groupEl = checkbox.closest('.category-group');
        const catName = groupEl.querySelector('.category-header-title span').textContent;
        const groupItems = ingredients.filter(i => i.category === catName);
        updateCategoryStatus(groupEl, groupItems);
      }

      updateHeaderBadge();
      updateSelectionPanel();
    });

    dom.selectedTagsContainer.appendChild(tag);
  });
}

window.addEventListener('DOMContentLoaded', init);
