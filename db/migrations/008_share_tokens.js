exports.up = (knex) => knex.schema.alterTable('reports', (t) => {
  t.string('share_token', 64).nullable().unique()
})

exports.down = (knex) => knex.schema.alterTable('reports', (t) => {
  t.dropColumn('share_token')
})
