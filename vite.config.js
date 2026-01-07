import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const apiKey = process.env.MISTRAL_API_KEY

          if (!apiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'MISTRAL_API_KEY not configured' }))
            return
          }

          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })

          req.on('end', async () => {
            try {
              const { messages, model = 'devstral-medium-latest', max_tokens = 4096 } = JSON.parse(body)

              const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model,
                  messages,
                  stream: true,
                  max_tokens
                })
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                res.statusCode = response.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  error: errorData.message || `API error: ${response.status}`
                }))
                return
              }

              res.setHeader('Content-Type', 'text/event-stream')
              res.setHeader('Cache-Control', 'no-cache')
              res.setHeader('Connection', 'keep-alive')

              const reader = response.body.getReader()
              const decoder = new TextDecoder()

              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  res.write(decoder.decode(value))
                }
                res.end()
              } catch (error) {
                console.error('Stream error:', error)
                res.end()
              }
            } catch (error) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: error.message }))
            }
          })
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
