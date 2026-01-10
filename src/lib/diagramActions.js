export const createNode = ({
  label = '',
  x = 'auto',
  y = 'auto',
  shape = 'rectangle',
  color = '#3b82f6',
  width,
  height,
  ...otherProps
}) => {
  const node = {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label,
    shape,
    color,
    ...otherProps
  }

  if (x === 'auto' || y === 'auto') {
    node.x = 0
    node.y = 0
  } else {
    node.x = x
    node.y = y
  }

  if (shape === 'rectangle') {
    node.width = width || 150
    node.height = height || 80
  } else if (shape === 'circle') {
    const size = width || height || 100
    node.width = size
    node.height = size
  } else if (shape === 'diamond') {
    node.width = width || 120
    node.height = height || 120
  }

  return node
}

export const findNodeByIdOrLabel = (nodes, identifier) => {
  if (!identifier) return null

  const lowerIdentifier = identifier.toLowerCase().trim()

  const byId = nodes.find(n => n.id === identifier)
  if (byId) return byId

  const byExactLabel = nodes.find(n => n.label?.toLowerCase() === lowerIdentifier)
  if (byExactLabel) return byExactLabel

  const byPartialLabel = nodes.find(n => n.label?.toLowerCase().includes(lowerIdentifier))
  return byPartialLabel || null
}

export const validateNodeParams = (params) => {
  const errors = []

  if (params.shape && !['rectangle', 'circle', 'diamond'].includes(params.shape)) {
    errors.push(`Invalid shape: ${params.shape}. Must be rectangle, circle, or diamond.`)
  }

  if (params.x !== undefined && params.x !== 'auto' && (typeof params.x !== 'number' || isNaN(params.x))) {
    errors.push(`Invalid x coordinate: ${params.x}`)
  }

  if (params.y !== undefined && params.y !== 'auto' && (typeof params.y !== 'number' || isNaN(params.y))) {
    errors.push(`Invalid y coordinate: ${params.y}`)
  }

  if (params.width !== undefined && (typeof params.width !== 'number' || params.width <= 0)) {
    errors.push(`Invalid width: ${params.width}`)
  }

  if (params.height !== undefined && (typeof params.height !== 'number' || params.height <= 0)) {
    errors.push(`Invalid height: ${params.height}`)
  }

  return { valid: errors.length === 0, errors }
}

export const calculateAutoPosition = (existingNodes, layout = 'horizontal', options = {}) => {
  const {
    startX = 100,
    startY = 100,
    spacing = 200,
    verticalSpacing = 150
  } = options

  if (existingNodes.length === 0) {
    return { x: startX, y: startY }
  }

  if (layout === 'horizontal') {
    const maxX = Math.max(...existingNodes.map(n => n.x + (n.width || 150)))
    return { x: maxX + spacing, y: startY }
  }

  if (layout === 'vertical') {
    const maxY = Math.max(...existingNodes.map(n => n.y + (n.height || 80)))
    return { x: startX, y: maxY + verticalSpacing }
  }

  if (layout === 'grid') {
    const columns = Math.ceil(Math.sqrt(existingNodes.length + 1))
    const row = Math.floor(existingNodes.length / columns)
    const col = existingNodes.length % columns
    return {
      x: startX + (col * spacing),
      y: startY + (row * verticalSpacing)
    }
  }

  return { x: startX, y: startY }
}

export const createConnection = ({
  fromNodeId,
  toNodeId,
  style = 'curved',
  color = '#6b7280',
  lineStyle = 'solid',
  dashLength = 5,
  gapLength = 5,
  ...otherProps
}) => {
  return {
    id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from: fromNodeId,
    to: toNodeId,
    style,
    color,
    lineStyle,
    dashLength,
    gapLength,
    ...otherProps
  }
}

export const validateConnectionParams = (params, nodes) => {
  const errors = []

  if (!params.fromNodeId) {
    errors.push('Missing fromNodeId')
  } else if (!findNodeByIdOrLabel(nodes, params.fromNodeId)) {
    errors.push(`Source node not found: ${params.fromNodeId}`)
  }

  if (!params.toNodeId) {
    errors.push('Missing toNodeId')
  } else if (!findNodeByIdOrLabel(nodes, params.toNodeId)) {
    errors.push(`Target node not found: ${params.toNodeId}`)
  }

  if (params.fromNodeId === params.toNodeId) {
    errors.push('Cannot connect a node to itself')
  }

  if (params.style && !['curved', 'straight', 'orthogonal'].includes(params.style)) {
    errors.push(`Invalid connection style: ${params.style}`)
  }

  if (params.lineStyle && !['solid', 'dashed', 'dotted'].includes(params.lineStyle)) {
    errors.push(`Invalid line style: ${params.lineStyle}`)
  }

  return { valid: errors.length === 0, errors }
}

export const createBorder = ({
  x,
  y,
  width,
  height,
  color = '#6b7280',
  borderWidth = 2,
  ...otherProps
}) => {
  return {
    id: `border-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    w: width,
    h: height,
    color,
    lineWidth: borderWidth,
    ...otherProps
  }
}

export const validateBorderParams = (params) => {
  const errors = []

  if (typeof params.x !== 'number' || isNaN(params.x)) {
    errors.push(`Invalid x coordinate: ${params.x}`)
  }

  if (typeof params.y !== 'number' || isNaN(params.y)) {
    errors.push(`Invalid y coordinate: ${params.y}`)
  }

  if (typeof params.width !== 'number' || params.width <= 0) {
    errors.push(`Invalid width: ${params.width}`)
  }

  if (typeof params.height !== 'number' || params.height <= 0) {
    errors.push(`Invalid height: ${params.height}`)
  }

  return { valid: errors.length === 0, errors }
}

export const generateDiagramLayout = (description, layout = 'hierarchical', options = {}) => {
  const {
    startX = 100,
    startY = 100,
    horizontalSpacing = 250,
    verticalSpacing = 150
  } = options

  const nodes = []
  const connections = []

  if (layout === 'hierarchical') {
    let currentY = startY
    const levels = [[]]

    return { nodes, connections, levels }
  }

  if (layout === 'horizontal') {
    return { nodes, connections, layout: 'horizontal' }
  }

  if (layout === 'vertical') {
    return { nodes, connections, layout: 'vertical' }
  }

  if (layout === 'circular') {
    return { nodes, connections, layout: 'circular' }
  }

  return { nodes, connections }
}

export const analyzeDiagram = (nodes, connections, borders) => {
  const nodeCount = nodes.length
  const connectionCount = connections.length
  const borderCount = borders.length

  const nodeShapes = nodes.reduce((acc, node) => {
    acc[node.shape] = (acc[node.shape] || 0) + 1
    return acc
  }, {})

  const connectionStyles = connections.reduce((acc, conn) => {
    acc[conn.style] = (acc[conn.style] || 0) + 1
    return acc
  }, {})

  const isolatedNodes = nodes.filter(node => {
    return !connections.some(conn => conn.from === node.id || conn.to === node.id)
  })

  const connectedComponents = []
  const visited = new Set()

  const dfs = (nodeId, component) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    component.push(nodeId)

    connections.forEach(conn => {
      if (conn.from === nodeId) dfs(conn.to, component)
      if (conn.to === nodeId) dfs(conn.from, component)
    })
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = []
      dfs(node.id, component)
      connectedComponents.push(component)
    }
  })

  return {
    nodeCount,
    connectionCount,
    borderCount,
    nodeShapes,
    connectionStyles,
    isolatedNodeCount: isolatedNodes.length,
    isolatedNodes: isolatedNodes.map(n => ({ id: n.id, label: n.label })),
    connectedComponentCount: connectedComponents.length,
    connectedComponents: connectedComponents.map(comp => comp.length),
    isEmpty: nodeCount === 0 && connectionCount === 0 && borderCount === 0
  }
}

export const findConnectionByDescription = (connections, nodes, description) => {
  const lowerDesc = description.toLowerCase().trim()

  const words = lowerDesc.split(/\s+/)
  const potentialNodeNames = words.filter(w => w.length > 2)

  for (const conn of connections) {
    const fromNode = nodes.find(n => n.id === conn.from)
    const toNode = nodes.find(n => n.id === conn.to)

    if (!fromNode || !toNode) continue

    const fromLabel = fromNode.label?.toLowerCase() || ''
    const toLabel = toNode.label?.toLowerCase() || ''

    if (potentialNodeNames.some(name => fromLabel.includes(name)) &&
        potentialNodeNames.some(name => toLabel.includes(name))) {
      return conn
    }

    if (lowerDesc.includes(fromLabel) && lowerDesc.includes(toLabel)) {
      return conn
    }
  }

  return null
}
