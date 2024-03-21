import { Client, GatewayIntentBits } from 'discord.js'

function createBot(token) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
  })

  client.login(token)

  return client
}

export { createBot }
