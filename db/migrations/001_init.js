'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('google_id', 255).unique().notNullable();
    t.string('email', 255).unique().nullable();
    t.string('name', 255).nullable();
    t.text('avatar_url').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('reports', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.text('url').notNullable();
    t.string('audit_type', 20).notNullable(); // 'page' | 'site' | 'multi'
    t.integer('score').nullable();
    t.string('grade', 2).nullable();
    t.text('pdf_filename').nullable();
    t.jsonb('locations').nullable(); // multi-audit: [{url, label, score, grade}]
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reports');
  await knex.schema.dropTableIfExists('users');
};
