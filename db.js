const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/lemonnote.db';

// Garante que o diretório do arquivo de banco de dados exista
const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.resolve(dbPath), (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log(`Conectado ao banco de dados local SQLite em: ${dbPath}`);
  }
});

// Funções utilitárias com Promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Inicializa tabelas e população inicial (Seed)
async function initDatabase() {
  try {
    // 1. Tabela de Ingredientes
    await runQuery(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        macroBaseAmount REAL NOT NULL,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0
      )
    `);

    // 2. Tabela de Receitas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        prepTime INTEGER,
        servings INTEGER,
        category TEXT,
        image TEXT,
        ingredients TEXT,
        instructions TEXT
      )
    `);

    // 3. Seed dos ingredientes padrão se a tabela estiver vazia
    const ingCountRow = await getOne('SELECT COUNT(*) as count FROM ingredients');
    if (ingCountRow && ingCountRow.count === 0) {
      let jsonIngPath = path.resolve(__dirname, 'public', 'data', 'ingredients.json');
      if (!fs.existsSync(jsonIngPath)) {
        jsonIngPath = path.resolve(__dirname, 'data', 'ingredients.json');
      }
      if (fs.existsSync(jsonIngPath)) {
        const ingredientsData = JSON.parse(fs.readFileSync(jsonIngPath, 'utf8'));
        for (const ing of ingredientsData) {
          await runQuery(
            `INSERT INTO ingredients (id, name, category, macroBaseAmount, calories, protein, carbs, fat) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ing.id,
              ing.name,
              ing.category,
              ing.macroBaseAmount,
              ing.macros ? ing.macros.calories || 0 : 0,
              ing.macros ? ing.macros.protein || 0 : 0,
              ing.macros ? ing.macros.carbs || 0 : 0,
              ing.macros ? ing.macros.fat || 0 : 0
            ]
          );
        }
        console.log(`Seed concluído: ${ingredientsData.length} ingredientes inseridos no banco de dados SQLite.`);
      }
    }

    // 4. Seed das receitas padrão se a tabela estiver vazia
    const recCountRow = await getOne('SELECT COUNT(*) as count FROM recipes');
    if (recCountRow && recCountRow.count === 0) {
      let jsonRecPath = path.resolve(__dirname, 'public', 'data', 'recipes.json');
      if (!fs.existsSync(jsonRecPath)) {
        jsonRecPath = path.resolve(__dirname, 'data', 'recipes.json');
      }
      if (fs.existsSync(jsonRecPath)) {
        const recipesData = JSON.parse(fs.readFileSync(jsonRecPath, 'utf8'));
        for (const rec of recipesData) {
          await runQuery(
            `INSERT INTO recipes (id, name, description, prepTime, servings, category, image, ingredients, instructions) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rec.id,
              rec.name || rec.title || '',
              rec.description || '',
              rec.prepTime || rec.timeMinutes || 0,
              rec.servings || 1,
              rec.category || '',
              rec.image || rec.imageUrl || '',
              JSON.stringify(rec.ingredients || []),
              JSON.stringify(rec.instructions || [])
            ]
          );
        }
        console.log(`Seed concluído: ${recipesData.length} receitas inseridas no banco de dados SQLite.`);
      }
    }
  } catch (err) {
    console.error('Erro na inicialização do banco de dados:', err);
  }
}

module.exports = {
  db,
  runQuery,
  getAll,
  getOne,
  initDatabase
};
