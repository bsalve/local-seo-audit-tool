exports.up = (knex) => knex.schema.alterTable('users', (t) => {
  t.text('google_access_token').nullable()
  t.text('google_refresh_token').nullable()
  t.bigint('google_token_expiry').nullable()
})

exports.down = (knex) => knex.schema.alterTable('users', (t) => {
  t.dropColumn('google_access_token')
  t.dropColumn('google_refresh_token')
  t.dropColumn('google_token_expiry')
})
