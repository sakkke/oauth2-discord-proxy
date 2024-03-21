import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { createBot } from './bot'

function createProxy(config) {
  const { bot, client_id, client_secret, discord_guild_id, oauth2_callback, oauth2_endpoint } = config

  async function authorizationCode(code) {
    console.log('authorizing code')
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
    const { access_token, expires_in, refresh_token } = result
    return { access_token, expires_in, refresh_token }
  }

  async function authorizationRefreshToken(refreshToken) {
    console.log('authorizing refresh token')
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
    console.log('getting user')
    const data = await fetch(`https://discord.com/api/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const result = await data.json()
    return result
  }

  async function userExists(accessToken, refreshToken) {
    const guild = await bot.guilds.fetch(discord_guild_id)

    const { id } = await getUser(accessToken).catch(async e => {
      console.log('authorizing refresh token')
      const {
        access_token: refreshed_access_token,
        expires_in: refreshed_expires_in,
        refresh_token: refreshed_refresh_token,
      } = await authorizationRefreshToken(refreshToken)
      setCookie(c, 'access_token', refreshed_access_token, {
        maxAge: refreshed_expires_in,
        httpOnly: true,
      })
      setCookie(c, 'refresh_token', refreshed_refresh_token, {
        maxAge: refreshed_expires_in,
        httpOnly: true,
      })

      return await getUser(refreshed_access_token)
    })
    const member = await guild.members.fetch(id).catch(console.error)
    return !!member
  }

  const proxy = new Hono()

  const allowPaths = {
    '/login': null,
    '/oauth2/callback': null,
  }
  const isPathAllowed = path => path in allowPaths
  proxy.use(async (c, next) => {
    if (isPathAllowed(c.req.path)) {
      console.log(`passed allow path: ${c.req.path}`)
      await next()
      return
    }

    const { access_token, refresh_token } = getCookie(c)

    if (typeof access_token === 'undefined') {
      console.log('redirecting to /login because access token is invalid')
      return c.redirect('/login')
    }

    if (!await userExists(access_token, refresh_token)) {
      console.log('dropped request')
      // drop
      return
    }

    await next()
  })

  proxy.get('/login', c => {
    console.log('aceessed /login')
    return c.redirect(oauth2_endpoint)
  })

  proxy.get('/oauth2/callback', async c => {
    console.log('aceessed /oauth2/callback')
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

export { createBot, createProxy }
