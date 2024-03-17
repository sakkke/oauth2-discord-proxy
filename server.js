const { serve } = require('@hono/node-server')
const { Hono } = require('hono')
const { createBot, createProxy } = require('./index')
const { client_id, client_secret, discord_guild_id, discord_token, oauth2_callback, oauth2_endpoint, port } = require('./config.json')

const app = new Hono()

app.route('/', createProxy({
  bot: createBot(discord_token),
  client_id,
  client_secret,
  discord_guild_id,
  oauth2_callback,
  oauth2_endpoint,
}))

app.get('/', c => c.text('ok'))

serve({
  fetch: app.fetch,
  port,
}, info => {
  console.log(`listening at http://localhost:${info.port}`)
  console.log(`login: http://localhost:${info.port}/login`)
})
