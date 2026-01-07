import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { MousePointer2, Square, Circle, Diamond, ArrowRight, Trash2, Type, Download, Upload, Image, RectangleHorizontal, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sidebar({
  tool,
  onToolChange,
  nodeShape,
  onNodeShapeChange,
  nodeColor,
  onNodeColorChange,
  nodeSize,
  onNodeSizeChange,
  customWidth,
  customHeight,
  onCustomSizeChange,
  connectionStyle,
  onConnectionStyleChange,
  connectionColor,
  onConnectionColorChange,
  connectionLineStyle,
  onConnectionLineStyleChange,
  dashLength,
  onDashLengthChange,
  gapLength,
  onGapLengthChange,
  borderColor,
  onBorderColorChange,
  borderWidth,
  onBorderWidthChange,
  gridEnabled,
  onGridEnabledChange,
  gridSize,
  onGridSizeChange,
  onExport,
  onExportPNG,
  onImport,
}) {
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 1024)

  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1024
      setIsSmallScreen(isSmall)
      if (!isSmall) {
        setIsPinned(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const shouldShowSidebar = isPinned || !isSmallScreen || isHovered

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'node', icon: Square, label: 'Add Node' },
    { id: 'text', icon: Type, label: 'Add Text' },
    { id: 'connection', icon: ArrowRight, label: 'Connect' },
    { id: 'border', icon: RectangleHorizontal, label: 'Border' },
    { id: 'delete', icon: Trash2, label: 'Delete' },
  ]

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
  ]

  const sizes = [
    { id: 'small', label: 'Small', width: 120, height: 60 },
    { id: 'medium', label: 'Medium', width: 150, height: 80 },
    { id: 'large', label: 'Large', width: 200, height: 100 },
    { id: 'custom', label: 'Custom', width: customWidth, height: customHeight },
  ]

  const connectionStyles = [
    { id: 'curved', label: 'Curved', description: 'Smooth bezier curves' },
    { id: 'straight', label: 'Straight', description: 'Direct lines' },
    { id: 'orthogonal', label: 'Orthogonal', description: 'Right-angle paths' },
  ]

  const colors = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
    { value: '#000000', label: 'Black' },
  ]

  return (
    <>
      {isSmallScreen && !isPinned && (
        <div
          className="fixed left-0 top-[84px] bottom-3 w-16 z-40"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      )}

      <div
        className={cn(
          "border-r border-border bg-card overflow-y-auto hide-scrollbar transition-all duration-300",
          !isSmallScreen && "relative w-80",
          isSmallScreen && "fixed left-0 z-50",
          isSmallScreen && isPinned && "top-[72px] bottom-0 w-80 shadow-lg",
          isSmallScreen && !isPinned && "top-[84px] bottom-3 w-72 shadow-2xl",
          isSmallScreen && !isPinned && !shouldShowSidebar && "-translate-x-full",
          isSmallScreen && !isPinned && shouldShowSidebar && "ml-3 rounded-2xl backdrop-blur-xl bg-card/95"
        )}
        onMouseEnter={() => isSmallScreen && !isPinned && setIsHovered(true)}
        onMouseLeave={() => isSmallScreen && !isPinned && setIsHovered(false)}
      >
        <div className={cn(
          "space-y-3 pb-8",
          isSmallScreen && !isPinned ? "p-3 space-y-2 text-xs [&_button]:text-xs [&_input]:text-xs [&_label]:text-[10px]" : "p-4"
        )}>
          {isSmallScreen && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                className="h-8 w-8 p-0"
              >
                {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader className={cn(
              isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4"
            )}>
              <CardTitle className={cn(
                "font-semibold",
                isSmallScreen && !isPinned ? "text-xs" : "text-sm"
              )}>Tools</CardTitle>
            </CardHeader>
            <CardContent className={cn(
              "grid grid-cols-2",
              isSmallScreen && !isPinned ? "gap-1.5" : "gap-2"
            )}>
              {tools.map(t => (
                <Button
                  key={t.id}
                  variant={tool === t.id ? 'default' : 'outline'}
                  className={cn(
                    "justify-start",
                    isSmallScreen && !isPinned && "text-xs h-8 px-2"
                  )}
                  size="sm"
                  onClick={() => onToolChange(t.id)}
                >
                  <t.icon className={cn(
                    isSmallScreen && !isPinned ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4"
                  )} />
                  {t.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(
              isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4"
            )}>
              <CardTitle className={cn(
                "font-semibold",
                isSmallScreen && !isPinned ? "text-xs" : "text-sm"
              )}>Node Shape</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "grid grid-cols-3",
                isSmallScreen && !isPinned ? "gap-1.5" : "gap-2"
              )}>
                {shapes.map(shape => (
                  <Button
                    key={shape.id}
                    variant={nodeShape === shape.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onNodeShapeChange(shape.id)}
                    title={shape.label}
                    className={cn(
                      "aspect-square p-0",
                      isSmallScreen && !isPinned && "h-8"
                    )}
                  >
                    <shape.icon className={cn(
                      isSmallScreen && !isPinned ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(
              isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4"
            )}>
              <CardTitle className={cn(
                "font-semibold",
                isSmallScreen && !isPinned ? "text-xs" : "text-sm"
              )}>Node Color</CardTitle>
            </CardHeader>
            <CardContent className={cn(
              isSmallScreen && !isPinned ? "space-y-2" : "space-y-3"
            )}>
              <div className={cn(
                "grid grid-cols-8",
                isSmallScreen && !isPinned ? "gap-1.5" : "gap-2"
              )}>
                {colors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => onNodeColorChange(color.value)}
                    className={cn(
                      "rounded-md border-2 transition-all hover:scale-110",
                      isSmallScreen && !isPinned ? "w-6 h-6" : "w-7 h-7",
                      nodeColor === color.value ? "border-primary ring-2 ring-primary/20 scale-110" : "border-border"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div>
                <Label htmlFor="custom-node-color" className={cn(
                  "text-muted-foreground mb-1.5 block",
                  isSmallScreen && !isPinned ? "text-[10px]" : "text-xs"
                )}>
                  Custom Color
                </Label>
                <input
                  id="custom-node-color"
                  type="color"
                  value={nodeColor}
                  onChange={(e) => onNodeColorChange(e.target.value)}
                  className={cn(
                    "w-full rounded-md border border-input cursor-pointer bg-background",
                    isSmallScreen && !isPinned ? "h-8" : "h-9"
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Node Size</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-2" : "space-y-3")}>
              <div className="grid grid-cols-3 gap-2">
                {sizes.slice(0, 3).map(size => (
                  <Button
                    key={size.id}
                    variant={nodeSize === size.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onNodeSizeChange(size.id)}
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Custom Size (px)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="custom-width" className="text-xs mb-1 block">Width</Label>
                    <input
                      id="custom-width"
                      type="number"
                      min="50"
                      max="500"
                      value={customWidth}
                      onChange={(e) => onCustomSizeChange(parseInt(e.target.value) || 150, customHeight)}
                      className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-height" className="text-xs mb-1 block">Height</Label>
                    <input
                      id="custom-height"
                      type="number"
                      min="30"
                      max="300"
                      value={customHeight}
                      onChange={(e) => onCustomSizeChange(customWidth, parseInt(e.target.value) || 80)}
                      className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant={nodeSize === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onNodeSizeChange('custom')}
                >
                  Apply Custom
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Connection Style</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-1.5" : "space-y-2")}>
              {connectionStyles.map(style => (
                <button
                  key={style.id}
                  onClick={() => onConnectionStyleChange(style.id)}
                  className={cn(
                    "w-full p-3 rounded-md border-2 transition-all text-left",
                    connectionStyle === style.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="font-medium text-sm">{style.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{style.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Connection Color</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-2" : "space-y-3")}>
              <div className="grid grid-cols-8 gap-2">
                {colors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => onConnectionColorChange(color.value)}
                    className={cn(
                      "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                      connectionColor === color.value ? "border-primary ring-2 ring-primary/20 scale-110" : "border-border"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div>
                <Label htmlFor="custom-connection-color" className="text-xs text-muted-foreground mb-1.5 block">
                  Custom Color
                </Label>
                <input
                  id="custom-connection-color"
                  type="color"
                  value={connectionColor}
                  onChange={(e) => onConnectionColorChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input cursor-pointer bg-background"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Line Style</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-2" : "space-y-3")}>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={connectionLineStyle === 'solid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onConnectionLineStyleChange('solid')}
                >
                  Solid
                </Button>
                <Button
                  variant={connectionLineStyle === 'dashed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onConnectionLineStyleChange('dashed')}
                >
                  Dashed
                </Button>
                <Button
                  variant={connectionLineStyle === 'dotted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onConnectionLineStyleChange('dotted')}
                >
                  Dotted
                </Button>
              </div>
              {(connectionLineStyle === 'dashed' || connectionLineStyle === 'dotted') && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Pattern (px)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="dash-length" className="text-xs mb-1 block">Dash</Label>
                      <input
                        id="dash-length"
                        type="number"
                        min="1"
                        max="50"
                        value={dashLength}
                        onChange={(e) => onDashLengthChange(parseInt(e.target.value) || 8)}
                        className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gap-length" className="text-xs mb-1 block">Gap</Label>
                      <input
                        id="gap-length"
                        type="number"
                        min="1"
                        max="50"
                        value={gapLength}
                        onChange={(e) => onGapLengthChange(parseInt(e.target.value) || 4)}
                        className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Border Style</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-2" : "space-y-3")}>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Border Color
                </Label>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => onBorderColorChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input cursor-pointer bg-background"
                />
              </div>
              <div>
                <Label htmlFor="border-width" className="text-xs text-muted-foreground mb-1.5 block">
                  Border Width (px)
                </Label>
                <input
                  id="border-width"
                  type="number"
                  min="1"
                  max="20"
                  value={borderWidth}
                  onChange={(e) => onBorderWidthChange(parseInt(e.target.value) || 2)}
                  className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Grid</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-2" : "space-y-3")}>
              <div className="flex items-center justify-between">
                <Label htmlFor="grid-enabled" className="text-sm">Show Grid</Label>
                <input
                  id="grid-enabled"
                  type="checkbox"
                  checked={gridEnabled}
                  onChange={(e) => onGridEnabledChange(e.target.checked)}
                  className="w-4 h-4 rounded border-input cursor-pointer"
                />
              </div>
              <div>
                <Label htmlFor="grid-size" className="text-xs text-muted-foreground mb-1.5 block">
                  Grid Size (px)
                </Label>
                <input
                  id="grid-size"
                  type="number"
                  min="10"
                  max="100"
                  value={gridSize}
                  onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 20)}
                  className="w-full h-9 rounded-md border border-input px-2 bg-background text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Magnetic Snap
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-150 ease-out rounded-full"
                      style={{
                        width: `${Math.min(100, (gridEnabled ? 60 : 0) + (gridSize / 100) * 40)}%`,
                        opacity: gridEnabled ? 0.8 : 0.4
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {gridEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className={cn(isSmallScreen && !isPinned ? "pb-2 pt-3" : "pb-3 pt-4")}>
              <CardTitle className={cn("font-semibold", isSmallScreen && !isPinned ? "text-xs" : "text-sm")}>Export</CardTitle>
            </CardHeader>
            <CardContent className={cn(isSmallScreen && !isPinned ? "space-y-1.5" : "space-y-2")}>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={onExportPNG}
              >
                <Image className="mr-2 h-4 w-4" />
                Export as PNG
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={onExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={onImport}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
