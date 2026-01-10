import { Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

const actionTypeLabels = {
  'analyze_diagram': 'Analyze diagram',
  'create_node': 'Create node',
  'update_node': 'Update node',
  'delete_node': 'Delete node',
  'create_connection': 'Create connection',
  'delete_connection': 'Delete connection',
  'create_border': 'Create border',
  'delete_border': 'Delete border',
  'clear_diagram': 'Clear diagram',
  'move_node': 'Move node',
  'arrange_nodes': 'Arrange nodes',
  'generate_diagram': 'Generate diagram'
}

const formatActionDescription = (action) => {
  const { name, arguments: args } = action.function

  switch (name) {
    case 'analyze_diagram':
      return `Analyze: "${args.query}"`

    case 'create_node':
      return `Create "${args.label}" (${args.shape || 'rectangle'}, ${args.color || 'blue'})`

    case 'update_node':
      return `Update node "${args.nodeId}"`

    case 'delete_node':
      return `Delete node "${args.nodeId}"`

    case 'create_connection':
      return `Connect "${args.fromNodeId}" → "${args.toNodeId}" (${args.style || 'curved'})`

    case 'delete_connection':
      return `Delete connection "${args.connectionId}"`

    case 'create_border':
      return `Create border at (${args.x}, ${args.y}), size ${args.width}×${args.height}`

    case 'delete_border':
      return `Delete border "${args.borderId}"`

    case 'clear_diagram':
      return 'Clear entire diagram'

    case 'move_node':
      return `Move "${args.nodeId}" to (${args.x}, ${args.y})`

    case 'arrange_nodes':
      return `Arrange ${args.nodeIds?.length || 'all'} node(s) in ${args.layout} layout`

    case 'generate_diagram':
      return `Generate: "${args.description}" (layout: ${args.layout})`

    default:
      return `Action: ${name}`
  }
}

const getActionIcon = (actionName) => {
  const iconClass = "w-4 h-4"

  switch (actionName) {
    case 'create_node':
    case 'create_connection':
    case 'create_border':
      return <span className={`${iconClass} text-green-500`}>✓</span>

    case 'delete_node':
    case 'delete_connection':
    case 'delete_border':
    case 'clear_diagram':
      return <span className={`${iconClass} text-red-500`}>✗</span>

    case 'update_node':
    case 'move_node':
    case 'arrange_nodes':
      return <span className={`${iconClass} text-blue-500`}>↻</span>

    default:
      return <span className={`${iconClass} text-gray-500`}>•</span>
  }
}

function ActionValidation({ actions, onValidate, onReject, isExecuting }) {
  if (!actions || actions.length === 0) return null

  return (
    <Card className="p-3 bg-accent/50 border-accent">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-semibold text-xs">Agent proposes actions</h3>
        </div>
        <span className="text-xs text-muted-foreground">{actions.length}</span>
      </div>

      <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
        {actions.map((action, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-1.5 rounded bg-background/50 text-sm"
          >
            <div className="mt-0.5">
              {getActionIcon(action.function.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs text-muted-foreground mb-0.5">
                {actionTypeLabels[action.function.name] || action.function.name}
              </div>
              <div className="text-xs break-words">
                {formatActionDescription(action)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onValidate}
          disabled={isExecuting}
          className="flex-1"
          size="sm"
        >
          <Check className="w-3 h-3 mr-1" />
          {isExecuting ? 'Executing...' : 'Approve'}
        </Button>
        <Button
          onClick={onReject}
          disabled={isExecuting}
          variant="outline"
          size="sm"
        >
          <X className="w-3 h-3 mr-1" />
          Reject
        </Button>
      </div>
    </Card>
  )
}

export default ActionValidation
