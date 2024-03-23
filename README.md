# oauth2-discord-proxy

## Description

`oauth2-discord-proxy` is a proxy service that uses Discord OAuth 2.0 authentication powered by [honojs/hono](https://github.com/honojs/hono).
The motivation for this project is adding Discord authentication to services that do not have authentication functionality.

## Installation

### bun

```
bun install oauth2-discord-proxy
```

### npm

```
npm install oauth2-discord-proxy
```

## Usage

First, create a new `Hono` instance and add a route with `createProxy()`.

```js
import { Hono } from 'hono'
import { createBot, createProxy } from 'oauth2-discord-proxy'
import { client_id, client_secret, discord_guild_id, discord_token, oauth2_callback, oauth2_endpoint } from './config.json'

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
```

Finally, serve a application.

```js
import { serve } from 'bun'
import { port } from './config.json'

serve({
  fetch: app.fetch,
  port,
})

console.log(`listening at http://0.0.0.0:${port}`)
console.log(`login: http://0.0.0.0:${port}/login`)
```

## License

[MIT](./LICENSE)
