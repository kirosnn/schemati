export const config = {
  runtime: 'edge'
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const allEnvKeys = Object.keys(process.env)
  const mistralKeys = allEnvKeys.filter(k => k.toLowerCase().includes('mistral'))

  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'API key not configured',
      debug: {
        allEnvCount: allEnvKeys.length,
        mistralKeys: mistralKeys,
        hasMISTRAL_API_KEY: 'MISTRAL_API_KEY' in process.env,
        value: apiKey ? 'exists' : 'missing'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const { messages, model = 'devstral-medium-latest', max_tokens = 2048 } = body

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
      return new Response(JSON.stringify({
        error: errorData.message || `API error: ${response.status}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
