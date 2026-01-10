import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowUp, Trash2, Square } from 'lucide-react'
import Markdown from 'react-markdown'
import { useAgentChat } from '../hooks/useAgentChat'
import { useAgentActions } from '../hooks/useAgentActions'
import ActionValidation from './ActionValidation'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

function AgentSidebar({
  agentSidebarOpen,
  agentSidebarTop,
  nodes,
  connections,
  borders,
  onNodesChange,
  onConnectionsChange,
  onBordersChange
}) {
  const [inputValue, setInputValue] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const {
    pendingActions,
    setPendingActions,
    executePendingActions,
    rejectPendingActions
  } = useAgentActions({
    nodes,
    connections,
    borders,
    onNodesChange,
    onConnectionsChange,
    onBordersChange
  })

  const diagramContext = { nodes, connections, borders }

  const handleToolCalls = useCallback((toolCalls) => {
    setPendingActions(toolCalls)
  }, [setPendingActions])

  const {
    messages,
    isLoading,
    error,
    currentToolCalls,
    sendMessage,
    clearChat,
    stopGeneration,
    clearToolCalls
  } = useAgentChat(diagramContext, handleToolCalls)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue)
      setInputValue('')
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleValidateActions = async () => {
    if (!pendingActions || pendingActions.length === 0) return

    setIsExecuting(true)
    try {
      const result = await executePendingActions(pendingActions)
      clearToolCalls()

      if (result.success) {
        console.log('Actions executed successfully:', result)
      } else {
        console.error('Some actions failed:', result)
      }
    } catch (err) {
      console.error('Error executing actions:', err)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleRejectActions = () => {
    rejectPendingActions()
    clearToolCalls()
  }

  return (
    <div
      className={`hidden lg:flex fixed right-0 bottom-0 w-80 bg-card border-l border-border z-40 overflow-hidden transition-all duration-400 ease-out flex-col ${agentSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      style={{ top: agentSidebarTop }}
    >
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold select-none">Agent</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pendingActions && pendingActions.length > 0 && (
          <ActionValidation
            actions={pendingActions}
            onValidate={handleValidateActions}
            onReject={handleRejectActions}
            isExecuting={isExecuting}
          />
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
                }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
                  <Markdown>{message.content}</Markdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {error && (
          <div className="flex justify-center">
            <div className="max-w-[85%] rounded-lg px-4 py-2 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-transparent">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-[120px] resize-none pr-12 bg-transparent"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              type="button"
              onClick={stopGeneration}
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full absolute right-2 bottom-2"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-8 w-8 rounded-full absolute right-2 bottom-2"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

export default AgentSidebar
