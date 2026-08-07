const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, getAll, runQuery, getOne } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da aplicação web (HTML, CSS, JS, etc.) da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// --- ROTA DA CONFIGURAÇÃO DO FIREBASE ---
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  });
});

// --- API ROTAS PARA INGREDIENTES ---

// 1. Buscar todos os ingredientes do banco de dados local
app.get('/api/ingredients', async (req, res) => {
  try {
    const rows = await getAll('SELECT * FROM ingredients ORDER BY category, name');
    const ingredients = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      macroBaseAmount: r.macroBaseAmount,
      macros: {
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat
      }
    }));
    res.json(ingredients);
  } catch (err) {
    console.error('Erro ao buscar ingredientes:', err);
    res.status(500).json({ error: 'Erro ao buscar ingredientes do banco de dados.' });
  }
});

// 2. Criar novo ingrediente no banco de dados local
app.post('/api/ingredients', async (req, res) => {
  try {
    const { id, name, category, macroBaseAmount, macros } = req.body;

    if (!name || !category || macroBaseAmount == null) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios: name, category, macroBaseAmount.' });
    }

    const ingId = id || `custom_ing_${Date.now()}`;
    const calories = macros ? (macros.calories || 0) : 0;
    const protein = macros ? (macros.protein || 0) : 0;
    const carbs = macros ? (macros.carbs || 0) : 0;
    const fat = macros ? (macros.fat || 0) : 0;

    await runQuery(
      `INSERT INTO ingredients (id, name, category, macroBaseAmount, calories, protein, carbs, fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ingId, name, category, macroBaseAmount, calories, protein, carbs, fat]
    );

    const newIng = {
      id: ingId,
      name,
      category,
      macroBaseAmount,
      macros: { calories, protein, carbs, fat }
    };

    res.status(201).json(newIng);
  } catch (err) {
    console.error('Erro ao salvar ingrediente:', err);
    res.status(500).json({ error: 'Erro ao salvar ingrediente no banco de dados.' });
  }
});

// --- API ROTAS PARA RECEITAS ---

// 3. Buscar todas as receitas do banco de dados local
app.get('/api/recipes', async (req, res) => {
  try {
    const rows = await getAll('SELECT * FROM recipes');
    const recipes = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      prepTime: r.prepTime,
      servings: r.servings,
      category: r.category,
      image: r.image,
      ingredients: r.ingredients ? JSON.parse(r.ingredients) : [],
      instructions: r.instructions ? JSON.parse(r.instructions) : []
    }));
    res.json(recipes);
  } catch (err) {
    console.error('Erro ao buscar receitas:', err);
    res.status(500).json({ error: 'Erro ao buscar receitas do banco de dados.' });
  }
});

// 4. Criar nova receita no banco de dados local
app.post('/api/recipes', async (req, res) => {
  try {
    const { id, name, description, prepTime, servings, category, image, ingredients, instructions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da receita é obrigatório.' });
    }

    const recId = id || `custom_recipe_${Date.now()}`;

    await runQuery(
      `INSERT INTO recipes (id, name, description, prepTime, servings, category, image, ingredients, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recId,
        name,
        description || '',
        prepTime || 0,
        servings || 1,
        category || '',
        image || '',
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || [])
      ]
    );

    const newRec = {
      id: recId,
      name,
      description: description || '',
      prepTime: prepTime || 0,
      servings: servings || 1,
      category: category || '',
      image: image || '',
      ingredients: ingredients || [],
      instructions: instructions || []
    };

    res.status(201).json(newRec);
  } catch (err) {
    console.error('Erro ao salvar receita:', err);
    res.status(500).json({ error: 'Erro ao salvar receita no banco de dados.' });
  }
});

// Rota raiz enviando index.html por padrão
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização do Banco e Servidor Express
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor LemonNote rodando na porta ${PORT}`);
    console.log(`📍 Acesse no navegador: http://localhost:${PORT}`);
  });
});
