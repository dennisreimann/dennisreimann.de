---
title: Using Vue-CLI to serve an Express app
ogImage: vue
lang: en
tags:
  - Vue.js
  - Vue
  - vue-cli
  - vue-cli-service
  - Express
  - API
---

Vue-CLI is great but there were few resources available regarding 
how to have an Express server run alongside the UI without requiring another process.
Accomplishing this is actually pretty easy and I hope to provide some guidance with this article.

## Starting point

In my case, Express serves the API for the Vue UI.
This case is also described in the Vue CLI docs:
Just use the [`devServer.proxy`](https://cli.vuejs.org/config/#devserver-proxy) config for that and you are done.
Not so fast…

Using the proxy setup, you have to start separate servers for the UI and API.
Depending on your use-case, this might make sense. For me, both are intertwined and having one server makes things way easier:
<mark>In dev mode, we can use the existing webpack-dev-server based on Express.
You will like need the Express server to run E2E tests as well.</mark>

Here is how to set this up so that running `vue-cli-service serve` spins up one Express instance for the API and UI.

## Configuration

Let's start with entries to add to the `vue.config.js` file:

```js
const configureAPI = require('./src/server/configure')

module.exports = {
  devServer: {
    before: configureAPI
  }
}
```

Wow, that is as short as the proxy config, but what does it do?
It leverages [webpack-dev-server's `before` callback](https://webpack.js.org/configuration/dev-server/#devserverbefore) to do the heavy lifting.

I keep my server-side code in `src/server` which contains the following `configure.js` imported above:

```js
const bodyParser = require('body-parser')
const api = require('./api')

module.exports = app => {
  app.use(bodyParser.json())
  app.use('/api', api)
}
```

In my example, `api.js` contains the [Express Router](https://expressjs.com/en/guide/routing.html#express-router) definitions for the API routes.
<mark>The important part is the `configure` module that exports a function adding the API config to the webpack-dev-server:</mark>
The `before` callback invokes this function with the Express `app` instance as the first argument.
The second argument is the webpack-dev-server instance (which we can safely ignore here).

That's all you actually need for the development and testing environment. Freaking simple!

### Optional: Server restart on change

To reload the dev server whenever the Express/API code changes, you can use [nodemon](https://github.com/remy/nodemon#running-non-node-scripts).
The `npm start` script looks like this:

```bash
nodemon --exec 'vue-cli-service serve'
```

The accompanying `nodemon.json` configures the watch directory:

```json
{
  "watch": [
    "src/server"
  ]
}
```

## In production

For completeness sake, here is my setup for production:
The `src/server` directory contains an `index.js` containing:

```js
const { resolve } = require('path')
const history = require('connect-history-api-fallback')
const express = require('express')
const configureAPI = require('./configure')
const app = express()

const { PORT = 3000 } = process.env

// API
configureAPI(app)

// UI
const publicPath = resolve(__dirname, '../../dist')
const staticConf = { maxAge: '1y', etag: false }

app.use(express.static(publicPath, staticConf))
app.use('/', history())

// Go
app.listen(PORT, () => console.log(`App running on port ${PORT}!`))
```

This file contains all the configuration and logic to bring up the Express server in production.
It is invoked by the command line `NODE_ENV=production node src/server`.

The shared `configureAPI` is passed the `app` instance we created in this scenario.
Besides that, it also leverages Express' static file capability to serve the UI.
Above, we also enabled the [Vue Router history push state navigation](https://router.vuejs.org/guide/essentials/history-mode.html) as well. You can find more guidance on [how to deploy a Vue CLI app](https://cli.vuejs.org/guide/deployment.html) in the official docs.
