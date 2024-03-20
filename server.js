import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createBot, createProxy } from './index'
import { client_id, client_secret, discord_guild_id, discord_token, oauth2_callback, oauth2_endpoint, port } from './config.json'

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
