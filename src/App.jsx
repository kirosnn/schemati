import { useState, useRef, useEffect } from 'react'
import SchemaCanvas from './components/SchemaCanvas'
import Sidebar from './components/Sidebar'
import Modal from './components/Modal'
import { useTheme } from './hooks/useTheme'
import { Moon, Sun, Github, Star } from 'lucide-react'
import { Button } from './components/ui/button'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [tool, setTool] = useState('select')
  const [githubStars, setGithubStars] = useState(null)
  const [nodeShape, setNodeShape] = useState('rectangle')
  const [nodeColor, setNodeColor] = useState('#3b82f6')
  const [nodeSize, setNodeSize] = useState('medium')
  const [customWidth, setCustomWidth] = useState(150)
  const [customHeight, setCustomHeight] = useState(80)
  const [connectionStyle, setConnectionStyle] = useState('curved')
  const [connectionColor, setConnectionColor] = useState('#6b7280')
  const [connectionLineStyle, setConnectionLineStyle] = useState('solid')
  const [dashLength, setDashLength] = useState(8)
  const [gapLength, setGapLength] = useState(4)
  const [exportPNGModal, setExportPNGModal] = useState(null)
  const [borderColor, setBorderColor] = useState('#6b7280')
  const [borderWidth, setBorderWidth] = useState(2)
  const [gridEnabled, setGridEnabled] = useState(false)
  const [gridSize, setGridSize] = useState(20)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [borders, setBorders] = useState([])
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const fetchGithubStars = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/kirosnn/schemati')
        if (response.ok) {
          const data = await response.json()
          setGithubStars(data.stargazers_count)
        }
      } catch (error) {
        console.log('Could not fetch GitHub stars')
      }
    }

    fetchGithubStars()
  }, [])

  const handleCustomSizeChange = (width, height) => {
    setCustomWidth(width)
    setCustomHeight(height)
  }

  const handleExport = () => {
    const data = {
      nodes,
      connections,
      metadata: {
        version: '1.0',
        created: new Date().toISOString()
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schemati-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportPNG = () => {
    setExportPNGModal({
      title: 'Export as PNG',
      fields: [
        { name: 'filename', label: 'File Name', type: 'text', defaultValue: 'schemati-diagram', placeholder: 'Enter filename' },
        { name: 'transparentBackground', label: 'Transparent Background', type: 'checkbox', defaultValue: false },
        { name: 'cropToContent', label: 'Crop to Content', type: 'checkbox', defaultValue: true },
        { name: 'padding', label: 'Padding (px)', type: 'number', defaultValue: 50, min: 0, max: 200, step: 1 },
        { name: 'scale', label: 'Scale', type: 'number', defaultValue: 1, min: 0.5, max: 4, step: 0.1 }
      ],
      onSubmit: (values) => {
        if (canvasRef.current) {
          canvasRef.current.exportToPNG({
            filename: values.filename || 'schemati-diagram',
            transparentBackground: values.transparentBackground === 'on',
            cropToContent: values.cropToContent === 'on' || values.cropToContent === true,
            padding: parseFloat(values.padding) || 50,
            scale: parseFloat(values.scale) || 1
          })
        }
      }
    })
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result)
        if (data.nodes && data.connections) {
          setNodes(data.nodes)
          setConnections(data.connections)
        } else {
          alert('Invalid file format')
        }
      } catch (error) {
        alert('Error reading file: ' + error.message)
      }
    }
    reader.readAsText(file)

    e.target.value = ''
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-primary-foreground">
              <path d="M3 4.92857C3 3.90506 3.80497 3 4.88889 3H19.1111C20.195 3 21 3.90506 21 4.92857V13h-3v-2c0-.5523-.4477-1-1-1h-4c-.5523 0-1 .4477-1 1v2H3V4.92857ZM3 15v1.0714C3 17.0949 3.80497 18 4.88889 18h3.47608L7.2318 19.3598c-.35356.4243-.29624 1.0548.12804 1.4084.42428.3536 1.05484.2962 1.40841-.128L10.9684 18h2.0632l2.2002 2.6402c.3535.4242.9841.4816 1.4084.128.4242-.3536.4816-.9841.128-1.4084L15.635 18h3.4761C20.195 18 21 17.0949 21 16.0714V15H3Z"/>
              <path d="M16 12v1h-2v-1h2Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold select-none">Schemati</h1>
            <p className="text-xs text-muted-foreground select-none">Create diagrams and flowcharts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://github.com/kirosnn/schemati', '_blank')}
            title="View on GitHub"
            className="rounded-full flex items-center gap-1.5"
          >
            <Github className="h-4 w-4" />
            {githubStars !== null && (
              <>
                <Star className="h-3 w-3" />
                <span className="text-xs font-medium">{githubStars}</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="rounded-full"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          tool={tool}
          onToolChange={setTool}
          nodeShape={nodeShape}
          onNodeShapeChange={setNodeShape}
          nodeColor={nodeColor}
          onNodeColorChange={setNodeColor}
          nodeSize={nodeSize}
          onNodeSizeChange={setNodeSize}
          customWidth={customWidth}
          customHeight={customHeight}
          onCustomSizeChange={handleCustomSizeChange}
          connectionStyle={connectionStyle}
          onConnectionStyleChange={setConnectionStyle}
          connectionColor={connectionColor}
          onConnectionColorChange={setConnectionColor}
          connectionLineStyle={connectionLineStyle}
          onConnectionLineStyleChange={setConnectionLineStyle}
          dashLength={dashLength}
          onDashLengthChange={setDashLength}
          gapLength={gapLength}
          onGapLengthChange={setGapLength}
          borderColor={borderColor}
          onBorderColorChange={setBorderColor}
          borderWidth={borderWidth}
          onBorderWidthChange={setBorderWidth}
          gridEnabled={gridEnabled}
          onGridEnabledChange={setGridEnabled}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
          onExport={handleExport}
          onExportPNG={handleExportPNG}
          onImport={handleImport}
        />
        <SchemaCanvas
          ref={canvasRef}
          tool={tool}
          nodeShape={nodeShape}
          nodeColor={nodeColor}
          nodeSize={nodeSize}
          customWidth={customWidth}
          customHeight={customHeight}
          connectionStyle={connectionStyle}
          connectionColor={connectionColor}
          connectionLineStyle={connectionLineStyle}
          dashLength={dashLength}
          gapLength={gapLength}
          borderColor={borderColor}
          borderWidth={borderWidth}
          gridEnabled={gridEnabled}
          gridSize={gridSize}
          nodes={nodes}
          connections={connections}
          borders={borders}
          onNodesChange={setNodes}
          onConnectionsChange={setConnections}
          onBordersChange={setBorders}
          onSnapStateChange={(isSnapping, strength) => {
            // Optional: could be used for future features
          }}
        />
      </div>
      {exportPNGModal && (
        <Modal
          isOpen={!!exportPNGModal}
          onClose={() => setExportPNGModal(null)}
          title={exportPNGModal.title}
          fields={exportPNGModal.fields}
          onSubmit={exportPNGModal.onSubmit}
        />
      )}
    </div>
  )
}

export default App
