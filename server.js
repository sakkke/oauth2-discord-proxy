const express = require('express')
const { createProxy } = require('./index')
const { client_id, client_secret, oauth2_callback, oauth2_endpoint, port } = require('./config.json')

const app = express()

app.use('/', createProxy({
  client_id,
  client_secret,
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
