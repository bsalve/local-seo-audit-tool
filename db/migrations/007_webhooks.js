exports.up = (knex) => knex.schema.createTable('webhooks', (t) => {
  t.increments('id')
  t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
  t.string('url', 500).notNullable()
  t.string('events', 500).notNullable().defaultTo('audit.complete,site.complete')
  t.string('secret', 64).notNullable()
  t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
})

exports.down = (knex) => knex.schema.dropTable('webhooks')
