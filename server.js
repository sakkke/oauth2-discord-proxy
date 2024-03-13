const express = require('express')
const { createBot, createProxy } = require('./index')
const { client_id, client_secret, discord_guild_id, discord_token, oauth2_callback, oauth2_endpoint, port } = require('./config.json')

const app = express()

app.use('/', createProxy({
  bot: createBot(discord_token),
  client_id,
  client_secret,
  discord_guild_id,
  oauth2_callback,
  oauth2_endpoint,
}))

app.get('/', (req, res) => {
  res.send('ok')
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
  console.log(`login: http://localhost:${port}/login`)
})
