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
  const [selectedElements, setSelectedElements] = useState([])
  const [selectionBox, setSelectionBox] = useState(null)
  const [modalConfig, setModalConfig] = useState(null)
  const [hoveredElement, setHoveredElement] = useState(null)
  const [snapGuides, setSnapGuides] = useState([])
  const [isSnapping, setIsSnapping] = useState(false)
  const [snapStrength, setSnapStrength] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const inputRef = useRef(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => {
    zoomRef.current = zoom
    panRef.current = pan
  }, [zoom, pan])

  const NODE_SIZES = {
    small: { width: 120, height: 60 },
    medium: { width: 150, height: 80 },
    large: { width: 200, height: 100 },
    custom: { width: customWidth, height: customHeight },
  }

  const screenToCanvas = (screenX, screenY) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    }
  }

  const canvasToScreen = (canvasX, canvasY) => {
    return {
      x: canvasX * zoom + pan.x,
      y: canvasY * zoom + pan.y
    }
  }

  const isElementSelected = (type, id) => {
    return selectedElements.some(el => el.type === type && el.id === id)
  }

  const isNodeInBox = (node, box) => {
    const boxLeft = Math.min(box.startX, box.endX)
    const boxRight = Math.max(box.startX, box.endX)
    const boxTop = Math.min(box.startY, box.endY)
    const boxBottom = Math.max(box.startY, box.endY)

    const nodeRight = node.x + node.width
    const nodeBottom = node.y + node.height

    return node.x < boxRight && nodeRight > boxLeft &&
           node.y < boxBottom && nodeBottom > boxTop
  }

  useImperativeHandle(ref, () => ({
    alignSelectedElements: (direction) => {
      if (selectedElements.length < 2) return

      const selectedNodeIds = selectedElements
        .filter(el => el.type === 'node')
        .map(el => el.id)

      const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id))

      if (selectedNodes.length < 2) return

      const updatedNodes = nodes.map(node => {
        if (!selectedNodeIds.includes(node.id)) {
          return node
        }

        switch (direction) {
          case 'left': {
            const minX = Math.min(...selectedNodes.map(n => n.x))
            return { ...node, x: minX }
          }
          case 'right': {
            const maxRight = Math.max(...selectedNodes.map(n => n.x + n.width))
            return { ...node, x: maxRight - node.width }
          }
          case 'top': {
            const minY = Math.min(...selectedNodes.map(n => n.y))
            return { ...node, y: minY }
          }
          case 'bottom': {
            const maxBottom = Math.max(...selectedNodes.map(n => n.y + n.height))
            return { ...node, y: maxBottom - node.height }
          }
          case 'centerH': {
            const avgCenterX = selectedNodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / selectedNodes.length
            return { ...node, x: avgCenterX - node.width / 2 }
          }
          case 'centerV': {
            const avgCenterY = selectedNodes.reduce((sum, n) => sum + n.y + n.height / 2, 0) / selectedNodes.length
            return { ...node, y: avgCenterY - node.height / 2 }
          }
          default:
            return node
        }
      })

      onNodesChange(updatedNodes)
    },

    distributeSelectedElements: (direction) => {
      if (selectedElements.length < 3) return

      const selectedNodeIds = selectedElements
        .filter(el => el.type === 'node')
        .map(el => el.id)

      const selectedNodes = nodes
        .filter(node => selectedNodeIds.includes(node.id))
        .sort((a, b) => direction === 'horizontal' ? a.x - b.x : a.y - b.y)

      if (selectedNodes.length < 3) return

      const first = selectedNodes[0]
      const last = selectedNodes[selectedNodes.length - 1]

      const positionMap = new Map()

      if (direction === 'horizontal') {
        const totalSpace = (last.x + last.width) - first.x
        const totalNodeWidth = selectedNodes.reduce((sum, n) => sum + n.width, 0)
        const gap = (totalSpace - totalNodeWidth) / (selectedNodes.length - 1)

        let currentX = first.x

        selectedNodes.forEach((node, index) => {
          if (index === 0) {
            positionMap.set(node.id, node.x)
          } else if (index === selectedNodes.length - 1) {
            positionMap.set(node.id, node.x)
          } else {
            currentX += selectedNodes[index - 1].width + gap
            positionMap.set(node.id, currentX)
          }
        })
      } else {
        const totalSpace = (last.y + last.height) - first.y
        const totalNodeHeight = selectedNodes.reduce((sum, n) => sum + n.height, 0)
        const gap = (totalSpace - totalNodeHeight) / (selectedNodes.length - 1)

        let currentY = first.y

        selectedNodes.forEach((node, index) => {
          if (index === 0) {
            positionMap.set(node.id, node.y)
          } else if (index === selectedNodes.length - 1) {
            positionMap.set(node.id, node.y)
          } else {
            currentY += selectedNodes[index - 1].height + gap
            positionMap.set(node.id, currentY)
          }
        })
      }

      const updatedNodes = nodes.map(node => {
        if (!positionMap.has(node.id)) {
          return node
        }

        if (direction === 'horizontal') {
          return { ...node, x: positionMap.get(node.id) }
        } else {
          return { ...node, y: positionMap.get(node.id) }
        }
      })

      onNodesChange(updatedNodes)
    },

    changeZOrder: (action) => {
      if (selectedElements.length === 0) return

      const selectedNodeIds = selectedElements
        .filter(el => el.type === 'node')
        .map(el => el.id)

      if (selectedNodeIds.length === 0) return

      const updatedNodes = [...nodes]

      switch (action) {
        case 'front': {
          const selected = []
          const others = []

          updatedNodes.forEach(node => {
            if (selectedNodeIds.includes(node.id)) {
              selected.push(node)
            } else {
              others.push(node)
            }
          })

          onNodesChange([...others, ...selected])
          break
        }
        case 'back': {
          const selected = []
          const others = []

          updatedNodes.forEach(node => {
            if (selectedNodeIds.includes(node.id)) {
              selected.push(node)
            } else {
              others.push(node)
            }
          })

          onNodesChange([...selected, ...others])
          break
        }
        case 'forward': {
          const newOrder = [...updatedNodes]

          for (let i = newOrder.length - 2; i >= 0; i--) {
            if (selectedNodeIds.includes(newOrder[i].id) && !selectedNodeIds.includes(newOrder[i + 1].id)) {
              [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]]
            }
          }

          onNodesChange(newOrder)
          break
        }
        case 'backward': {
          const newOrder = [...updatedNodes]

          for (let i = 1; i < newOrder.length; i++) {
            if (selectedNodeIds.includes(newOrder[i].id) && !selectedNodeIds.includes(newOrder[i - 1].id)) {
              [newOrder[i], newOrder[i - 1]] = [newOrder[i - 1], newOrder[i]]
            }
          }

          onNodesChange(newOrder)
          break
        }
      }
    },

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
    },

    exportToSVG: (options = {}) => {
      const {
        filename = 'schemati-diagram',
        cropToContent = true,
        padding = 50
      } = options

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

      if (cropToContent && (nodes.length > 0 || borders.length > 0)) {
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

        minX -= padding
        minY -= padding
        maxX += padding
        maxY += padding
      } else {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        minX = 0
        minY = 0
        maxX = rect.width
        maxY = rect.height
      }

      const width = maxX - minX
      const height = maxY - minY

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">\n`

      svgContent += `  <defs>\n`
      svgContent += `    <style>\n`
      svgContent += `      .node-text { font-family: system-ui, -apple-system, sans-serif; text-anchor: middle; dominant-baseline: middle; }\n`
      svgContent += `    </style>\n`
      svgContent += `  </defs>\n\n`

      borders.forEach(border => {
        const { x, y, w, h, color, lineWidth, backgroundColor = 'transparent', backgroundOpacity = 0, opacity = 1, borderRadius = 0 } = border

        if (backgroundColor !== 'transparent' && backgroundOpacity > 0) {
          svgContent += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${borderRadius}" fill="${backgroundColor}" fill-opacity="${backgroundOpacity}" opacity="${opacity}" />\n`
        }

        svgContent += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${borderRadius}" fill="none" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}" />\n`
      })

      connections.forEach(connection => {
        const fromNode = nodes.find(n => n.id === connection.from)
        const toNode = nodes.find(n => n.id === connection.to)
        if (!fromNode || !toNode) return

        const from = getNodeEdgePoint(fromNode, toNode)
        const to = getNodeEdgePoint(toNode, fromNode)

        const { color, width = 3, opacity = 1, lineStyle = 'solid', dashLength = 8, gapLength = 4, arrowSize = 16 } = connection

        let pathD = ''
        let strokeDasharray = 'none'

        if (lineStyle === 'dashed') {
          strokeDasharray = `${dashLength},${gapLength}`
        } else if (lineStyle === 'dotted') {
          strokeDasharray = `1,${gapLength}`
        }

        let angle = 0
        let adjustedTo = { x: to.x, y: to.y }

        if (connection.style === 'straight') {
          angle = Math.atan2(to.y - from.y, to.x - from.x)
          const arrowOffset = arrowSize * 1.15
          adjustedTo = {
            x: to.x - arrowOffset * Math.cos(angle),
            y: to.y - arrowOffset * Math.sin(angle)
          }
          pathD = `M ${from.x} ${from.y} L ${adjustedTo.x} ${adjustedTo.y}`
        } else if (connection.style === 'curved') {
          const curvature = connection.curvature !== undefined ? connection.curvature : 0.5
          const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
          const controlPointOffset = distance * curvature
          const cp1x = from.x + controlPointOffset
          const cp1y = from.y
          const cp2x = to.x - controlPointOffset
          const cp2y = to.y

          const derivX = 3 * (cp2x - cp1x)
          const derivY = 3 * (cp2y - cp1y) + 3 * (to.y - cp2y)
          angle = Math.atan2(derivY, derivX)

          const arrowOffset = arrowSize * 1.15
          adjustedTo = {
            x: to.x - arrowOffset * Math.cos(angle),
            y: to.y - arrowOffset * Math.sin(angle)
          }

          const adjustedCp2x = adjustedTo.x - controlPointOffset
          const adjustedCp2y = adjustedTo.y
          pathD = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${adjustedCp2x} ${adjustedCp2y}, ${adjustedTo.x} ${adjustedTo.y}`
        } else if (connection.style === 'orthogonal') {
          const midX = (from.x + to.x) / 2

          if (Math.abs(midX - to.x) < 1) {
            angle = to.y > from.y ? Math.PI / 2 : -Math.PI / 2
          } else {
            angle = to.x > midX ? 0 : Math.PI
          }

          const arrowOffset = arrowSize * 1.15
          adjustedTo = {
            x: to.x - arrowOffset * Math.cos(angle),
            y: to.y - arrowOffset * Math.sin(angle)
          }

          pathD = `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${adjustedTo.y} L ${adjustedTo.x} ${adjustedTo.y}`
        }

        svgContent += `  <path d="${pathD}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${strokeDasharray}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" />\n`

        const arrowWidth = arrowSize * 0.65
        const arrowLength = arrowSize
        const arrowX1 = -arrowLength * Math.cos(angle) + (arrowWidth / 2) * Math.sin(angle)
        const arrowY1 = -arrowLength * Math.sin(angle) - (arrowWidth / 2) * Math.cos(angle)
        const arrowX2 = -arrowLength * Math.cos(angle) - (arrowWidth / 2) * Math.sin(angle)
        const arrowY2 = -arrowLength * Math.sin(angle) + (arrowWidth / 2) * Math.cos(angle)
        const arrowPoints = `${to.x},${to.y} ${to.x + arrowX1},${to.y + arrowY1} ${to.x + arrowX2},${to.y + arrowY2}`
        svgContent += `  <polygon points="${arrowPoints}" fill="${color}" opacity="${opacity}" />\n`
      })

      nodes.forEach(node => {
        const { x, y, width, height, shape, label, backgroundColor = '#ffffff', borderColor = node.color || '#3b82f6', borderWidth = 2.5, borderRadius = 8, opacity = 1, fontSize = 14, fontColor = '#1f2937', fontWeight = '500' } = node

        if (shape === 'rectangle') {
          svgContent += `  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${borderRadius}" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="${borderWidth}" opacity="${opacity}" />\n`
        } else if (shape === 'circle') {
          const radius = Math.min(width, height) / 2
          const cx = x + width / 2
          const cy = y + height / 2
          svgContent += `  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="${borderWidth}" opacity="${opacity}" />\n`
        } else if (shape === 'diamond') {
          const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`
          svgContent += `  <polygon points="${points}" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="${borderWidth}" opacity="${opacity}" />\n`
        }

        if (label) {
          const textX = x + width / 2
          const textY = y + height / 2
          svgContent += `  <text x="${textX}" y="${textY}" class="node-text" fill="${fontColor}" font-size="${fontSize}" font-weight="${fontWeight}" opacity="${opacity}">${label}</text>\n`
        }
      })

      svgContent += `</svg>`

      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${filename}.svg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }))

  const SNAP_THRESHOLD = 15

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
      width = 3,
      opacity = 1,
      lineStyle = 'solid',
      dashLength = 8,
      gapLength = 4,
      arrowSize = 16,
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

    let angle = 0
    let adjustedTo = { x: to.x, y: to.y }

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)

    if (connection.style === 'straight') {
      angle = Math.atan2(to.y - from.y, to.x - from.x)

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }
      }

      ctx.lineTo(adjustedTo.x, adjustedTo.y)
    } else if (connection.style === 'curved') {
      const curvature = connection.curvature !== undefined ? connection.curvature : 0.5
      const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
      const controlPointOffset = distance * curvature
      const cp1x = from.x + controlPointOffset
      const cp1y = from.y
      const cp2x = to.x - controlPointOffset
      const cp2y = to.y

      const derivX = 3 * (cp2x - cp1x)
      const derivY = 3 * (cp2y - cp1y) + 3 * (to.y - cp2y)
      angle = Math.atan2(derivY, derivX)

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }

        const adjustedCp2x = adjustedTo.x - controlPointOffset
        const adjustedCp2y = adjustedTo.y
        ctx.bezierCurveTo(cp1x, cp1y, adjustedCp2x, adjustedCp2y, adjustedTo.x, adjustedTo.y)
      } else {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y)
      }
    } else if (connection.style === 'orthogonal') {
      const midX = (from.x + to.x) / 2

      if (Math.abs(midX - to.x) < 1) {
        angle = to.y > from.y ? Math.PI / 2 : -Math.PI / 2
      } else {
        angle = to.x > midX ? 0 : Math.PI
      }

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }
      }

      ctx.lineTo(midX, from.y)
      ctx.lineTo(midX, adjustedTo.y)
      ctx.lineTo(adjustedTo.x, adjustedTo.y)
    }

    ctx.stroke()
    ctx.setLineDash([])

    if (arrowStyle !== 'none') {
      const arrowLength = arrowSize
      const arrowWidth = arrowSize * 0.65

      ctx.save()
      ctx.translate(to.x, to.y)
      ctx.rotate(angle)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-arrowLength, arrowWidth / 2)
      ctx.lineTo(-arrowLength, -arrowWidth / 2)
      ctx.closePath()

      if (arrowStyle === 'filled') {
        ctx.fillStyle = color
        ctx.fill()
      } else if (arrowStyle === 'outlined') {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.stroke()
      }

      ctx.restore()
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

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

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

    if (selectionBox) {
      const x = Math.min(selectionBox.startX, selectionBox.endX)
      const y = Math.min(selectionBox.startY, selectionBox.endY)
      const width = Math.abs(selectionBox.endX - selectionBox.startX)
      const height = Math.abs(selectionBox.endY - selectionBox.startY)

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 3])
      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [nodes, connections, borders, connectionStart, borderStart, nodeStart, gridEnabled, gridSize, selectedElement, selectedElements, selectionBox, snapGuides, zoom, pan])

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

      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }

      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && !editingNode) {
        e.preventDefault()
        const allElements = nodes.map(node => ({ type: 'node', id: node.id }))
        setSelectedElements(allElements)
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length > 0 && !editingNode) {
        e.preventDefault()
        const selectedNodeIds = selectedElements
          .filter(el => el.type === 'node')
          .map(el => el.id)

        onNodesChange(nodes.filter(node => !selectedNodeIds.includes(node.id)))
        onConnectionsChange(connections.filter(c => !selectedNodeIds.includes(c.from) && !selectedNodeIds.includes(c.to)))
        setSelectedElements([])
      }

      if (e.key === 'Escape') {
        setSelectedElements([])
        setSelectionBox(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, copiedNode, editingNode, onNodesChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const currentZoom = zoomRef.current
      const currentPan = panRef.current

      const canvasPoint = {
        x: (mouseX - currentPan.x) / currentZoom,
        y: (mouseY - currentPan.y) / currentZoom
      }

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(Math.max(0.1, currentZoom * zoomFactor), 5)

      const newPan = {
        x: mouseX - canvasPoint.x * newZoom,
        y: mouseY - canvasPoint.y * newZoom
      }

      setZoom(newZoom)
      setPan(newPan)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

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

    const isSelected = (selectedElement && selectedElement.type === 'node' && selectedElement.id === node.id) || isElementSelected('node', node.id)

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
      width = 3,
      opacity = 1,
      lineStyle = 'solid',
      dashLength = 8,
      gapLength = 4,
      arrowSize = 16,
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

    let angle = 0
    let adjustedTo = { x: to.x, y: to.y }

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)

    if (connection.style === 'straight') {
      angle = Math.atan2(to.y - from.y, to.x - from.x)

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }
      }

      ctx.lineTo(adjustedTo.x, adjustedTo.y)
    } else if (connection.style === 'curved') {
      const curvature = connection.curvature !== undefined ? connection.curvature : 0.5
      const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
      const controlPointOffset = distance * curvature
      const cp1x = from.x + controlPointOffset
      const cp1y = from.y
      const cp2x = to.x - controlPointOffset
      const cp2y = to.y

      const derivX = 3 * (cp2x - cp1x)
      const derivY = 3 * (cp2y - cp1y) + 3 * (to.y - cp2y)
      angle = Math.atan2(derivY, derivX)

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }

        const adjustedCp2x = adjustedTo.x - controlPointOffset
        const adjustedCp2y = adjustedTo.y
        ctx.bezierCurveTo(cp1x, cp1y, adjustedCp2x, adjustedCp2y, adjustedTo.x, adjustedTo.y)
      } else {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y)
      }
    } else if (connection.style === 'orthogonal') {
      const midX = (from.x + to.x) / 2

      if (Math.abs(midX - to.x) < 1) {
        angle = to.y > from.y ? Math.PI / 2 : -Math.PI / 2
      } else {
        angle = to.x > midX ? 0 : Math.PI
      }

      if (arrowStyle !== 'none') {
        const arrowOffset = arrowSize * 1.15
        adjustedTo = {
          x: to.x - arrowOffset * Math.cos(angle),
          y: to.y - arrowOffset * Math.sin(angle)
        }
      }

      ctx.lineTo(midX, from.y)
      ctx.lineTo(midX, adjustedTo.y)
      ctx.lineTo(adjustedTo.x, adjustedTo.y)
    }

    ctx.stroke()
    ctx.setLineDash([])

    if (arrowStyle !== 'none') {
      const arrowLength = arrowSize
      const arrowWidth = arrowSize * 0.65

      ctx.save()
      ctx.translate(to.x, to.y)
      ctx.rotate(angle)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-arrowLength, arrowWidth / 2)
      ctx.lineTo(-arrowLength, -arrowWidth / 2)
      ctx.closePath()

      if (arrowStyle === 'filled') {
        ctx.fillStyle = color
        ctx.fill()
      } else if (arrowStyle === 'outlined') {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.stroke()
      }

      ctx.restore()
    }

    ctx.globalAlpha = 1
  }

  const drawTempConnection = (ctx, fromNode, mousePos) => {
    const tempToNode = { x: mousePos.x, y: mousePos.y, width: 0, height: 0, shape: 'rectangle' }
    const from = getNodeEdgePoint(fromNode, tempToNode)

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
        const easedOffset = fullOffset * Math.pow(snap.strength, 3)

        snappedX += easedOffset
        appliedVertical.add(snap.value)
        guides.push({ type: 'vertical', value: snap.value, strength: snap.strength })
      } else if (snap.type === 'horizontal' && !appliedHorizontal.has(snap.value)) {
        const edgePosition = elementEdges.find(e => e.name === snap.edgeName).position
        const fullOffset = snap.value - edgePosition
        const easedOffset = fullOffset * Math.pow(snap.strength, 3)

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

      const isSnapped = strength > 0.8
      const red = isSnapped ? 239 : 59
      const green = isSnapped ? 68 : 130
      const blue = isSnapped ? 68 : 246

      ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.setLineDash([8, 4])
      ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${strength * 0.4})`
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

    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y

    if (fromNode.shape === 'circle') {
      const radius = Math.min(fromNode.width, fromNode.height) / 2
      const angle = Math.atan2(dy, dx)
      return {
        x: fromCenter.x + radius * Math.cos(angle),
        y: fromCenter.y + radius * Math.sin(angle)
      }
    } else if (fromNode.shape === 'rectangle') {
      const halfWidth = fromNode.width / 2
      const halfHeight = fromNode.height / 2
      
      if (Math.abs(dx) < 0.0001) {
        return {
          x: fromCenter.x,
          y: fromCenter.y + (dy >= 0 ? halfHeight : -halfHeight)
        }
      }
      
      if (Math.abs(dy) < 0.0001) {
        return {
          x: fromCenter.x + (dx >= 0 ? halfWidth : -halfWidth),
          y: fromCenter.y
        }
      }
      
      const slope = dy / dx
      const invSlope = dx / dy
      
      const rightX = halfWidth
      const leftX = -halfWidth
      const topY = -halfHeight
      const bottomY = halfHeight
      
      const rightY = slope * rightX
      const leftY = slope * leftX
      const topX = invSlope * topY
      const bottomX = invSlope * bottomY
      
      let edgeX, edgeY
      
      if (dx > 0 && dy > 0) {
        if (rightY <= bottomY) {
          edgeX = rightX
          edgeY = rightY
        } else {
          edgeX = bottomX
          edgeY = bottomY
        }
      } else if (dx > 0 && dy < 0) {
        if (rightY >= topY) {
          edgeX = rightX
          edgeY = rightY
        } else {
          edgeX = topX
          edgeY = topY
        }
      } else if (dx < 0 && dy > 0) {
        if (leftY <= bottomY) {
          edgeX = leftX
          edgeY = leftY
        } else {
          edgeX = bottomX
          edgeY = bottomY
        }
      } else {
        if (leftY >= topY) {
          edgeX = leftX
          edgeY = leftY
        } else {
          edgeX = topX
          edgeY = topY
        }
      }
      
      return {
        x: fromCenter.x + edgeX,
        y: fromCenter.y + edgeY
      }
    } else if (fromNode.shape === 'diamond') {
      const halfWidth = fromNode.width / 2
      const halfHeight = fromNode.height / 2
      
      if (Math.abs(dx) < 0.0001) {
        return {
          x: fromCenter.x,
          y: fromCenter.y + (dy >= 0 ? halfHeight : -halfHeight)
        }
      }
      
      if (Math.abs(dy) < 0.0001) {
        return {
          x: fromCenter.x + (dx >= 0 ? halfWidth : -halfWidth),
          y: fromCenter.y
        }
      }
      
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const slope = absDy / absDx
      const diamondSlope = halfHeight / halfWidth
      
      let edgeX, edgeY
      
      if (slope <= diamondSlope) {
        edgeX = dx >= 0 ? halfWidth : -halfWidth
        edgeY = edgeX * (dy / dx)
      } else {
        edgeY = dy >= 0 ? halfHeight : -halfHeight
        edgeX = edgeY * (dx / dy)
      }
      
      return {
        x: fromCenter.x + edgeX,
        y: fromCenter.y + edgeY
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
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { x, y } = screenToCanvas(screenX, screenY)

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

    if (isPanning) {
      return
    }

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { x, y } = screenToCanvas(screenX, screenY)

    const clickedNode = getClickedNode(x, y)
    const clickedConnection = getClickedConnection(x, y)
    const clickedBorder = getClickedBorder(x, y)

    if (clickedNode) {
      setSelectedElement({ type: 'node', id: clickedNode.id })

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
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

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
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
                  { name: 'curvature', label: 'Curvature', type: 'number', defaultValue: clickedConnection.curvature !== undefined ? clickedConnection.curvature : 0.5, min: 0, max: 2, step: 0.1 },
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
                      curvature: parseFloat(values.curvature),
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

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
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
        const from = getNodeEdgePoint(fromNode, toNode)
        const to = getNodeEdgePoint(toNode, fromNode)
        
        let distance
        if (connection.style === 'curved') {
          const curvature = connection.curvature !== undefined ? connection.curvature : 0.5
          const dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
          const controlPointOffset = dist * curvature
          const cp1x = from.x + controlPointOffset
          const cp1y = from.y
          const cp2x = to.x - controlPointOffset
          const cp2y = to.y
          distance = distanceToBezierCurve(x, y, from.x, from.y, cp1x, cp1y, cp2x, cp2y, to.x, to.y)
        } else {
          distance = distanceToLine(x, y, from.x, from.y, to.x, to.y)
        }
        
        if (distance < 15) {
          return connection
        }
      }
    }
    return null
  }
  
  const distanceToBezierCurve = (px, py, x0, y0, x1, y1, x2, y2, x3, y3) => {
    let minDistance = Infinity
    const steps = 100
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const mt = 1 - t
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
      const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2))
      minDistance = Math.min(minDistance, distance)
    }
    
    return minDistance
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
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { x, y } = screenToCanvas(screenX, screenY)

    const clickedNode = getClickedNode(x, y)
    if (clickedNode) {
      setEditingNode(clickedNode)
      setEditText(clickedNode.label || '')
    }
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.spaceKey)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y })
      canvas.style.cursor = 'grabbing'
      return
    }

    const { x, y } = screenToCanvas(screenX, screenY)

    if (tool === 'select') {
      const clickedNode = getClickedNode(x, y)
      if (clickedNode) {
        if (e.ctrlKey || e.metaKey) {
          if (isElementSelected('node', clickedNode.id)) {
            setSelectedElements(selectedElements.filter(el => !(el.type === 'node' && el.id === clickedNode.id)))
          } else {
            setSelectedElements([...selectedElements, { type: 'node', id: clickedNode.id }])
          }
        } else {
          if (!isElementSelected('node', clickedNode.id)) {
            setSelectedElements([{ type: 'node', id: clickedNode.id }])
          }
          setDraggedNode(clickedNode)
          setOffset({ x: x - clickedNode.x, y: y - clickedNode.y })
        }
      } else {
        if (!(e.ctrlKey || e.metaKey)) {
          setSelectedElements([])
        }
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
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
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    if (isPanning) {
      setPan({
        x: screenX - panStart.x,
        y: screenY - panStart.y
      })
      return
    }

    const { x, y } = screenToCanvas(screenX, screenY)

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

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX: x, endY: y })
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

      const deltaX = snappedX - draggedNode.x
      const deltaY = snappedY - draggedNode.y

      if (selectedElements.length > 1 && isElementSelected('node', draggedNode.id)) {
        const selectedNodeIds = selectedElements
          .filter(el => el.type === 'node')
          .map(el => el.id)

        onNodesChange(
          nodes.map(node =>
            selectedNodeIds.includes(node.id)
              ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
              : node
          )
        )
      } else {
        onNodesChange(
          nodes.map(node =>
            node.id === draggedNode.id
              ? { ...node, x: snappedX, y: snappedY }
              : node
          )
        )
      }
    } else {
      setSnapGuides([])
      setIsSnapping(false)
    }
  }

  const handleMouseUp = () => {
    const canvas = canvasRef.current
    if (canvas && isPanning) {
      canvas.style.cursor = ''
    }
    setIsPanning(false)
    setDraggedNode(null)
    setSnapGuides([])
    setIsSnapping(false)
    setSnapStrength(0)

    if (selectionBox) {
      const width = Math.abs(selectionBox.endX - selectionBox.startX)
      const height = Math.abs(selectionBox.endY - selectionBox.startY)

      if (width > 5 && height > 5) {
        const selectedNodes = nodes.filter(node => isNodeInBox(node, selectionBox))
        const newSelection = selectedNodes.map(node => ({ type: 'node', id: node.id }))
        setSelectedElements(newSelection)
      }

      setSelectionBox(null)
    }

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
          cursor: isPanning ? 'grabbing' : tool === 'select'
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
            left: editingNode.x * zoom + pan.x,
            top: editingNode.y * zoom + pan.y,
            width: editingNode.width * zoom,
            height: editingNode.height * zoom,
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
            style={{ fontSize: `${14 * zoom}px`, fontWeight: '500' }}
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
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none select-none">
        <div className="text-xs font-medium text-foreground">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  )
})

export default SchemaCanvas
