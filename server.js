const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Helper para ler arquivos JSON estáticos da pasta public/data
function readStaticJson(filename) {
  try {
    const filePath = path.join(__dirname, 'public', 'data', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Erro ao ler ${filename}:`, e);
  }
  return [];
}

// --- ROTA DA CONFIGURAÇÃO DO FIREBASE ---
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
  });
});

// --- API ROTAS PARA INGREDIENTES PÚBLICOS ---
app.get('/api/ingredients', (req, res) => {
  const ingredients = readStaticJson('ingredients.json');
  return res.json(ingredients);
});

// --- API ROTAS PARA RECEITAS PÚBLICAS ---
app.get('/api/recipes', (req, res) => {
  const recipes = readStaticJson('recipes.json');
  return res.json(recipes);
});

// Rota raiz enviando index.html por padrão
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app module for Vercel Serverless Functions
module.exports = app;

// Listen only when run locally directly via `node server.js`
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor LemonNote rodando na porta ${PORT}`);
    console.log(`📍 Acesse no navegador: http://localhost:${PORT}`);
  });
}
