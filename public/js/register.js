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
  ingIsPublic: document.getElementById('ing-is-public'),
  
  // Recipe Form
  recForm: document.getElementById('rec-form'),
  recName: document.getElementById('rec-name'),
  recDesc: document.getElementById('rec-desc'),
  recTime: document.getElementById('rec-time'),
  recServings: document.getElementById('rec-servings'),
  recImage: document.getElementById('rec-image'),
  recIsPublic: document.getElementById('rec-is-public'),
  
  // Dynamic ingredients selector in Recipe Form
  recIngInput: document.getElementById('rec-ing-input'),
  recIngDatalist: document.getElementById('ingredients-datalist'),
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
  if (typeof window.updateGlobalPantryBadge === 'function') {
    window.updateGlobalPantryBadge();
  }
}

// Populate the recipe form's ingredients datalist for instant autocomplete
function populateIngredientsDropdown() {
  const datalist = dom.recIngDatalist || document.getElementById('ingredients-datalist');
  if (!datalist) return;
  datalist.innerHTML = '';

  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(ing => {
    const option = document.createElement('option');
    option.value = ing.name;
    datalist.appendChild(option);
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

    // Fetch live catalog data to ensure we compare against current Firestore state
    const currentAppData = await loadAppData();
    const liveIngredients = (currentAppData && currentAppData.ingredients) ? currentAppData.ingredients : ingredients;

    // Check if ingredient already exists (accent, casing, and whitespace insensitive)
    const normTarget = normalizeString(name);
    const alreadyExists = liveIngredients.some(ing => ing && ing.name && normalizeString(ing.name) === normTarget);
    if (alreadyExists) {
      alert(`O ingrediente "${name}" já está cadastrado no sistema! Não é permitido cadastrar ingredientes duplicados.`);
      return;
    }

    const isPublic = dom.ingIsPublic ? dom.ingIsPublic.checked : false;
    const newIngId = generateSlug(name, isPublic ? 'ing' : 'custom_ing');

    const baseUnitEl = document.getElementById('ing-base-unit');
    const baseUnit = baseUnitEl ? baseUnitEl.value : 'g';

    const conversions = {};
    const colherSopaVal = parseFloat(document.getElementById('conv-colher-sopa')?.value);
    if (!isNaN(colherSopaVal) && colherSopaVal > 0) conversions['colher_sopa'] = colherSopaVal;

    const xicaraVal = parseFloat(document.getElementById('conv-xicara')?.value);
    if (!isNaN(xicaraVal) && xicaraVal > 0) conversions['xicara'] = xicaraVal;

    const unidadeVal = parseFloat(document.getElementById('conv-unidade')?.value);
    if (!isNaN(unidadeVal) && unidadeVal > 0) conversions['unidade'] = unidadeVal;

    const newIng = {
      id: newIngId,
      name,
      category,
      baseUnit,
      macroBaseAmount: baseAmount,
      conversions,
      macros: {
        calories,
        protein,
        carbs,
        fat
      }
    };

    await saveCustomIngredient(newIng, isPublic);
    
    // Alert and update state
    alert(`Ingrediente "${name}" cadastrado com sucesso${isPublic ? ' no catálogo PÚBLICO para todos os usuários!' : '!'}`);
    ingredients.push(newIng);
    
    // Reset form and dropdown
    dom.ingForm.reset();
    populateIngredientsDropdown();
  });

  // 2. Add Ingredient to Recipe List (Searchable Input)
  dom.btnAddIng.addEventListener('click', (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const typedValue = dom.recIngInput ? dom.recIngInput.value.trim() : '';
    const qty = parseFloat(dom.recIngQty.value);
    const unit = dom.recIngUnit.value.trim();

    if (!typedValue) {
      alert('Digite ou selecione um ingrediente da lista.');
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

    const normTyped = normalizeString(typedValue);
    let ingObj = ingredients.find(i => normalizeString(i.name) === normTyped || i.id === typedValue);

    const ingId = ingObj ? ingObj.id : generateSlug(typedValue, 'ing');
    const ingName = ingObj ? ingObj.name : typedValue;

    // Check if ingredient already added
    if (recipeIngredients.some(item => item.ingredientId === ingId || normalizeString(item.name) === normTyped)) {
      alert(`O ingrediente "${ingName}" já foi adicionado a esta receita.`);
      return;
    }

    // Convert amount to base unit ('g' or 'ml') using UnitConverter
    let conv = { baseAmount: qty, baseUnit: 'g', factor: 1 };
    if (typeof UnitConverter !== 'undefined') {
      conv = UnitConverter.convertIngAmountToBase(ingObj, qty, unit);
    }

    recipeIngredients.push({
      ingredientId: ingId,
      name: ingName,
      originalAmount: qty,
      originalUnit: unit,
      amount: conv.baseAmount,
      unit: conv.baseUnit,
      baseAmount: conv.baseAmount,
      baseUnit: conv.baseUnit,
      macros: ingObj ? ingObj.macros : null,
      macroBaseAmount: ingObj ? ingObj.macroBaseAmount : null,
      conversions: ingObj ? ingObj.conversions : null
    });

    // Reset select inputs
    if (dom.recIngInput) dom.recIngInput.value = '';
    dom.recIngQty.value = '';
    dom.recIngUnit.value = 'g';

    renderAddedIngredientsList();
  });

  // Enter key in ingredient inputs triggers add ingredient
  [dom.recIngInput, dom.recIngQty, dom.recIngUnit].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          dom.btnAddIng.click();
        }
      });
    }
  });

  // 3. Add Instruction Step to Recipe List (Supports adding multiple lines at once)
  dom.btnAddStep.addEventListener('click', (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const rawText = dom.recStepText.value.trim();
    if (!rawText) {
      alert('Digite ou cole o modo de preparo.');
      return;
    }

    // Split by newlines to allow adding multiple steps at once!
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let addedCount = 0;
    lines.forEach(line => {
      // Strip leading numbers/bullets like "1. ", "2) ", "- ", "• "
      const cleanStep = line.replace(/^(\d+[\.\)]\s*|[\-\*•]\s*)/, '').trim();
      if (cleanStep) {
        recipeInstructions.push(cleanStep);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      dom.recStepText.value = '';
      renderAddedStepsList();
    }
  });

  // Enter key in step input triggers add step without submitting main form
  if (dom.recStepText) {
    dom.recStepText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        dom.btnAddStep.click();
      }
    });
  }

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

    // Fetch live catalog data to ensure we compare against current Firestore state
    const currentAppData = await loadAppData();
    const liveRecipes = (currentAppData && currentAppData.recipes) ? currentAppData.recipes : recipes;

    // Check if recipe already exists (accent, casing, and whitespace insensitive)
    const normTarget = normalizeString(name);
    const recipeAlreadyExists = liveRecipes.some(r => r && r.name && normalizeString(r.name) === normTarget);
    if (recipeAlreadyExists) {
      alert(`⚠️ A receita "${name}" já está cadastrada no sistema! Não é permitido cadastrar receitas duplicadas.`);
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

    const isPublic = dom.recIsPublic ? dom.recIsPublic.checked : false;
    const newRecId = generateSlug(name, isPublic ? 'rec' : 'custom_recipe');

    const newRecipe = {
      id: newRecId,
      name,
      description: desc,
      prepTime: time,
      servings,
      image,
      ingredients: recipeIngredients.map(item => ({
        ingredientId: item.ingredientId,
        name: item.name,
        originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.amount,
        originalUnit: item.originalUnit || item.unit,
        amount: item.baseAmount !== undefined ? item.baseAmount : item.amount,
        unit: item.baseUnit || item.unit,
        baseAmount: item.baseAmount !== undefined ? item.baseAmount : item.amount,
        baseUnit: item.baseUnit || item.unit,
        macros: item.macros || null,
        macroBaseAmount: item.macroBaseAmount || null,
        conversions: item.conversions || null
      })),
      instructions: [...recipeInstructions]
    };

    await saveCustomRecipe(newRecipe, isPublic);

    alert(`Receita "${name}" cadastrada com sucesso${isPublic ? ' no catálogo PÚBLICO para todos os usuários!' : '!'}`);

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
    const origAmount = item.originalAmount !== undefined ? item.originalAmount : item.amount;
    const origUnit = item.originalUnit || item.unit;
    const baseText = item.baseAmount ? ` (${item.baseAmount} ${item.baseUnit})` : '';

    div.innerHTML = `
      <span class="text">✓ ${item.name} - ${origAmount} ${origUnit} <small style="opacity:0.75; font-size:12px; font-weight:normal;">${baseText}</small></span>
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
