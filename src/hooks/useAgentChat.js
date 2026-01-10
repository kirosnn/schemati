import { useState, useCallback, useRef } from 'react'
import { chatWithMistralAndContext } from '../services/mistralService'

export const useAgentChat = (diagramContext, onToolCalls) => {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentToolCalls, setCurrentToolCalls] = useState(null)
  const abortControllerRef = useRef(null)

  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || isLoading) return

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)
    setCurrentToolCalls(null)

    try {
      abortControllerRef.current = new AbortController()

      const apiMessages = [...messages, userMsg].map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      let hasContent = false

      const result = await chatWithMistralAndContext(
        apiMessages,
        diagramContext,
        (streamedText) => {
          if (!hasContent) {
            hasContent = true
            const assistantMsg = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: '',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, assistantMsg])
          }

          setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = streamedText
            }
            return newMessages
          })
        },
        (toolCalls) => {
          setCurrentToolCalls(toolCalls)
          if (onToolCalls) {
            onToolCalls(toolCalls)
          }
        },
        abortControllerRef.current.signal
      )

      if (result.toolCalls && result.toolCalls.length > 0) {
        setCurrentToolCalls(result.toolCalls)
        if (onToolCalls) {
          onToolCalls(result.toolCalls)
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }

      setError(err.message || 'Failed to send message')

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, isLoading, diagramContext, onToolCalls])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    setCurrentToolCalls(null)
  }, [])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  const clearToolCalls = useCallback(() => {
    setCurrentToolCalls(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    currentToolCalls,
    sendMessage,
    clearChat,
    stopGeneration,
    clearToolCalls
  }
}
