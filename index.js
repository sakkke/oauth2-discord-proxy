const express = require('express')
const cookieParser = require('cookie-parser')

function createProxy(config) {
  const { client_id, client_secret, oauth2_callback, oauth2_endpoint } = config

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

  const proxy = express.Router()

  proxy.use(cookieParser())
  proxy.use(async (req, res, next) => {
    const allowPaths = [
      '/login',
      '/oauth2/callback',
    ]
    if (allowPaths.includes(req.path)) {
      next()
      return
    }

    const { access_token, refresh_token } = req.cookies

    if (typeof access_token === 'undefined') {
      res.redirect('/login')
      return
    }

    const {
      access_token: refreshed_access_token,
      expires_in: refreshed_expires_in,
      refresh_token: refreshed_refresh_token,
    } = await authorizationRefreshToken(refresh_token)
    res.cookie('access_token', refreshed_access_token, {
      maxAge: refreshed_expires_in,
      httpOnly: true,
    })
    res.cookie('refresh_token', refreshed_refresh_token, {
      maxAge: refreshed_expires_in,
      httpOnly: true,
    })

    next()
  })

  proxy.get('/login', (req, res) => {
    res.redirect(oauth2_endpoint)
  })

  proxy.get('/oauth2/callback', async (req, res) => {
    const {
      access_token,
      expires_in,
      refresh_token,
    } = await authorizationCode(req.query.code)
    res.cookie('access_token', access_token, {
      maxAge: expires_in,
      httpOnly: true,
    })
    res.cookie('refresh_token', refresh_token, {
      maxAge: expires_in,
      httpOnly: true,
    })

    res.redirect('/')
  })

  return proxy
}

module.exports = { createProxy }
