'use strict';

// Returns a Knex instance if DATABASE_URL is set, null otherwise.
// All callers must check: if (!db) skip DB work.
let db = null;

if (process.env.DATABASE_URL) {
  const knex = require('knex');
  db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 0, max: 5 },
  });
}

module.exports = db;
