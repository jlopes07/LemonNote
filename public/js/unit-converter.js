// ==========================================================================
// LEMONNOTE - UNIT CONVERTER & BASE MEASUREMENT ENGINE
// ==========================================================================

const UnitConverter = (function () {
  // Standard Registry of Supported Measurement Units
  const STANDARD_UNITS = [
    { id: 'g', symbol: 'g', name: 'Grama (g)', isBaseUnit: true, baseUnitType: 'g' },
    { id: 'kg', symbol: 'kg', name: 'Quilograma (kg)', isBaseUnit: false, baseUnitType: 'g', defaultFactor: 1000 },
    { id: 'ml', symbol: 'ml', name: 'Mililitro (ml)', isBaseUnit: true, baseUnitType: 'ml' },
    { id: 'l', symbol: 'l', name: 'Litro (L)', isBaseUnit: false, baseUnitType: 'ml', defaultFactor: 1000 },
    { id: 'colher_sopa', symbol: 'colher_sopa', name: 'Colher de Sopa', isBaseUnit: false, defaultSolid: 15, defaultLiquid: 15 },
    { id: 'colher_cha', symbol: 'colher_cha', name: 'Colher de Chá', isBaseUnit: false, defaultSolid: 5, defaultLiquid: 5 },
    { id: 'colher_cafe', symbol: 'colher_cafe', name: 'Colher de Café', isBaseUnit: false, defaultSolid: 2, defaultLiquid: 2 },
    { id: 'xicara', symbol: 'xicara', name: 'Xícara', isBaseUnit: false, defaultSolid: 150, defaultLiquid: 240 },
    { id: 'copo', symbol: 'copo', name: 'Copo (200 ml)', isBaseUnit: false, defaultSolid: 200, defaultLiquid: 200 },
    { id: 'unidade', symbol: 'unidade', name: 'Unidade', isBaseUnit: false, defaultSolid: 50, defaultLiquid: 50 },
    { id: 'fatia', symbol: 'fatia', name: 'Fatia', isBaseUnit: false, defaultSolid: 30, defaultLiquid: 30 },
    { id: 'dente', symbol: 'dente', name: 'Dente', isBaseUnit: false, defaultSolid: 5, defaultLiquid: 5 },
    { id: 'pitada', symbol: 'pitada', name: 'Pitada', isBaseUnit: false, defaultSolid: 1, defaultLiquid: 1 }
  ];

  // Helper to string-normalize unit tokens
  function normalizeUnitKey(str) {
    if (!str) return 'g';
    const norm = str
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    if (norm === 'g' || norm === 'grama' || norm === 'gramas') return 'g';
    if (norm === 'kg' || norm === 'quilograma' || norm === 'quilo') return 'kg';
    if (norm === 'ml' || norm === 'mililitro' || norm === 'mililitros') return 'ml';
    if (norm === 'l' || norm === 'litro' || norm === 'litros') return 'l';
    if (norm.includes('colher') && norm.includes('sopa')) return 'colher_sopa';
    if (norm.includes('colher') && norm.includes('cha')) return 'colher_cha';
    if (norm.includes('colher') && norm.includes('cafe')) return 'colher_cafe';
    if (norm.includes('xicara')) return 'xicara';
    if (norm.includes('copo')) return 'copo';
    if (norm.includes('unidade') || norm.includes('und') || norm.includes('un')) return 'unidade';
    if (norm.includes('fatia')) return 'fatia';
    if (norm.includes('dente')) return 'dente';
    if (norm.includes('pitada')) return 'pitada';

    return norm;
  }

  function getUnitDefinition(unitKey) {
    const key = normalizeUnitKey(unitKey);
    return STANDARD_UNITS.find(u => u.id === key || u.symbol === key) || { id: key, symbol: key, name: unitKey, isBaseUnit: false };
  }

  /**
   * Converts an input amount in a specified unit to the food's base unit ('g' or 'ml')
   * Uses per-food custom conversion tables if available.
   */
  function convertIngAmountToBase(ingredient, amount, unitInput) {
    const val = parseFloat(amount) || 0;
    const baseUnit = (ingredient && ingredient.baseUnit) ? ingredient.baseUnit.toLowerCase() : 'g';
    const unitKey = normalizeUnitKey(unitInput);

    // 1. Same unit or exact match to base unit
    if (unitKey === baseUnit) {
      return { baseAmount: val, baseUnit, factor: 1, unitKey };
    }

    // 2. Fixed metric scale factors
    if (baseUnit === 'g') {
      if (unitKey === 'kg') return { baseAmount: val * 1000, baseUnit: 'g', factor: 1000, unitKey };
      if (unitKey === 'mg') return { baseAmount: val * 0.001, baseUnit: 'g', factor: 0.001, unitKey };
    } else if (baseUnit === 'ml') {
      if (unitKey === 'l') return { baseAmount: val * 1000, baseUnit: 'ml', factor: 1000, unitKey };
    }

    // 3. Per-Food Custom Conversion Table (higher precedence)
    if (ingredient && ingredient.conversions && typeof ingredient.conversions === 'object') {
      const customFactor = ingredient.conversions[unitKey] || ingredient.conversions[unitInput];
      if (typeof customFactor === 'number' && customFactor > 0) {
        return { baseAmount: val * customFactor, baseUnit, factor: customFactor, unitKey };
      }
    }

    // 4. Default household unit fallbacks
    const unitDef = getUnitDefinition(unitKey);
    let defaultFactor = 1;
    if (baseUnit === 'ml') {
      defaultFactor = unitDef.defaultLiquid || unitDef.defaultFactor || 1;
    } else {
      defaultFactor = unitDef.defaultSolid || unitDef.defaultFactor || 1;
    }

    return { baseAmount: val * defaultFactor, baseUnit, factor: defaultFactor, unitKey };
  }

  /**
   * Calculates macros for a given base amount relative to ingredient.macroBaseAmount (usually 100g / 100ml)
   */
  function calculateItemMacros(ingredient, baseAmount) {
    if (!ingredient || !ingredient.macros) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const refBase = (ingredient.macroBaseAmount && ingredient.macroBaseAmount > 0) ? ingredient.macroBaseAmount : 100;
    const ratio = baseAmount / refBase;

    const macros = ingredient.macros;
    return {
      calories: Math.round((macros.calories || 0) * ratio),
      protein: Math.round((macros.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((macros.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((macros.fat || 0) * ratio * 10) / 10
    };
  }

  /**
   * Sums all ingredient amounts normalized to base units and calculates recipe total macros
   */
  function calculateRecipeTotals(recipeIngredients, catalogIngredients = []) {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let totalBaseGrams = 0;
    let totalBaseMl = 0;

    if (!Array.isArray(recipeIngredients)) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, totalBaseGrams: 0, totalBaseMl: 0 };
    }

    recipeIngredients.forEach(item => {
      if (!item) return;
      const targetId = item.ingredientId || item.id;
      const ingCatalogObj = catalogIngredients.find(i => i && i.id === targetId);
      const ingredient = ingCatalogObj || item;

      // Extract amount and unit
      const origAmount = item.originalAmount !== undefined ? item.originalAmount : (item.amount || 0);
      const origUnit = item.originalUnit || item.unit || 'g';

      let baseAmount = item.baseAmount;
      let baseUnit = item.baseUnit || (ingredient.baseUnit || 'g');

      if (baseAmount === undefined || baseAmount === null) {
        const conv = convertIngAmountToBase(ingredient, origAmount, origUnit);
        baseAmount = conv.baseAmount;
        baseUnit = conv.baseUnit;
      }

      if (baseUnit === 'g') totalBaseGrams += baseAmount;
      if (baseUnit === 'ml') totalBaseMl += baseAmount;

      const itemMacros = calculateItemMacros(ingredient, baseAmount);
      calories += itemMacros.calories;
      protein += itemMacros.protein;
      carbs += itemMacros.carbs;
      fat += itemMacros.fat;
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      totalBaseGrams: Math.round(totalBaseGrams),
      totalBaseMl: Math.round(totalBaseMl)
    };
  }

  return {
    STANDARD_UNITS,
    normalizeUnitKey,
    getUnitDefinition,
    convertIngAmountToBase,
    calculateItemMacros,
    calculateRecipeTotals
  };
})();

if (typeof window !== 'undefined') {
  window.UnitConverter = UnitConverter;
}
