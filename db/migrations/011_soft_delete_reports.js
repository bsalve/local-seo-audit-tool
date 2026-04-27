exports.up = (knex) => knex.schema.alterTable('reports', (t) => {
  t.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null)
})

exports.down = (knex) => knex.schema.alterTable('reports', (t) => {
  t.dropColumn('deleted_at')
})
