import { Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

const actionTypeLabels = {
  'analyze_diagram': 'Analyser le diagramme',
  'create_node': 'Créer un nœud',
  'update_node': 'Modifier un nœud',
  'delete_node': 'Supprimer un nœud',
  'create_connection': 'Créer une connexion',
  'delete_connection': 'Supprimer une connexion',
  'create_border': 'Créer une bordure',
  'delete_border': 'Supprimer une bordure',
  'clear_diagram': 'Effacer le diagramme',
  'move_node': 'Déplacer un nœud',
  'arrange_nodes': 'Réarranger les nœuds',
  'generate_diagram': 'Générer un diagramme'
}

const formatActionDescription = (action) => {
  const { name, arguments: args } = action.function

  switch (name) {
    case 'analyze_diagram':
      return `Analyser: "${args.query}"`

    case 'create_node':
      return `Créer "${args.label}" (${args.shape || 'rectangle'}, ${args.color || 'bleu'})`

    case 'update_node':
      return `Modifier le nœud "${args.nodeId}"`

    case 'delete_node':
      return `Supprimer le nœud "${args.nodeId}"`

    case 'create_connection':
      return `Connecter "${args.fromNodeId}" → "${args.toNodeId}" (${args.style || 'curved'})`

    case 'delete_connection':
      return `Supprimer la connexion "${args.connectionId}"`

    case 'create_border':
      return `Créer une bordure à (${args.x}, ${args.y}), taille ${args.width}×${args.height}`

    case 'delete_border':
      return `Supprimer la bordure "${args.borderId}"`

    case 'clear_diagram':
      return 'Effacer tout le diagramme'

    case 'move_node':
      return `Déplacer "${args.nodeId}" vers (${args.x}, ${args.y})`

    case 'arrange_nodes':
      return `Réarranger ${args.nodeIds?.length || 'tous les'} nœud(s) en ${args.layout}`

    case 'generate_diagram':
      return `Générer: "${args.description}" (layout: ${args.layout})`

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
    <Card className="p-4 mb-4 bg-accent/50 border-accent">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-semibold text-sm">L'agent propose des actions</h3>
        </div>
        <span className="text-xs text-muted-foreground">{actions.length} action(s)</span>
      </div>

      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {actions.map((action, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-2 rounded bg-background/50 text-sm"
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
          <Check className="w-4 h-4 mr-1" />
          {isExecuting ? 'Exécution...' : 'Valider tout'}
        </Button>
        <Button
          onClick={onReject}
          disabled={isExecuting}
          variant="outline"
          size="sm"
        >
          <X className="w-4 h-4 mr-1" />
          Rejeter
        </Button>
      </div>
    </Card>
  )
}

export default ActionValidation
