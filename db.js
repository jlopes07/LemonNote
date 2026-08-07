const fs = require('fs');
const path = require('path');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('sqlite3 native module not available, falling back to JSON storage.');
}

require('dotenv').config();

// Determine DB path based on environment (Vercel / AWS Lambda uses /tmp)
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const defaultDbPath = isVercel ? '/tmp/lemonnote.db' : './data/lemonnote.db';
const dbPath = process.env.DB_PATH || defaultDbPath;

let db = null;

if (sqlite3) {
  try {
    const dbDir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(path.resolve(dbPath), (err) => {
      if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
      } else {
        console.log(`Conectado ao banco de dados SQLite em: ${dbPath}`);
      }
    });
  } catch (e) {
    console.warn('SQLite init warning (Vercel fallback enabled):', e.message);
  }
}

// Utility promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve({ lastID: Date.now() });
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Read JSON fallback helpers
function readJsonFallback(filename) {
  try {
    let p = path.resolve(__dirname, 'public', 'data', filename);
    if (!fs.existsSync(p)) {
      p = path.resolve(__dirname, 'data', filename);
    }
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filename} fallback:`, e);
  }
  return [];
}

// Database initializer with seed & Vercel fallback
async function initDatabase() {
  if (!db) return;
  try {
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

    const ingCountRow = await getOne('SELECT COUNT(*) as count FROM ingredients').catch(() => null);
    if (ingCountRow && ingCountRow.count === 0) {
      const ingredientsData = readJsonFallback('ingredients.json');
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
        ).catch(() => {});
      }
    }

    const recCountRow = await getOne('SELECT COUNT(*) as count FROM recipes').catch(() => null);
    if (recCountRow && recCountRow.count === 0) {
      const recipesData = readJsonFallback('recipes.json');
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
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Erro na inicialização do banco SQLite:', err);
  }
}

module.exports = {
  db,
  runQuery,
  getAll,
  getOne,
  initDatabase,
  readJsonFallback
};
