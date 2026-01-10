const MISTRAL_MODEL = 'devstral-medium-latest'
const REQUEST_TIMEOUT = 20000

const getApiUrl = () => {
  return '/api/chat'
}

const formatDiagramContext = (nodes, connections, borders) => {
  return JSON.stringify({
    diagram_context: {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        shape: n.shape,
        color: n.color
      })),
      connections: connections.map(c => ({
        id: c.id,
        from: c.from,
        to: c.to,
        style: c.style,
        color: c.color,
        lineStyle: c.lineStyle
      })),
      borders: borders.map(b => ({
        id: b.id,
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        color: b.color
      })),
      statistics: {
        nodeCount: nodes.length,
        connectionCount: connections.length,
        borderCount: borders.length
      }
    }
  }, null, 2)
}

export const chatWithMistral = async (messages, onUpdate, abortSignal) => {
  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: 2048
      }),
      signal: abortSignal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 504) {
        throw new Error('The server is taking too long to respond. Please try again.')
      }
      if (response.status === 503) {
        throw new Error('The service is temporarily unavailable. Please try again in a few moments.')
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.')
      }

      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullText += content
              if (onUpdate) {
                onUpdate(fullText)
              }
            }
          } catch (e) {
            console.warn('Parse error for line:', trimmedLine, e)
          }
        }
      }
    }

    return fullText
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    throw error
  }
}

export const chatWithMistralAndContext = async (messages, diagramContext, onUpdate, onToolCalls, abortSignal) => {
  try {
    const { nodes = [], connections = [], borders = [] } = diagramContext || {}

    const contextString = formatDiagramContext(nodes, connections, borders)

    const enrichedMessages = messages.map((msg, index) => {
      if (index === messages.length - 1 && msg.role === 'user') {
        return {
          role: msg.role,
          content: `${msg.content}\n\n<diagram_context>\n${contextString}\n</diagram_context>`
        }
      }
      return msg
    })

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: enrichedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: 2048
      }),
      signal: abortSignal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 504) {
        throw new Error('The server is taking too long to respond. Please try again.')
      }
      if (response.status === 503) {
        throw new Error('The service is temporarily unavailable. Please try again in a few moments.')
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.')
      }

      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''
    let toolCalls = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullText += content
              if (onUpdate) {
                onUpdate(fullText)
              }
            }

            const delta = parsed.choices?.[0]?.delta
            if (delta?.tool_calls && delta.tool_calls.length > 0) {
              for (const toolCall of delta.tool_calls) {
                const existingIndex = toolCalls.findIndex(tc => tc.index === toolCall.index)

                if (existingIndex >= 0) {
                  if (toolCall.function?.arguments) {
                    toolCalls[existingIndex].function.arguments += toolCall.function.arguments
                  }
                } else {
                  toolCalls.push({
                    index: toolCall.index,
                    id: toolCall.id || `call_${Date.now()}_${toolCall.index}`,
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || ''
                    }
                  })
                }
              }
            }
          } catch (e) {
            console.warn('Parse error for line:', trimmedLine, e)
          }
        }
      }
    }

    const parsedToolCalls = toolCalls.map(tc => {
      try {
        return {
          ...tc,
          function: {
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}')
          }
        }
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e)
        return {
          ...tc,
          function: {
            name: tc.function.name,
            arguments: {}
          }
        }
      }
    })

    if (parsedToolCalls.length > 0 && onToolCalls) {
      onToolCalls(parsedToolCalls)
    }

    return { text: fullText, toolCalls: parsedToolCalls }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    throw error
  }
}
