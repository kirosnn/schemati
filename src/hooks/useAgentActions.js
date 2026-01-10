import { useState, useCallback } from 'react'
import {
  createNode,
  createConnection,
  createBorder,
  findNodeByIdOrLabel,
  validateNodeParams,
  validateConnectionParams,
  validateBorderParams,
  calculateAutoPosition,
  analyzeDiagram,
  findConnectionByDescription
} from '../lib/diagramActions'

export const useAgentActions = ({
  nodes,
  connections,
  borders,
  onNodesChange,
  onConnectionsChange,
  onBordersChange
}) => {
  const [pendingActions, setPendingActions] = useState(null)

  const executeAction = useCallback((action) => {
    const { name, arguments: args } = action.function

    try {
      switch (name) {
        case 'analyze_diagram': {
          const analysis = analyzeDiagram(nodes, connections, borders)
          return {
            success: true,
            message: `Analysis: ${analysis.nodeCount} nodes, ${analysis.connectionCount} connections, ${analysis.borderCount} borders`,
            data: analysis
          }
        }

        case 'create_node': {
          const validation = validateNodeParams(args)
          if (!validation.valid) {
            return { success: false, message: validation.errors.join(', ') }
          }

          let position = { x: args.x, y: args.y }
          if (args.x === 'auto' || args.y === 'auto') {
            position = calculateAutoPosition(nodes, 'horizontal')
          }

          const newNode = createNode({
            ...args,
            x: position.x,
            y: position.y
          })

          onNodesChange([...nodes, newNode])
          return {
            success: true,
            message: `Created node "${args.label}"`,
            data: newNode
          }
        }

        case 'update_node': {
          const node = findNodeByIdOrLabel(nodes, args.nodeId)
          if (!node) {
            return { success: false, message: `Node not found: ${args.nodeId}` }
          }

          const updates = { ...args }
          delete updates.nodeId

          const validation = validateNodeParams(updates)
          if (!validation.valid) {
            return { success: false, message: validation.errors.join(', ') }
          }

          const updatedNodes = nodes.map(n =>
            n.id === node.id ? { ...n, ...updates } : n
          )

          onNodesChange(updatedNodes)
          return {
            success: true,
            message: `Updated node "${node.label || node.id}"`,
            data: { ...node, ...updates }
          }
        }

        case 'delete_node': {
          const node = findNodeByIdOrLabel(nodes, args.nodeId)
          if (!node) {
            return { success: false, message: `Node not found: ${args.nodeId}` }
          }

          const newNodes = nodes.filter(n => n.id !== node.id)
          const newConnections = connections.filter(
            c => c.from !== node.id && c.to !== node.id
          )

          onNodesChange(newNodes)
          onConnectionsChange(newConnections)

          return {
            success: true,
            message: `Deleted node "${node.label || node.id}" and its connections`
          }
        }

        case 'create_connection': {
          const fromNode = findNodeByIdOrLabel(nodes, args.fromNodeId)
          const toNode = findNodeByIdOrLabel(nodes, args.toNodeId)

          const validation = validateConnectionParams(
            {
              fromNodeId: args.fromNodeId,
              toNodeId: args.toNodeId,
              style: args.style,
              lineStyle: args.lineStyle
            },
            nodes
          )

          if (!validation.valid) {
            return { success: false, message: validation.errors.join(', ') }
          }

          const existingConnection = connections.find(
            c => c.from === fromNode.id && c.to === toNode.id
          )

          if (existingConnection) {
            return {
              success: false,
              message: `Connection already exists between "${fromNode.label}" and "${toNode.label}"`
            }
          }

          const newConnection = createConnection({
            fromNodeId: fromNode.id,
            toNodeId: toNode.id,
            style: args.style,
            color: args.color,
            lineStyle: args.lineStyle
          })

          onConnectionsChange([...connections, newConnection])
          return {
            success: true,
            message: `Connected "${fromNode.label}" to "${toNode.label}"`,
            data: newConnection
          }
        }

        case 'delete_connection': {
          let connection = connections.find(c => c.id === args.connectionId)

          if (!connection) {
            connection = findConnectionByDescription(connections, nodes, args.connectionId)
          }

          if (!connection) {
            return { success: false, message: `Connection not found: ${args.connectionId}` }
          }

          const newConnections = connections.filter(c => c.id !== connection.id)
          onConnectionsChange(newConnections)

          return {
            success: true,
            message: 'Connection deleted'
          }
        }

        case 'create_border': {
          const validation = validateBorderParams(args)
          if (!validation.valid) {
            return { success: false, message: validation.errors.join(', ') }
          }

          const newBorder = createBorder(args)
          onBordersChange([...borders, newBorder])

          return {
            success: true,
            message: 'Border created',
            data: newBorder
          }
        }

        case 'delete_border': {
          const border = borders.find(b => b.id === args.borderId)
          if (!border) {
            return { success: false, message: `Border not found: ${args.borderId}` }
          }

          const newBorders = borders.filter(b => b.id !== border.id)
          onBordersChange(newBorders)

          return {
            success: true,
            message: 'Border deleted'
          }
        }

        case 'clear_diagram': {
          if (!args.confirm) {
            return {
              success: false,
              message: 'Clear diagram requires explicit confirmation (confirm: true)'
            }
          }

          onNodesChange([])
          onConnectionsChange([])
          onBordersChange([])

          return {
            success: true,
            message: 'Diagram cleared'
          }
        }

        case 'move_node': {
          const node = findNodeByIdOrLabel(nodes, args.nodeId)
          if (!node) {
            return { success: false, message: `Node not found: ${args.nodeId}` }
          }

          const updatedNodes = nodes.map(n =>
            n.id === node.id ? { ...n, x: args.x, y: args.y } : n
          )

          onNodesChange(updatedNodes)
          return {
            success: true,
            message: `Moved node "${node.label || node.id}" to (${args.x}, ${args.y})`
          }
        }

        case 'arrange_nodes': {
          const nodeIdsToArrange = args.nodeIds && args.nodeIds.length > 0
            ? args.nodeIds.map(id => findNodeByIdOrLabel(nodes, id)).filter(Boolean).map(n => n.id)
            : nodes.map(n => n.id)

          if (nodeIdsToArrange.length === 0) {
            return { success: false, message: 'No nodes to arrange' }
          }

          const nodesToArrange = nodes.filter(n => nodeIdsToArrange.includes(n.id))
          const otherNodes = nodes.filter(n => !nodeIdsToArrange.includes(n.id))

          const arranged = arrangeNodesInLayout(nodesToArrange, args.layout)
          const updatedNodes = [...otherNodes, ...arranged]

          onNodesChange(updatedNodes)
          return {
            success: true,
            message: `Arranged ${nodesToArrange.length} nodes in ${args.layout} layout`
          }
        }

        case 'generate_diagram': {
          if (args.clearExisting) {
            onNodesChange([])
            onConnectionsChange([])
            onBordersChange([])
          }

          return {
            success: true,
            message: `Diagram generation for "${args.description}" with ${args.layout} layout is not yet fully implemented. Please create nodes and connections manually.`,
            note: 'This feature requires a more sophisticated diagram generation algorithm that is beyond the current implementation scope.'
          }
        }

        default:
          return { success: false, message: `Unknown action: ${name}` }
      }
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` }
    }
  }, [nodes, connections, borders, onNodesChange, onConnectionsChange, onBordersChange])

  const executePendingActions = useCallback(async (actionsToExecute) => {
    if (!actionsToExecute || actionsToExecute.length === 0) {
      return { success: false, message: 'No actions to execute' }
    }

    const results = []

    for (const action of actionsToExecute) {
      const result = executeAction(action)
      results.push({ action, result })

      if (!result.success) {
        console.error(`Action failed:`, action, result.message)
      }
    }

    setPendingActions(null)

    const successCount = results.filter(r => r.result.success).length
    const failCount = results.length - successCount

    return {
      success: failCount === 0,
      message: `Executed ${successCount} action(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results
    }
  }, [executeAction])

  const rejectPendingActions = useCallback(() => {
    setPendingActions(null)
    return { success: true, message: 'Actions rejected' }
  }, [])

  const updatePendingAction = useCallback((index, updates) => {
    if (!pendingActions) return

    const updated = [...pendingActions]
    updated[index] = {
      ...updated[index],
      function: {
        ...updated[index].function,
        arguments: {
          ...updated[index].function.arguments,
          ...updates
        }
      }
    }

    setPendingActions(updated)
  }, [pendingActions])

  return {
    pendingActions,
    setPendingActions,
    executePendingActions,
    rejectPendingActions,
    updatePendingAction,
    executeAction
  }
}

const arrangeNodesInLayout = (nodes, layout) => {
  const spacing = 200
  const verticalSpacing = 150
  const startX = 100
  const startY = 100

  if (layout === 'horizontal') {
    return nodes.map((node, index) => ({
      ...node,
      x: startX + (index * spacing),
      y: startY
    }))
  }

  if (layout === 'vertical') {
    return nodes.map((node, index) => ({
      ...node,
      x: startX,
      y: startY + (index * verticalSpacing)
    }))
  }

  if (layout === 'grid') {
    const columns = Math.ceil(Math.sqrt(nodes.length))
    return nodes.map((node, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns
      return {
        ...node,
        x: startX + (col * spacing),
        y: startY + (row * verticalSpacing)
      }
    })
  }

  if (layout === 'circular') {
    const radius = Math.max(200, nodes.length * 30)
    const centerX = startX + radius
    const centerY = startY + radius

    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    })
  }

  return nodes
}
