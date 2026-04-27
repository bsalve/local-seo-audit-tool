exports.up = (knex) => knex.schema.alterTable('users', (t) => {
  t.text('pdf_logo_url').nullable()
})

exports.down = (knex) => knex.schema.alterTable('users', (t) => {
  t.dropColumn('pdf_logo_url')
})
