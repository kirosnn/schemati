import { useState, useRef, useEffect, useCallback } from 'react'
import SchemaCanvas from './components/SchemaCanvas'
import Sidebar from './components/Sidebar'
import Modal from './components/Modal'
import ProjectManager from './components/ProjectManager'
import Navbar from './components/Navbar'
import AgentSidebar from './components/AgentSidebar'
import MobileWarning from './components/MobileWarning'
import { useTheme } from './hooks/useTheme'
import { useHistory } from './hooks/useHistory'
import { useProjectManager } from './hooks/useProjectManager'

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
  const [projectManagerOpen, setProjectManagerOpen] = useState(false)
  const [agentSidebarOpen, setAgentSidebarOpen] = useState(false)
  const [agentSidebarTop, setAgentSidebarTop] = useState(0)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const headerRef = useRef(null)

  const {
    projects,
    currentProjectId,
    autosaveEnabled,
    saveProject,
    loadProject,
    deleteProject,
    renameProject,
    newProject: resetProject,
    toggleAutosave,
    exportProject,
    importProject,
    autosave
  } = useProjectManager()

  const { undo, redo, canUndo, canRedo, reset: resetHistory, pushState, initialize } = useHistory((state) => {
    setNodes(state.nodes)
    setConnections(state.connections)
    setBorders(state.borders)
  })

  useEffect(() => {
    const initialState = { nodes, connections, borders }
    initialize(initialState)
  }, [])

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setProjectManagerOpen(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveProject({ nodes, connections, borders })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, nodes, connections, borders])

  useEffect(() => {
    const updateAgentSidebarTop = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect()
        setAgentSidebarTop(rect.bottom)
      }
    }

    updateAgentSidebarTop()
    window.addEventListener('resize', updateAgentSidebarTop)
    return () => window.removeEventListener('resize', updateAgentSidebarTop)
  }, [])

  const handleCustomSizeChange = (width, height) => {
    setCustomWidth(width)
    setCustomHeight(height)
  }

  const handleNodesChange = useCallback((newNodes) => {
    setNodes(newNodes)
    pushState({ nodes: newNodes, connections, borders })
    if (autosaveEnabled) {
      setTimeout(() => autosave({ nodes: newNodes, connections, borders }), 1000)
    }
  }, [connections, borders, pushState, autosaveEnabled, autosave])

  const handleConnectionsChange = useCallback((newConnections) => {
    setConnections(newConnections)
    pushState({ nodes, connections: newConnections, borders })
    if (autosaveEnabled) {
      setTimeout(() => autosave({ nodes, connections: newConnections, borders }), 1000)
    }
  }, [nodes, borders, pushState, autosaveEnabled, autosave])

  const handleBordersChange = useCallback((newBorders) => {
    setBorders(newBorders)
    pushState({ nodes, connections, borders: newBorders })
    if (autosaveEnabled) {
      setTimeout(() => autosave({ nodes, connections, borders: newBorders }), 1000)
    }
  }, [nodes, connections, pushState, autosaveEnabled, autosave])

  const handleLoadProject = (projectId) => {
    const projectData = loadProject(projectId)
    if (projectData) {
      setNodes(projectData.nodes || [])
      setConnections(projectData.connections || [])
      setBorders(projectData.borders || [])
      resetHistory({ nodes: projectData.nodes || [], connections: projectData.connections || [], borders: projectData.borders || [] })
      setProjectManagerOpen(false)
    }
  }

  const handleSaveProject = (projectData, projectName) => {
    saveProject(projectData, projectName)
  }

  const handleNewProject = useCallback(() => {
    resetProject()
    setNodes([])
    setConnections([])
    setBorders([])
    resetHistory({ nodes: [], connections: [], borders: [] })
    setProjectManagerOpen(false)
  }, [resetProject, resetHistory])

  const handleExport = () => {
    const data = {
      nodes,
      connections,
      borders,
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

  const handleExportSVG = () => {
    if (canvasRef.current) {
      canvasRef.current.exportToSVG({
        filename: 'schemati-diagram',
        cropToContent: true,
        padding: 50
      })
    }
  }

  const handleAlign = useCallback((direction) => {
    if (canvasRef.current) {
      canvasRef.current.alignSelectedElements(direction)
    }
  }, [])

  const handleDistribute = useCallback((direction) => {
    if (canvasRef.current) {
      canvasRef.current.distributeSelectedElements(direction)
    }
  }, [])

  const handleZOrder = useCallback((action) => {
    if (canvasRef.current) {
      canvasRef.current.changeZOrder(action)
    }
  }, [])

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
          setNodes(data.nodes || [])
          setConnections(data.connections || [])
          setBorders(data.borders || [])
          resetHistory({ nodes: data.nodes || [], connections: data.connections || [], borders: data.borders || [] })
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
    <div
      className="h-screen w-screen flex flex-col bg-background overflow-hidden max-w-[100vw] max-h-[100vh]"
      style={{
        height: '100vh',
        height: '100dvh',
        minHeight: '-webkit-fill-available'
      }}
    >
      <MobileWarning />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <Navbar
        headerRef={headerRef}
        theme={theme}
        onToggleTheme={toggleTheme}
        onUndo={undo}
        canUndo={canUndo}
        onRedo={redo}
        canRedo={canRedo}
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        githubStars={githubStars}
        onOpenGithub={() => window.open('https://github.com/kirosnn/schemati', '_blank')}
        agentSidebarOpen={agentSidebarOpen}
        onToggleAgent={() => setAgentSidebarOpen(!agentSidebarOpen)}
      />
      <div className="flex-1 flex overflow-hidden hidden lg:flex">
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
          onExportSVG={handleExportSVG}
          onImport={handleImport}
          onAlign={handleAlign}
          onDistribute={handleDistribute}
          onZOrder={handleZOrder}
        />
        <div className="flex-1">
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
            onNodesChange={handleNodesChange}
            onConnectionsChange={handleConnectionsChange}
            onBordersChange={handleBordersChange}
            onSnapStateChange={(isSnapping, strength) => {
            }}
          />
        </div>
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
      <ProjectManager
        isOpen={projectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveProject}
        onDeleteProject={deleteProject}
        onRenameProject={renameProject}
        onNewProject={handleNewProject}
        onExportProject={exportProject}
        onImportProject={importProject}
        autosaveEnabled={autosaveEnabled}
        onToggleAutosave={toggleAutosave}
      />
      <AgentSidebar
        agentSidebarOpen={agentSidebarOpen}
        agentSidebarTop={agentSidebarTop}
        nodes={nodes}
        connections={connections}
        borders={borders}
        onNodesChange={handleNodesChange}
        onConnectionsChange={handleConnectionsChange}
        onBordersChange={handleBordersChange}
      />
    </div>
  );
}

export default App;