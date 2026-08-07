// Registration screens logic (register.html)

let ingredients = [];
let recipes = [];
let recipeIngredients = []; // ingredients added to the currently building recipe
let recipeInstructions = []; // instructions added to the currently building recipe

const dom = {
  selectedCount: document.getElementById('selected-count'),
  
  // Ingredient Form
  ingForm: document.getElementById('ing-form'),
  ingName: document.getElementById('ing-name'),
  ingCategory: document.getElementById('ing-category'),
  ingBaseAmount: document.getElementById('ing-base-amount'),
  ingCalories: document.getElementById('ing-calories'),
  ingProtein: document.getElementById('ing-protein'),
  ingCarbs: document.getElementById('ing-carbs'),
  ingFat: document.getElementById('ing-fat'),
  
  // Recipe Form
  recForm: document.getElementById('rec-form'),
  recName: document.getElementById('rec-name'),
  recDesc: document.getElementById('rec-desc'),
  recTime: document.getElementById('rec-time'),
  recServings: document.getElementById('rec-servings'),
  recImage: document.getElementById('rec-image'),
  
  // Dynamic ingredients selector in Recipe Form
  recIngSelect: document.getElementById('rec-ing-select'),
  recIngQty: document.getElementById('rec-ing-qty'),
  recIngUnit: document.getElementById('rec-ing-unit'),
  btnAddIng: document.getElementById('btn-add-ing'),
  addedIngList: document.getElementById('added-ing-list'),
  
  // Dynamic instructions in Recipe Form
  recStepText: document.getElementById('rec-step-text'),
  btnAddStep: document.getElementById('btn-add-step'),
  addedStepsList: document.getElementById('added-steps-list')
};

async function init() {
  try {
    const data = await loadAppData();
    ingredients = data.ingredients;
    recipes = data.recipes;

    updateHeaderBadge();
    populateIngredientsDropdown();
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

function updateHeaderBadge() {
  const pantrySet = getPantry();
  if (dom.selectedCount) {
    dom.selectedCount.textContent = pantrySet.size;
  }
}

// Populate the recipe form's ingredients dropdown
function populateIngredientsDropdown() {
  dom.recIngSelect.innerHTML = '<option value="" disabled selected>Escolha o ingrediente...</option>';
  
  // Group ingredients by category for visual grouping in select element
  const categories = {};
  ingredients.forEach(ing => {
    if (!categories[ing.category]) {
      categories[ing.category] = [];
    }
    categories[ing.category].push(ing);
  });

  Object.entries(categories).forEach(([catName, items]) => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = catName;

    items.forEach(ing => {
      const option = document.createElement('option');
      option.value = ing.id;
      option.textContent = ing.name;
      optGroup.appendChild(option);
    });

    dom.recIngSelect.appendChild(optGroup);
  });
}

function setupEventListeners() {
  // 1. Submit Custom Ingredient
  dom.ingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = dom.ingName.value.trim();
    const category = dom.ingCategory.value.trim();
    const baseAmount = parseFloat(dom.ingBaseAmount.value);
    const calories = parseFloat(dom.ingCalories.value) || 0;
    const protein = parseFloat(dom.ingProtein.value) || 0;
    const carbs = parseFloat(dom.ingCarbs.value) || 0;
    const fat = parseFloat(dom.ingFat.value) || 0;

    if (!name || !category || isNaN(baseAmount)) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Check if ingredient already exists (case-insensitive)
    const normalizedName = name.toLowerCase();
    const alreadyExists = ingredients.some(ing => ing.name.trim().toLowerCase() === normalizedName);
    if (alreadyExists) {
      alert(`O ingrediente "${name}" já está cadastrado no sistema!`);
      return;
    }

    const newIngId = `custom_ing_${Date.now()}`;
    const newIng = {
      id: newIngId,
      name,
      category,
      macroBaseAmount: baseAmount,
      macros: {
        calories,
        protein,
        carbs,
        fat
      }
    };

    await saveCustomIngredient(newIng);
    
    // Alert and update state
    alert(`Ingrediente "${name}" cadastrado com sucesso!`);
    ingredients.push(newIng);
    
    // Reset form and dropdown
    dom.ingForm.reset();
    populateIngredientsDropdown();
  });

  // 2. Add Ingredient to Recipe List
  dom.btnAddIng.addEventListener('click', () => {
    const ingId = dom.recIngSelect.value;
    const qty = parseFloat(dom.recIngQty.value);
    const unit = dom.recIngUnit.value.trim();

    if (!ingId) {
      alert('Selecione um ingrediente da lista.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert('Digite uma quantidade válida maior que zero.');
      return;
    }
    if (!unit) {
      alert('Digite a unidade de medida (ex: g, ml, colheres).');
      return;
    }

    // Check if ingredient already added
    if (recipeIngredients.some(item => item.ingredientId === ingId)) {
      alert('Este ingrediente já foi adicionado a esta receita.');
      return;
    }

    const ingObj = ingredients.find(i => i.id === ingId);
    recipeIngredients.push({
      ingredientId: ingId,
      name: ingObj ? ingObj.name : ingId,
      amount: qty,
      unit
    });

    // Reset select inputs
    dom.recIngSelect.value = '';
    dom.recIngQty.value = '';
    dom.recIngUnit.value = 'g';

    renderAddedIngredientsList();
  });

  // 3. Add Instruction Step to Recipe List
  dom.btnAddStep.addEventListener('click', () => {
    const text = dom.recStepText.value.trim();
    if (!text) {
      alert('Digite o modo de preparo para o passo.');
      return;
    }

    recipeInstructions.push(text);
    dom.recStepText.value = '';

    renderAddedStepsList();
  });

  // Enter key in step input triggers add
  dom.recStepText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dom.btnAddStep.click();
    }
  });

  // 4. Submit Custom Recipe
  dom.recForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = dom.recName.value.trim();
    const desc = dom.recDesc.value.trim();
    const time = parseInt(dom.recTime.value);
    const servings = parseInt(dom.recServings.value);
    let image = dom.recImage.value.trim();

    if (!name || !desc || isNaN(time) || isNaN(servings)) {
      alert('Preencha os campos obrigatórios da receita.');
      return;
    }

    // Check if recipe already exists (case-insensitive)
    const normalizedName = name.toLowerCase();
    const recipeAlreadyExists = recipes.some(r => r && r.name && r.name.trim().toLowerCase() === normalizedName);
    if (recipeAlreadyExists) {
      alert(`A receita "${name}" já está cadastrada no sistema!`);
      return;
    }

    if (recipeIngredients.length === 0) {
      alert('Por favor, adicione pelo menos um ingrediente à receita.');
      return;
    }

    if (recipeInstructions.length === 0) {
      alert('Por favor, adicione pelo menos um passo de instrução.');
      return;
    }

    if (!image) {
      // Premium placeholder
      image = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&auto=format&fit=crop&q=80';
    }

    const newRecId = `custom_recipe_${Date.now()}`;
    const newRecipe = {
      id: newRecId,
      name,
      description: desc,
      prepTime: time,
      servings,
      image,
      ingredients: recipeIngredients.map(item => ({
        ingredientId: item.ingredientId,
        amount: item.amount,
        unit: item.unit
      })),
      instructions: [...recipeInstructions]
    };

    await saveCustomRecipe(newRecipe);

    alert(`Receita "${name}" cadastrada com sucesso!`);

    // Reset forms and state lists
    dom.recForm.reset();
    recipeIngredients = [];
    recipeInstructions = [];
    renderAddedIngredientsList();
    renderAddedStepsList();
  });
}

// Render the list of added ingredients in recipe creator view
function renderAddedIngredientsList() {
  dom.addedIngList.innerHTML = '';
  
  if (recipeIngredients.length === 0) {
    dom.addedIngList.innerHTML = '<span class="text" style="color:var(--text-muted)">Nenhum ingrediente adicionado.</span>';
    return;
  }

  recipeIngredients.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'added-item';
    div.innerHTML = `
      <span class="text">✓ ${item.name} (${item.amount} ${item.unit})</span>
      <button type="button" class="remove">&times;</button>
    `;

    div.querySelector('.remove').addEventListener('click', () => {
      recipeIngredients.splice(idx, 1);
      renderAddedIngredientsList();
    });

    dom.addedIngList.appendChild(div);
  });
}

// Render the list of added steps in recipe creator view
function renderAddedStepsList() {
  dom.addedStepsList.innerHTML = '';

  if (recipeInstructions.length === 0) {
    dom.addedStepsList.innerHTML = '<span class="text" style="color:var(--text-muted)">Nenhum passo de instrução adicionado.</span>';
    return;
  }

  recipeInstructions.forEach((step, idx) => {
    const div = document.createElement('div');
    div.className = 'added-item';
    div.innerHTML = `
      <span class="text"><strong>${idx + 1}.</strong> ${step}</span>
      <button type="button" class="remove">&times;</button>
    `;

    div.querySelector('.remove').addEventListener('click', () => {
      recipeInstructions.splice(idx, 1);
      renderAddedStepsList();
    });

    dom.addedStepsList.appendChild(div);
  });
}

window.addEventListener('userAuthReady', init);

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
