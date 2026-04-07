const express = require('express');
const Database = require('better-sqlite3');

const app = express();

const allowedOrigins = [
  'http://localhost',
  'https://nothing.xo.je'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

const db = new Database('cleaned.db', { readonly: true });
const TABLE_NAME = 'contacts';

function getExistingColumns() {
  const rows = db.prepare(`PRAGMA table_info(${TABLE_NAME})`).all();
  return new Set(rows.map(row => row.name));
}

const existingColumns = getExistingColumns();

console.log('COLONNES DISPONIBLES:', [...existingColumns]);

app.get('/', (req, res) => {
  res.send('Search API is running');
});

app.post('/search', (req, res) => {
  try {
    const {
      page = 1,
      nom = '',
      prenom = '',
      date_naissance = '',
      annee_naissance = '',
      telephone = '',
      email = '',
      adresse = '',
      code_postal = '',
      ville = ''
    } = req.body;

    console.log('BODY RECU:', req.body);

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = 20;
    const offset = (currentPage - 1) * perPage;

    const conditions = [];
    const params = {};

    if (nom.trim() && existingColumns.has('nom')) {
      conditions.push('nom LIKE @nom');
      params.nom = `%${nom.trim()}%`;
    }

    if (prenom.trim() && existingColumns.has('prenom')) {
      conditions.push('prenom LIKE @prenom');
      params.prenom = `%${prenom.trim()}%`;
    }

    if (date_naissance.trim() && existingColumns.has('date_naissance')) {
      conditions.push('date_naissance LIKE @date_naissance');
      params.date_naissance = `%${date_naissance.trim()}%`;
    }

    if (annee_naissance.trim() && existingColumns.has('annee_naissance')) {
      conditions.push('annee_naissance LIKE @annee_naissance');
      params.annee_naissance = `%${annee_naissance.trim()}%`;
    }

    if (telephone.trim() && existingColumns.has('telephone')) {
      conditions.push('telephone LIKE @telephone');
      params.telephone = `%${telephone.trim()}%`;
    }

    if (email.trim() && existingColumns.has('email')) {
      conditions.push('email LIKE @email');
      params.email = `%${email.trim()}%`;
    }

    if (adresse.trim() && existingColumns.has('adresse')) {
      conditions.push('adresse LIKE @adresse');
      params.adresse = `%${adresse.trim()}%`;
    }

    if (code_postal.trim() && existingColumns.has('code_postal')) {
      conditions.push('code_postal LIKE @code_postal');
      params.code_postal = `%${code_postal.trim()}%`;
    }

    if (ville.trim() && existingColumns.has('ville')) {
      conditions.push('ville LIKE @ville');
      params.ville = `%${ville.trim()}%`;
    }

    if (!conditions.length) {
      return res.json({
        results: [],
        currentPage: 1,
        totalPages: 1
      });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const selectableColumns = [
      'nom',
      'prenom',
      'date_naissance',
      'annee_naissance',
      'telephone',
      'email',
      'adresse',
      'code_postal',
      'ville'
    ].filter(col => existingColumns.has(col));

    const selectClause = selectableColumns.length ? selectableColumns.join(', ') : '*';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${TABLE_NAME}
      ${whereClause}
    `;

    const dataQuery = `
      SELECT ${selectClause}
      FROM ${TABLE_NAME}
      ${whereClause}
      LIMIT @limit OFFSET @offset
    `;

    console.log('PARAMS:', params);

    const totalRow = db.prepare(countQuery).get(params);
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.max(Math.ceil(total / perPage), 1);

    const results = db.prepare(dataQuery).all({
      ...params,
      limit: perPage,
      offset
    });

    console.log('RESULTATS:', results.length);

    res.json({
      results,
      currentPage,
      totalPages
    });
  } catch (error) {
    console.error('ERREUR SEARCH:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});