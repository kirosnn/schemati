import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import ContextMenu from './ContextMenu'
import Modal from './Modal'
import { Copy, Trash2, Edit, Maximize2, Square, Circle, Diamond, Ruler, Palette, Minus, Paintbrush } from 'lucide-react'

const SchemaCanvas = forwardRef(({
  tool,
  nodeShape,
  nodeColor,
  nodeSize,
  customWidth,
  customHeight,
  connectionStyle,
  connectionColor,
  connectionLineStyle,
  dashLength,
  gapLength,
  borderColor,
  borderWidth,
  gridEnabled,
  gridSize,
  nodes,
  connections,
  borders,
  onNodesChange,
  onConnectionsChange,
  onBordersChange
}, ref) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [draggedNode, setDraggedNode] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [connectionStart, setConnectionStart] = useState(null)
  const [borderStart, setBorderStart] = useState(null)
  const [nodeStart, setNodeStart] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [editText, setEditText] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [copiedNode, setCopiedNode] = useState(null)
  const [customSizeDialog, setCustomSizeDialog] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)
  const [modalConfig, setModalConfig] = useState(null)
  const [hoveredElement, setHoveredElement] = useState(null)
  const [snapGuides, setSnapGuides] = useState([])
  const [isSnapping, setIsSnapping] = useState(false)
  const [snapStrength, setSnapStrength] = useState(0)
  const inputRef = useRef(null)

  const NODE_SIZES = {
    small: { width: 120, height: 60 },
    medium: { width: 150, height: 80 },
    large: { width: 200, height: 100 },
    custom: { width: customWidth, height: customHeight },
  }

  useImperativeHandle(ref, () => ({
    exportToPNG: (options = {}) => {
      const {
        filename = 'schemati-diagram',
        transparentBackground = false,
        cropToContent = true,
        padding = 50,
        scale = 1
      } = options

      const canvas = canvasRef.current
      if (!canvas) return

      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')

      let width, height, translateX, translateY

      if (cropToContent && (nodes.length > 0 || borders.length > 0)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

        nodes.forEach(node => {
          minX = Math.min(minX, node.x)
          minY = Math.min(minY, node.y)
          maxX = Math.max(maxX, node.x + node.width)
          maxY = Math.max(maxY, node.y + node.height)
        })

        borders.forEach(border => {
          minX = Math.min(minX, border.x)
          minY = Math.min(minY, border.y)
          maxX = Math.max(maxX, border.x + border.w)
          maxY = Math.max(maxY, border.y + border.h)
        })

        width = maxX - minX + padding * 2
        height = maxY - minY + padding * 2
        translateX = -minX + padding
        translateY = -minY + padding
      } else {
        const rect = canvas.getBoundingClientRect()
        width = rect.width
        height = rect.height
        translateX = 0
        translateY = 0
      }

      tempCanvas.width = width * scale
      tempCanvas.height = height * scale

      tempCtx.scale(scale, scale)

      if (!transparentBackground) {
        tempCtx.fillStyle = '#ffffff'
        tempCtx.fillRect(0, 0, width, height)
      }

      tempCtx.translate(translateX, translateY)

      borders.forEach(border => {
        drawBorderToContext(tempCtx, border)
      })

      connections.forEach(connection => {
        const fromNode = nodes.find(n => n.id === connection.from)
        const toNode = nodes.find(n => n.id === connection.to)
        if (fromNode && toNode) {
          drawConnectionToContext(tempCtx, fromNode, toNode, connection)
        }
      })

      nodes.forEach(node => {
        drawNodeToContext(tempCtx, node)
      })

      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = tempCanvas.toDataURL('image/png')
      link.click()
    }
  }))

  const SNAP_THRESHOLD = 20

  const drawNodeToContext = (ctx, node) => {
    const {
      x, y, width, height, shape, label,
      backgroundColor = '#ffffff',
      borderColor = node.color || '#3b82f6',
      borderWidth = 2.5,
      borderRadius = 8,
      opacity = 1,
      shadowColor = 'rgba(0, 0, 0, 0.1)',
      shadowBlur = 8,
      shadowOffsetX = 0,
      shadowOffsetY = 2,
      fontSize = 14,
      fontFamily = 'system-ui, -apple-system, sans-serif',
      fontColor = '#1f2937',
      fontWeight = '500',
      textAlign = 'center'
    } = node

    ctx.globalAlpha = opacity
    ctx.fillStyle = backgroundColor
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth

    ctx.shadowColor = shadowColor
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = shadowOffsetX
    ctx.shadowOffsetY = shadowOffsetY

    ctx.beginPath()
    if (shape === 'rectangle') {
      ctx.roundRect(x, y, width, height, borderRadius)
    } else if (shape === 'circle') {
      const radius = Math.min(width, height) / 2
      ctx.arc(x + width / 2, y + height / 2, radius, 0, 2 * Math.PI)
    } else if (shape === 'diamond') {
      ctx.moveTo(x + width / 2, y)
      ctx.lineTo(x + width, y + height / 2)
      ctx.lineTo(x + width / 2, y + height)
      ctx.lineTo(x, y + height / 2)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    if (label) {
      ctx.fillStyle = fontColor
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      ctx.textAlign = textAlign
      ctx.textBaseline = 'middle'

      const maxWidth = width - 24
      const lines = wrapText(ctx, label, maxWidth)
      const lineHeight = fontSize * 1.4
      const totalHeight = lines.length * lineHeight
      let startY = y + height / 2 - totalHeight / 2 + lineHeight / 2

      lines.forEach(line => {
        ctx.fillText(line, x + width / 2, startY)
        startY += lineHeight
      })
    }

    ctx.globalAlpha = 1
  }

  const drawConnectionToContext = (ctx, fromNode, toNode, connection) => {
    const from = getNodeEdgePoint(fromNode, toNode)
    const to = getNodeEdgePoint(toNode, fromNode)

    const {
      color,
      width = 2.5,
      opacity = 1,
      lineStyle = 'solid',
      dashLength = 8,
      gapLength = 4,
      arrowSize = 12,
      arrowStyle = 'filled'
    } = connection

    ctx.globalAlpha = opacity
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (lineStyle === 'dashed') {
      ctx.setLineDash([dashLength, gapLength])
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([1, gapLength])
    } else {
      ctx.setLineDash([])
    }

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)

    if (connection.style === 'straight') {
      ctx.lineTo(to.x, to.y)
    } else if (connection.style === 'curved') {
      const controlPointOffset = Math.min(Math.abs(to.x - from.x) / 2, 100)
      ctx.bezierCurveTo(
        from.x + controlPointOffset, from.y,
        to.x - controlPointOffset, to.y,
        to.x, to.y
      )
    } else if (connection.style === 'orthogonal') {
      const midX = (from.x + to.x) / 2
      ctx.lineTo(midX, from.y)
      ctx.lineTo(midX, to.y)
      ctx.lineTo(to.x, to.y)
    }

    ctx.stroke()
    ctx.setLineDash([])

    if (arrowStyle !== 'none') {
      let angle
      if (connection.style === 'orthogonal') {
        angle = from.x < to.x ? 0 : Math.PI
      } else {
        angle = Math.atan2(to.y - from.y, to.x - from.x)
      }

      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle - Math.PI / 7),
        to.y - arrowSize * Math.sin(angle - Math.PI / 7)
      )
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle + Math.PI / 7),
        to.y - arrowSize * Math.sin(angle + Math.PI / 7)
      )
      ctx.closePath()

      if (arrowStyle === 'filled') {
        ctx.fillStyle = color
        ctx.fill()
      } else if (arrowStyle === 'outlined') {
        ctx.strokeStyle = color
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
  }

  const drawBorderToContext = (ctx, border) => {
    const {
      x, y, w, h,
      color,
      lineWidth,
      backgroundColor = 'transparent',
      backgroundOpacity = 0,
      opacity = 1,
      borderRadius = 0,
      shadowColor = 'transparent',
      shadowBlur = 0,
      shadowOffsetX = 0,
      shadowOffsetY = 0
    } = border

    ctx.globalAlpha = opacity

    if (backgroundColor !== 'transparent' && backgroundOpacity > 0) {
      ctx.fillStyle = backgroundColor
      ctx.globalAlpha = backgroundOpacity
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = shadowBlur
      ctx.shadowOffsetX = shadowOffsetX
      ctx.shadowOffsetY = shadowOffsetY

      if (borderRadius > 0) {
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, borderRadius)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, w, h)
      }

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.globalAlpha = opacity
    }

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash([])

    if (borderRadius > 0) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, borderRadius)
      ctx.stroke()
    } else {
      ctx.strokeRect(x, y, w, h)
    }

    ctx.globalAlpha = 1
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    if (gridEnabled) {
      drawGrid(ctx, rect.width, rect.height)
    }

    if (snapGuides.length) {
      drawSnapGuides(ctx, snapGuides, rect.width, rect.height)
    }

    borders.forEach(border => {
      drawBorder(ctx, border)
    })

    if (borderStart) {
      drawTempBorder(ctx, borderStart.start, borderStart.current)
    }

    connections.forEach(connection => {
      const fromNode = nodes.find(n => n.id === connection.from)
      const toNode = nodes.find(n => n.id === connection.to)
      if (fromNode && toNode) {
        drawConnection(ctx, fromNode, toNode, connection)
      }
    })

    if (connectionStart) {
      const fromNode = nodes.find(n => n.id === connectionStart.nodeId)
      if (fromNode) {
        drawTempConnection(ctx, fromNode, connectionStart.mousePos)
      }
    }

    nodes.forEach(node => {
      drawNode(ctx, node)
    })

    if (nodeStart) {
      drawTempNode(ctx, nodeStart.start, nodeStart.current, nodeStart.shape)
    }
  }, [nodes, connections, borders, connectionStart, borderStart, nodeStart, gridEnabled, gridSize, selectedElement, snapGuides])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    const handleResize = () => {
      redraw()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [redraw])

  useEffect(() => {
    if (editingNode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNode])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingNode) {
        const selectedNode = nodes[nodes.length - 1]
        if (selectedNode) {
          setCopiedNode(selectedNode)
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedNode && !editingNode) {
        e.preventDefault()
        const newNode = {
          ...copiedNode,
          id: `node-${Date.now()}`,
          x: copiedNode.x + 50,
          y: copiedNode.y + 50,
        }
        onNodesChange([...nodes, newNode])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, copiedNode, editingNode, onNodesChange])

  const drawNode = (ctx, node) => {
    const {
      x, y, width, height, shape, label,
      backgroundColor = '#ffffff',
      borderColor = node.color || '#3b82f6',
      borderWidth = 2.5,
      borderRadius = 8,
      opacity = 1,
      shadowColor = 'rgba(0, 0, 0, 0.1)',
      shadowBlur = 8,
      shadowOffsetX = 0,
      shadowOffsetY = 2,
      fontSize = 14,
      fontFamily = 'system-ui, -apple-system, sans-serif',
      fontColor = '#1f2937',
      fontWeight = '500',
      textAlign = 'center'
    } = node

    const isSelected = selectedElement && selectedElement.type === 'node' && selectedElement.id === node.id

    ctx.globalAlpha = opacity
    ctx.fillStyle = backgroundColor
    ctx.strokeStyle = borderColor
    ctx.lineWidth = isSelected ? borderWidth + 1 : borderWidth

    ctx.shadowColor = shadowColor
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = shadowOffsetX
    ctx.shadowOffsetY = shadowOffsetY

    ctx.beginPath()
    if (shape === 'rectangle') {
      ctx.roundRect(x, y, width, height, borderRadius)
    } else if (shape === 'circle') {
      const radius = Math.min(width, height) / 2
      ctx.arc(x + width / 2, y + height / 2, radius, 0, 2 * Math.PI)
    } else if (shape === 'diamond') {
      ctx.moveTo(x + width / 2, y)
      ctx.lineTo(x + width, y + height / 2)
      ctx.lineTo(x + width / 2, y + height)
      ctx.lineTo(x, y + height / 2)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    if (label && (!editingNode || editingNode.id !== node.id)) {
      ctx.fillStyle = fontColor
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      ctx.textAlign = textAlign
      ctx.textBaseline = 'middle'

      const maxWidth = width - 24
      const lines = wrapText(ctx, label, maxWidth)
      const lineHeight = fontSize * 1.4
      const totalHeight = lines.length * lineHeight
      let startY = y + height / 2 - totalHeight / 2 + lineHeight / 2

      lines.forEach(line => {
        ctx.fillText(line, x + width / 2, startY)
        startY += lineHeight
      })
    }

    ctx.globalAlpha = 1
  }

  const drawConnection = (ctx, fromNode, toNode, connection) => {
    const from = getNodeEdgePoint(fromNode, toNode)
    const to = getNodeEdgePoint(toNode, fromNode)

    const {
      color,
      width = 2.5,
      opacity = 1,
      lineStyle = 'solid',
      dashLength = 8,
      gapLength = 4,
      arrowSize = 12,
      arrowStyle = 'filled'
    } = connection

    const isSelected = selectedElement && selectedElement.type === 'connection' && selectedElement.id === connection.id

    ctx.globalAlpha = opacity
    ctx.strokeStyle = color
    ctx.lineWidth = isSelected ? width + 1 : width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (lineStyle === 'dashed') {
      ctx.setLineDash([dashLength, gapLength])
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([1, gapLength])
    } else {
      ctx.setLineDash([])
    }

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)

    if (connection.style === 'straight') {
      ctx.lineTo(to.x, to.y)
    } else if (connection.style === 'curved') {
      const controlPointOffset = Math.min(Math.abs(to.x - from.x) / 2, 100)
      ctx.bezierCurveTo(
        from.x + controlPointOffset, from.y,
        to.x - controlPointOffset, to.y,
        to.x, to.y
      )
    } else if (connection.style === 'orthogonal') {
      const midX = (from.x + to.x) / 2
      ctx.lineTo(midX, from.y)
      ctx.lineTo(midX, to.y)
      ctx.lineTo(to.x, to.y)
    }

    ctx.stroke()
    ctx.setLineDash([])

    if (arrowStyle !== 'none') {
      let angle
      if (connection.style === 'orthogonal') {
        angle = from.x < to.x ? 0 : Math.PI
      } else {
        angle = Math.atan2(to.y - from.y, to.x - from.x)
      }

      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle - Math.PI / 7),
        to.y - arrowSize * Math.sin(angle - Math.PI / 7)
      )
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle + Math.PI / 7),
        to.y - arrowSize * Math.sin(angle + Math.PI / 7)
      )
      ctx.closePath()

      if (arrowStyle === 'filled') {
        ctx.fillStyle = color
        ctx.fill()
      } else if (arrowStyle === 'outlined') {
        ctx.strokeStyle = color
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
  }

  const drawTempConnection = (ctx, fromNode, mousePos) => {
    const from = getNodeCenter(fromNode)

    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(mousePos.x, mousePos.y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawBorder = (ctx, border) => {
    const {
      x, y, w, h,
      color,
      lineWidth,
      backgroundColor = 'transparent',
      backgroundOpacity = 0,
      opacity = 1,
      borderRadius = 0,
      shadowColor = 'transparent',
      shadowBlur = 0,
      shadowOffsetX = 0,
      shadowOffsetY = 0
    } = border

    const isSelected = selectedElement && selectedElement.type === 'border' && selectedElement.id === border.id

    ctx.globalAlpha = opacity

    if (backgroundColor !== 'transparent' && backgroundOpacity > 0) {
      ctx.fillStyle = backgroundColor
      ctx.globalAlpha = backgroundOpacity
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = shadowBlur
      ctx.shadowOffsetX = shadowOffsetX
      ctx.shadowOffsetY = shadowOffsetY

      if (borderRadius > 0) {
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, borderRadius)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, w, h)
      }

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.globalAlpha = opacity
    }

    ctx.strokeStyle = color
    ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth
    ctx.setLineDash([])

    if (borderRadius > 0) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, borderRadius)
      ctx.stroke()
    } else {
      ctx.strokeRect(x, y, w, h)
    }

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      if (borderRadius > 0) {
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, borderRadius)
        ctx.stroke()
      } else {
        ctx.strokeRect(x, y, w, h)
      }
      ctx.setLineDash([])
    }

    ctx.globalAlpha = 1
  }

  const drawTempBorder = (ctx, start, current) => {
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)

    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth
    ctx.setLineDash([8, 4])

    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])
  }

  const drawTempNode = (ctx, start, current, shape) => {
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.strokeStyle = nodeColor
    ctx.lineWidth = 2.5
    ctx.setLineDash([8, 4])

    ctx.beginPath()
    if (shape === 'rectangle') {
      ctx.roundRect(x, y, width, height, 8)
    } else if (shape === 'circle') {
      const radius = Math.min(width, height) / 2
      const centerX = x + width / 2
      const centerY = y + height / 2
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    } else if (shape === 'diamond') {
      ctx.moveTo(x + width / 2, y)
      ctx.lineTo(x + width, y + height / 2)
      ctx.lineTo(x + width / 2, y + height)
      ctx.lineTo(x, y + height / 2)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([])

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  const snapToGrid = (value) => {
    if (!gridEnabled) return value
    return Math.round(value / gridSize) * gridSize
  }

  const getSnapLines = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { vertical: [], horizontal: [] }
    }

    const rect = canvas.getBoundingClientRect()
    const vertical = [
      0,
      rect.width / 2,
      rect.width
    ]
    const horizontal = [
      0,
      rect.height / 2,
      rect.height
    ]

    borders.forEach(border => {
      vertical.push(border.x, border.x + border.w / 2, border.x + border.w)
      horizontal.push(border.y, border.y + border.h / 2, border.y + border.h)
    })

    nodes.forEach(node => {
      vertical.push(node.x, node.x + node.width / 2, node.x + node.width)
      horizontal.push(node.y, node.y + node.height / 2, node.y + node.height)
    })

    return { vertical, horizontal }
  }

  const applyMagneticSnap = (x, y, width, height) => {
    const { vertical, horizontal } = getSnapLines()
    const guides = []
    let snappedX = x
    let snappedY = y

    const canvas = canvasRef.current
    if (!canvas) return { x: snappedX, y: snappedY, guides }

    const rect = canvas.getBoundingClientRect()

    const centerX = x + width / 2
    const centerY = y + height / 2
    const leftEdge = x
    const rightEdge = x + width
    const topEdge = y
    const bottomEdge = y + height

    const snapPoints = [
      { type: 'vertical', value: 0, priority: 1 },
      { type: 'vertical', value: rect.width, priority: 1 },
      { type: 'horizontal', value: 0, priority: 1 },
      { type: 'horizontal', value: rect.height, priority: 1 },
      { type: 'vertical', value: rect.width / 2, priority: 2 },
      { type: 'horizontal', value: rect.height / 2, priority: 2 },
      ...vertical.filter(v => v !== 0 && v !== rect.width && v !== rect.width / 2).map(v => ({ type: 'vertical', value: v, priority: 3 })),
      ...horizontal.filter(h => h !== 0 && h !== rect.height && h !== rect.height / 2).map(h => ({ type: 'horizontal', value: h, priority: 3 }))
    ]

    const elementEdges = [
      { name: 'left', position: leftEdge, type: 'vertical' },
      { name: 'centerX', position: centerX, type: 'vertical' },
      { name: 'right', position: rightEdge, type: 'vertical' },
      { name: 'top', position: topEdge, type: 'horizontal' },
      { name: 'centerY', position: centerY, type: 'horizontal' },
      { name: 'bottom', position: bottomEdge, type: 'horizontal' }
    ]

    const bestSnaps = elementEdges.map(edge => {
      const candidates = snapPoints
        .filter(point => point.type === edge.type)
        .map(point => ({
          ...point,
          distance: Math.abs(edge.position - point.value),
          edgeName: edge.name,
          strength: Math.max(0, 1 - (Math.abs(edge.position - point.value) / SNAP_THRESHOLD))
        }))
        .filter(candidate => candidate.distance <= SNAP_THRESHOLD)
        .sort((a, b) => a.distance - b.distance || a.priority - b.priority)

      return candidates[0] || null
    }).filter(snap => snap !== null)

    const appliedVertical = new Set()
    const appliedHorizontal = new Set()

    bestSnaps.forEach(snap => {
      if (snap.type === 'vertical' && !appliedVertical.has(snap.value)) {
        const edgePosition = elementEdges.find(e => e.name === snap.edgeName).position
        const fullOffset = snap.value - edgePosition
        const easedOffset = fullOffset * Math.pow(snap.strength, 0.5)

        snappedX += easedOffset
        appliedVertical.add(snap.value)
        guides.push({ type: 'vertical', value: snap.value, strength: snap.strength })
      } else if (snap.type === 'horizontal' && !appliedHorizontal.has(snap.value)) {
        const edgePosition = elementEdges.find(e => e.name === snap.edgeName).position
        const fullOffset = snap.value - edgePosition
        const easedOffset = fullOffset * Math.pow(snap.strength, 0.5)

        snappedY += easedOffset
        appliedHorizontal.add(snap.value)
        guides.push({ type: 'horizontal', value: snap.value, strength: snap.strength })
      }
    })

    snappedX = Math.max(0, Math.min(snappedX, rect.width - width))
    snappedY = Math.max(0, Math.min(snappedY, rect.height - height))

    const averageStrength = bestSnaps.length > 0
      ? bestSnaps.reduce((sum, snap) => sum + snap.strength, 0) / bestSnaps.length
      : 0

    return { x: snappedX, y: snappedY, guides, strength: averageStrength }
  }

  const drawSnapGuides = (ctx, guides, width, height) => {
    if (!guides.length) return

    ctx.save()

    guides.forEach(guide => {
      const strength = guide.strength || 1
      const alpha = 0.4 + (strength * 0.6)
      const lineWidth = 1.5 + (strength * 1.5)

      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.setLineDash([8, 4])
      ctx.shadowColor = `rgba(59, 130, 246, ${strength * 0.4})`
      ctx.shadowBlur = strength * 6

      ctx.beginPath()
      if (guide.type === 'vertical') {
        ctx.moveTo(guide.value, 0)
        ctx.lineTo(guide.value, height)
      } else {
        ctx.moveTo(0, guide.value)
        ctx.lineTo(width, guide.value)
      }
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    })

    ctx.restore()
  }

  const getNodeCenter = (node) => {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    }
  }

  const getNodeEdgePoint = (fromNode, toNode) => {
    const fromCenter = getNodeCenter(fromNode)
    const toCenter = getNodeCenter(toNode)

    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x)

    if (fromNode.shape === 'circle') {
      const radius = Math.min(fromNode.width, fromNode.height) / 2
      return {
        x: fromCenter.x + radius * Math.cos(angle),
        y: fromCenter.y + radius * Math.sin(angle)
      }
    }

    return fromCenter
  }

  const wrapText = (ctx, text, maxWidth) => {
    if (!text) return ['']

    const words = text.split(' ')
    const lines = []
    let currentLine = words[0] || ''

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i]
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)
    return lines
  }

  const getClickedNode = (x, y) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      if (node.shape === 'circle') {
        const center = getNodeCenter(node)
        const radius = Math.min(node.width, node.height) / 2
        const distance = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2)
        if (distance <= radius) return node
      } else if (node.shape === 'diamond') {
        const center = getNodeCenter(node)
        const relX = x - center.x
        const relY = y - center.y
        if (Math.abs(relX) / (node.width / 2) + Math.abs(relY) / (node.height / 2) <= 1) {
          return node
        }
      } else {
        if (x >= node.x && x <= node.x + node.width &&
            y >= node.y && y <= node.y + node.height) {
          return node
        }
      }
    }
    return null
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = getClickedNode(x, y)

    if (tool === 'connection') {
      if (clickedNode) {
        if (!connectionStart) {
          setConnectionStart({ nodeId: clickedNode.id, mousePos: { x, y } })
        } else {
          if (connectionStart.nodeId !== clickedNode.id) {
            const newConnection = {
              id: `connection-${Date.now()}`,
              from: connectionStart.nodeId,
              to: clickedNode.id,
              style: connectionStyle,
              color: connectionColor,
              lineStyle: connectionLineStyle,
              dashLength: dashLength,
              gapLength: gapLength
            }
            onConnectionsChange([...connections, newConnection])
          }
          setConnectionStart(null)
        }
      }
    } else if (tool === 'delete') {
      if (clickedNode) {
        onNodesChange(nodes.filter(n => n.id !== clickedNode.id))
        onConnectionsChange(connections.filter(c => c.from !== clickedNode.id && c.to !== clickedNode.id))
      } else {
        const clickedConnection = getClickedConnection(x, y)
        if (clickedConnection) {
          onConnectionsChange(connections.filter(c => c.id !== clickedConnection.id))
        } else {
          const clickedBorder = getClickedBorder(x, y)
          if (clickedBorder) {
            onBordersChange(borders.filter(b => b.id !== clickedBorder.id))
          }
        }
      }
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = getClickedNode(x, y)
    const clickedConnection = getClickedConnection(x, y)
    const clickedBorder = getClickedBorder(x, y)

    if (clickedNode) {
      setSelectedElement({ type: 'node', id: clickedNode.id })

      const menuWidth = 200
      const menuHeight = 400
      const adjustedX = Math.min(e.clientX, window.innerWidth - menuWidth)
      const adjustedY = Math.min(e.clientY, window.innerHeight - menuHeight)

      setContextMenu({
        x: adjustedX,
        y: adjustedY,
        type: 'node',
        target: clickedNode,
        options: [
          {
            label: 'Edit Text',
            icon: Edit,
            onClick: () => {
              setEditingNode(clickedNode)
              setEditText(clickedNode.label || '')
            }
          },
          {
            label: 'Customize Style',
            icon: Paintbrush,
            onClick: () => {
              setModalConfig({
                title: 'Customize Node Style',
                fields: [
                  { name: 'backgroundColor', label: 'Background Color', type: 'colorWithTransparent', defaultValue: clickedNode.backgroundColor || '#ffffff' },
                  { name: 'borderColor', label: 'Border Color', type: 'colorWithTransparent', defaultValue: clickedNode.borderColor || clickedNode.color || '#3b82f6' },
                  { name: 'borderWidth', label: 'Border Width (px)', type: 'number', defaultValue: clickedNode.borderWidth || 2.5, min: 0, max: 20, step: 0.1 },
                  { name: 'borderRadius', label: 'Border Radius (px)', type: 'number', defaultValue: clickedNode.borderRadius || 8, min: 0, max: 100, step: 0.1 },
                  { name: 'opacity', label: 'Opacity', type: 'number', defaultValue: clickedNode.opacity || 1, min: 0, max: 1, step: 0.01 },
                  { name: 'shadowColor', label: 'Shadow Color', type: 'colorWithTransparent', defaultValue: clickedNode.shadowColor !== undefined ? clickedNode.shadowColor : 'rgba(0, 0, 0, 0.1)' },
                  { name: 'shadowBlur', label: 'Shadow Blur (px)', type: 'number', defaultValue: clickedNode.shadowBlur !== undefined ? clickedNode.shadowBlur : 8, min: 0, max: 50, step: 0.1 },
                  { name: 'shadowOffsetX', label: 'Shadow Offset X (px)', type: 'number', defaultValue: clickedNode.shadowOffsetX || 0, min: -50, max: 50, step: 0.1 },
                  { name: 'shadowOffsetY', label: 'Shadow Offset Y (px)', type: 'number', defaultValue: clickedNode.shadowOffsetY !== undefined ? clickedNode.shadowOffsetY : 2, min: -50, max: 50, step: 0.1 },
                  { name: 'fontSize', label: 'Font Size (px)', type: 'number', defaultValue: clickedNode.fontSize || 14, min: 8, max: 72, step: 0.1 },
                  { name: 'fontColor', label: 'Font Color', type: 'color', defaultValue: clickedNode.fontColor || '#1f2937' },
                  { name: 'fontWeight', label: 'Font Weight', type: 'text', defaultValue: clickedNode.fontWeight || '500', placeholder: 'e.g., 400, 500, 700, bold' }
                ],
                onSubmit: (values) => {
                  onNodesChange(nodes.map(n =>
                    n.id === clickedNode.id ? {
                      ...n,
                      backgroundColor: values.backgroundColor,
                      borderColor: values.borderColor,
                      borderWidth: parseFloat(values.borderWidth),
                      borderRadius: parseFloat(values.borderRadius),
                      opacity: parseFloat(values.opacity),
                      shadowColor: values.shadowColor,
                      shadowBlur: parseFloat(values.shadowBlur),
                      shadowOffsetX: parseFloat(values.shadowOffsetX),
                      shadowOffsetY: parseFloat(values.shadowOffsetY),
                      fontSize: parseFloat(values.fontSize),
                      fontColor: values.fontColor,
                      fontWeight: values.fontWeight
                    } : n
                  ))
                }
              })
            }
          },
          { separator: true },
          {
            label: 'Rectangle',
            icon: Square,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, shape: 'rectangle' } : n
              ))
            }
          },
          {
            label: 'Circle',
            icon: Circle,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, shape: 'circle' } : n
              ))
            }
          },
          {
            label: 'Diamond',
            icon: Diamond,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, shape: 'diamond' } : n
              ))
            }
          },
          { separator: true },
          {
            label: 'Custom Size',
            icon: Ruler,
            onClick: () => {
              setModalConfig({
                title: 'Custom Size',
                fields: [
                  { name: 'width', label: 'Width (px)', type: 'number', defaultValue: clickedNode.width, min: 20, max: 1000, step: 0.1 },
                  { name: 'height', label: 'Height (px)', type: 'number', defaultValue: clickedNode.height, min: 20, max: 1000, step: 0.1 }
                ],
                onSubmit: (values) => {
                  onNodesChange(nodes.map(n =>
                    n.id === clickedNode.id ? { ...n, width: parseFloat(values.width), height: parseFloat(values.height) } : n
                  ))
                }
              })
            }
          },
          {
            label: 'Small Size',
            icon: Maximize2,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, ...NODE_SIZES.small } : n
              ))
            }
          },
          {
            label: 'Medium Size',
            icon: Maximize2,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, ...NODE_SIZES.medium } : n
              ))
            }
          },
          {
            label: 'Large Size',
            icon: Maximize2,
            onClick: () => {
              onNodesChange(nodes.map(n =>
                n.id === clickedNode.id ? { ...n, ...NODE_SIZES.large } : n
              ))
            }
          },
          { separator: true },
          {
            label: 'Duplicate',
            icon: Copy,
            onClick: () => {
              const newNode = {
                ...clickedNode,
                id: `node-${Date.now()}`,
                x: clickedNode.x + 50,
                y: clickedNode.y + 50,
              }
              onNodesChange([...nodes, newNode])
            },
            shortcut: 'Ctrl+D'
          },
          {
            label: 'Copy',
            icon: Copy,
            onClick: () => {
              setCopiedNode(clickedNode)
            },
            shortcut: 'Ctrl+C'
          },
          { separator: true },
          {
            label: 'Delete',
            icon: Trash2,
            onClick: () => {
              onNodesChange(nodes.filter(n => n.id !== clickedNode.id))
              onConnectionsChange(connections.filter(c => c.from !== clickedNode.id && c.to !== clickedNode.id))
            }
          }
        ]
      })
    } else if (clickedConnection) {
      setSelectedElement({ type: 'connection', id: clickedConnection.id })

      const menuWidth = 200
      const menuHeight = 500
      const adjustedX = Math.min(e.clientX, window.innerWidth - menuWidth)
      const adjustedY = Math.min(e.clientY, window.innerHeight - menuHeight)

      setContextMenu({
        x: adjustedX,
        y: adjustedY,
        type: 'connection',
        target: clickedConnection,
        options: [
          {
            label: 'Customize Style',
            icon: Paintbrush,
            onClick: () => {
              setModalConfig({
                title: 'Customize Connection Style',
                fields: [
                  { name: 'color', label: 'Color', type: 'color', defaultValue: clickedConnection.color },
                  { name: 'width', label: 'Line Width (px)', type: 'number', defaultValue: clickedConnection.width || 2.5, min: 0.5, max: 20, step: 0.1 },
                  { name: 'opacity', label: 'Opacity', type: 'number', defaultValue: clickedConnection.opacity || 1, min: 0, max: 1, step: 0.01 },
                  { name: 'arrowSize', label: 'Arrow Size (px)', type: 'number', defaultValue: clickedConnection.arrowSize || 12, min: 5, max: 30, step: 0.1 },
                  { name: 'dashLength', label: 'Dash Length (px)', type: 'number', defaultValue: clickedConnection.dashLength || 8, min: 1, max: 50, step: 0.1 },
                  { name: 'gapLength', label: 'Gap Length (px)', type: 'number', defaultValue: clickedConnection.gapLength || 4, min: 1, max: 50, step: 0.1 }
                ],
                onSubmit: (values) => {
                  onConnectionsChange(connections.map(c =>
                    c.id === clickedConnection.id ? {
                      ...c,
                      color: values.color,
                      width: parseFloat(values.width),
                      opacity: parseFloat(values.opacity),
                      arrowSize: parseFloat(values.arrowSize),
                      dashLength: parseFloat(values.dashLength),
                      gapLength: parseFloat(values.gapLength)
                    } : c
                  ))
                }
              })
            }
          },
          { separator: true },
          {
            label: 'Filled Arrow',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, arrowStyle: 'filled' } : c
              ))
            }
          },
          {
            label: 'Outlined Arrow',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, arrowStyle: 'outlined' } : c
              ))
            }
          },
          {
            label: 'No Arrow',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, arrowStyle: 'none' } : c
              ))
            }
          },
          { separator: true },
          {
            label: 'Curved',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, style: 'curved' } : c
              ))
            }
          },
          {
            label: 'Straight',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, style: 'straight' } : c
              ))
            }
          },
          {
            label: 'Orthogonal',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, style: 'orthogonal' } : c
              ))
            }
          },
          { separator: true },
          {
            label: 'Solid Line',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, lineStyle: 'solid' } : c
              ))
            }
          },
          {
            label: 'Dashed Line',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, lineStyle: 'dashed' } : c
              ))
            }
          },
          {
            label: 'Dotted Line',
            icon: Minus,
            onClick: () => {
              onConnectionsChange(connections.map(c =>
                c.id === clickedConnection.id ? { ...c, lineStyle: 'dotted' } : c
              ))
            }
          },
          { separator: true },
          {
            label: 'Delete Connection',
            icon: Trash2,
            onClick: () => {
              onConnectionsChange(connections.filter(c => c.id !== clickedConnection.id))
            }
          }
        ]
      })
    } else if (clickedBorder) {
      setSelectedElement({ type: 'border', id: clickedBorder.id })

      const menuWidth = 200
      const menuHeight = 400
      const adjustedX = Math.min(e.clientX, window.innerWidth - menuWidth)
      const adjustedY = Math.min(e.clientY, window.innerHeight - menuHeight)

      setContextMenu({
        x: adjustedX,
        y: adjustedY,
        type: 'border',
        target: clickedBorder,
        options: [
          {
            label: 'Customize Style',
            icon: Paintbrush,
            onClick: () => {
              setModalConfig({
                title: 'Customize Border Style',
                fields: [
                  { name: 'color', label: 'Border Color', type: 'colorWithTransparent', defaultValue: clickedBorder.color },
                  { name: 'lineWidth', label: 'Border Width (px)', type: 'number', defaultValue: clickedBorder.lineWidth, min: 0, max: 20, step: 0.1 },
                  { name: 'backgroundColor', label: 'Background Color', type: 'colorWithTransparent', defaultValue: clickedBorder.backgroundColor || 'transparent' },
                  { name: 'backgroundOpacity', label: 'Background Opacity', type: 'number', defaultValue: clickedBorder.backgroundOpacity || 0, min: 0, max: 1, step: 0.01 },
                  { name: 'opacity', label: 'Border Opacity', type: 'number', defaultValue: clickedBorder.opacity || 1, min: 0, max: 1, step: 0.01 },
                  { name: 'borderRadius', label: 'Border Radius (px)', type: 'number', defaultValue: clickedBorder.borderRadius || 0, min: 0, max: 100, step: 0.1 },
                  { name: 'shadowColor', label: 'Shadow Color', type: 'colorWithTransparent', defaultValue: clickedBorder.shadowColor || 'transparent' },
                  { name: 'shadowBlur', label: 'Shadow Blur (px)', type: 'number', defaultValue: clickedBorder.shadowBlur || 0, min: 0, max: 50, step: 0.1 },
                  { name: 'shadowOffsetX', label: 'Shadow Offset X (px)', type: 'number', defaultValue: clickedBorder.shadowOffsetX || 0, min: -50, max: 50, step: 0.1 },
                  { name: 'shadowOffsetY', label: 'Shadow Offset Y (px)', type: 'number', defaultValue: clickedBorder.shadowOffsetY || 0, min: -50, max: 50, step: 0.1 }
                ],
                onSubmit: (values) => {
                  onBordersChange(borders.map(b =>
                    b.id === clickedBorder.id ? {
                      ...b,
                      color: values.color,
                      lineWidth: parseFloat(values.lineWidth),
                      backgroundColor: values.backgroundColor,
                      backgroundOpacity: parseFloat(values.backgroundOpacity),
                      opacity: parseFloat(values.opacity),
                      borderRadius: parseFloat(values.borderRadius),
                      shadowColor: values.shadowColor,
                      shadowBlur: parseFloat(values.shadowBlur),
                      shadowOffsetX: parseFloat(values.shadowOffsetX),
                      shadowOffsetY: parseFloat(values.shadowOffsetY)
                    } : b
                  ))
                }
              })
            }
          },
          { separator: true },
          {
            label: 'Delete Border',
            icon: Trash2,
            onClick: () => {
              onBordersChange(borders.filter(b => b.id !== clickedBorder.id))
            }
          }
        ]
      })
    }
  }

  const getClickedConnection = (x, y) => {
    for (const connection of connections) {
      const fromNode = nodes.find(n => n.id === connection.from)
      const toNode = nodes.find(n => n.id === connection.to)
      if (fromNode && toNode) {
        const from = getNodeCenter(fromNode)
        const to = getNodeCenter(toNode)
        const distance = distanceToLine(x, y, from.x, from.y, to.x, to.y)
        if (distance < 15) {
          return connection
        }
      }
    }
    return null
  }

  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = px - xx
    const dy = py - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getClickedBorder = (x, y) => {
    for (const border of borders) {
      const threshold = 10
      const isNearLeft = Math.abs(x - border.x) < threshold && y >= border.y - threshold && y <= border.y + border.h + threshold
      const isNearRight = Math.abs(x - (border.x + border.w)) < threshold && y >= border.y - threshold && y <= border.y + border.h + threshold
      const isNearTop = Math.abs(y - border.y) < threshold && x >= border.x - threshold && x <= border.x + border.w + threshold
      const isNearBottom = Math.abs(y - (border.y + border.h)) < threshold && x >= border.x - threshold && x <= border.x + border.w + threshold

      if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
        return border
      }
    }
    return null
  }

  const handleCanvasDoubleClick = (e) => {
    if (tool !== 'select') return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = getClickedNode(x, y)
    if (clickedNode) {
      setEditingNode(clickedNode)
      setEditText(clickedNode.label || '')
    }
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'select') {
      const clickedNode = getClickedNode(x, y)
      if (clickedNode) {
        setDraggedNode(clickedNode)
        setOffset({ x: x - clickedNode.x, y: y - clickedNode.y })
      }
    } else if (tool === 'border') {
      const snappedX = snapToGrid(x)
      const snappedY = snapToGrid(y)
      setBorderStart({ start: { x: snappedX, y: snappedY }, current: { x: snappedX, y: snappedY } })
    } else if (tool === 'node' || tool === 'text') {
      const clickedNode = getClickedNode(x, y)
      if (!clickedNode) {
        const snappedX = snapToGrid(x)
        const snappedY = snapToGrid(y)
        setNodeStart({
          start: { x: snappedX, y: snappedY },
          current: { x: snappedX, y: snappedY },
          shape: tool === 'text' ? 'rectangle' : nodeShape
        })
      }
    }
  }

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = getClickedNode(x, y)
    const clickedConnection = getClickedConnection(x, y)
    const clickedBorder = getClickedBorder(x, y)

    if (clickedNode) {
      setHoveredElement({ type: 'node', id: clickedNode.id })
    } else if (clickedConnection) {
      setHoveredElement({ type: 'connection', id: clickedConnection.id })
    } else if (clickedBorder) {
      setHoveredElement({ type: 'border', id: clickedBorder.id })
    } else {
      setHoveredElement(null)
    }

    if (tool === 'connection' && connectionStart) {
      setConnectionStart({ ...connectionStart, mousePos: { x, y } })
    }

    if (tool === 'border' && borderStart) {
      setBorderStart({ ...borderStart, current: { x: snapToGrid(x), y: snapToGrid(y) } })
    }

    if ((tool === 'node' || tool === 'text') && nodeStart) {
      setNodeStart({ ...nodeStart, current: { x: snapToGrid(x), y: snapToGrid(y) } })
    }

    if (tool === 'select' && draggedNode) {
      let targetX = snapToGrid(x - offset.x)
      let targetY = snapToGrid(y - offset.y)

      const { x: snappedX, y: snappedY, guides, strength } = applyMagneticSnap(
        targetX,
        targetY,
        draggedNode.width,
        draggedNode.height
      )

      setSnapGuides(guides)
      setIsSnapping(guides.length > 0)
      setSnapStrength(strength)

      onNodesChange(
        nodes.map(node =>
          node.id === draggedNode.id
            ? { ...node, x: snappedX, y: snappedY }
            : node
        )
      )
    } else {
      setSnapGuides([])
      setIsSnapping(false)
    }
  }

  const handleMouseUp = () => {
    setDraggedNode(null)
    setSnapGuides([])
    setIsSnapping(false)
    setSnapStrength(0)

    if (tool === 'border' && borderStart) {
      const x = Math.min(borderStart.start.x, borderStart.current.x)
      const y = Math.min(borderStart.start.y, borderStart.current.y)
      const w = Math.abs(borderStart.current.x - borderStart.start.x)
      const h = Math.abs(borderStart.current.y - borderStart.start.y)

      if (w > 10 && h > 10) {
        const newBorder = {
          id: `border-${Date.now()}`,
          x,
          y,
          w,
          h,
          color: borderColor,
          lineWidth: borderWidth
        }
        onBordersChange([...borders, newBorder])
      }
      setBorderStart(null)
    }

    if ((tool === 'node' || tool === 'text') && nodeStart) {
      const x = Math.min(nodeStart.start.x, nodeStart.current.x)
      const y = Math.min(nodeStart.start.y, nodeStart.current.y)
      const width = Math.abs(nodeStart.current.x - nodeStart.start.x)
      const height = Math.abs(nodeStart.current.y - nodeStart.start.y)

      if (width > 20 && height > 20) {
        const newNode = {
          id: `node-${Date.now()}`,
          x,
          y,
          width,
          height,
          shape: nodeStart.shape,
          color: tool === 'text' ? 'transparent' : nodeColor,
          label: tool === 'text' ? 'Text' : 'New Node'
        }
        onNodesChange([...nodes, newNode])

        if (tool === 'text') {
          setTimeout(() => {
            setEditingNode(newNode)
            setEditText('Text')
          }, 0)
        }
      }
      setNodeStart(null)
    }
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (editingNode) {
      onNodesChange(nodes.map(node =>
        node.id === editingNode.id
          ? { ...node, label: editText }
          : node
      ))
      setEditingNode(null)
      setEditText('')
    }
  }

  const handleEditBlur = () => {
    if (editingNode) {
      onNodesChange(nodes.map(node =>
        node.id === editingNode.id
          ? { ...node, label: editText }
          : node
      ))
      setEditingNode(null)
      setEditText('')
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: tool === 'select'
            ? (isSnapping ? 'crosshair' : hoveredElement ? 'pointer' : draggedNode ? 'grabbing' : 'default')
            : (tool === 'delete' && hoveredElement ? 'pointer' : 'crosshair')
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {
          handleMouseUp()
          setConnectionStart(null)
          setBorderStart(null)
          setNodeStart(null)
          setHoveredElement(null)
        }}
      />
      {editingNode && (
        <form
          onSubmit={handleEditSubmit}
          style={{
            position: 'absolute',
            left: editingNode.x,
            top: editingNode.y,
            width: editingNode.width,
            height: editingNode.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditBlur}
            className="w-full h-full text-center bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-lg px-3 outline-none text-foreground shadow-lg"
            style={{ fontSize: '14px', fontWeight: '500' }}
          />
        </form>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={() => setContextMenu(null)}
        />
      )}
      {modalConfig && (
        <Modal
          isOpen={!!modalConfig}
          onClose={() => setModalConfig(null)}
          title={modalConfig.title}
          fields={modalConfig.fields}
          onSubmit={modalConfig.onSubmit}
        />
      )}
    </div>
  )
})

export default SchemaCanvas
