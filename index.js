const { Hono } = require('hono')
const { getCookie, setCookie } = require('hono/cookie')
const { createBot } = require('./bot')

function createProxy(config) {
  const { bot, client_id, client_secret, discord_guild_id, oauth2_callback, oauth2_endpoint } = config

  async function authorizationCode(code) {
    const data = await fetch(`https://discord.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: 'authorization_code',
        redirect_uri: oauth2_callback,
        code,
      }),
    })
    const result = await data.json()
    return ({ access_token, expires_in, refresh_token } = result)
  }

  async function authorizationRefreshToken(refreshToken) {
    const data = await fetch(`https://discord.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: 'refresh_token',
        redirect_uri: oauth2_callback,
        refresh_token: refreshToken,
      }),
    })
    const result = await data.json()
    return ({ access_token, expires_in, refresh_token } = result)
  }

  async function getUser(accessToken) {
    const data = await fetch(`https://discord.com/api/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const result = await data.json()
    return result
  }

  async function userExists(accessToken) {
    const guild = await bot.guilds.fetch(discord_guild_id)

    const { id } = await getUser(accessToken)
    const member = await guild.members.fetch(id).catch(console.error)
    return !!member
  }

  const proxy = new Hono()

  proxy.use(async (c, next) => {
    const allowPaths = [
      '/login',
      '/oauth2/callback',
    ]
    if (allowPaths.includes(c.req.path)) {
      await next()
      return
    }

    const { access_token, refresh_token } = getCookie(c)

    if (typeof access_token === 'undefined') {
      return c.redirect('/login')
    }

    if (!await userExists(access_token)) {
      // drop
      return
    }

    const {
      access_token: refreshed_access_token,
      expires_in: refreshed_expires_in,
      refresh_token: refreshed_refresh_token,
    } = await authorizationRefreshToken(refresh_token)
    setCookie(c, 'access_token', refreshed_access_token, {
      maxAge: refreshed_expires_in,
      httpOnly: true,
    })
    setCookie(c, 'refresh_token', refreshed_refresh_token, {
      maxAge: refreshed_expires_in,
      httpOnly: true,
    })

    await next()
  })

  proxy.get('/login', c => c.redirect(oauth2_endpoint))

  proxy.get('/oauth2/callback', async c => {
    const {
      access_token,
      expires_in,
      refresh_token,
    } = await authorizationCode(c.req.query('code'))
    setCookie(c, 'access_token', access_token, {
      maxAge: expires_in,
      httpOnly: true,
    })
    setCookie(c, 'refresh_token', refresh_token, {
      maxAge: expires_in,
      httpOnly: true,
    })

    return c.redirect('/')
  })

  return proxy
}

module.exports = { createBot, createProxy }
