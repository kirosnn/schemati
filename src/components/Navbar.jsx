import { Moon, Sun, Github, Star, FolderOpen, Undo, Redo, Bot } from 'lucide-react'
import { Button } from './ui/button'

function Navbar({
  headerRef,
  theme,
  onToggleTheme,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onOpenProjectManager,
  githubStars,
  onOpenGithub,
  agentSidebarOpen,
  onToggleAgent
}) {
  return (
    <header
      ref={headerRef}
      className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-sm z-50 relative"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-primary-foreground">
            <path d="M3 4.92857C3 3.90506 3.80497 3 4.88889 3H19.1111C20.195 3 21 3.90506 21 4.92857V13h-3v-2c0-.5523-.4477-1-1-1h-4c-.5523 0-1 .4477-1 1v2H3V4.92857ZM3 15v1.0714C3 17.0949 3.80497 18 4.88889 18h3.47608L7.2318 19.3598c-.35356.4243-.29624 1.0548.12804 1.4084.42428.3536 1.05484.2962 1.40841-.128L10.9684 18h2.0632l2.2002 2.6402c.3535.4242.9841.4816 1.4084.128.4242-.3536.4816-.9841.128-1.4084L15.635 18h3.4761C20.195 18 21 17.0949 21 16.0714V15H3Z" />
            <path d="M16 12v1h-2v-1h2Z" />
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
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded-full active:scale-[0.97] transition-transform"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="rounded-full active:scale-[0.97] transition-transform"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenProjectManager}
          title="Project Manager (Ctrl+P)"
          className="rounded-full active:scale-[0.97] transition-transform"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenGithub}
          title="View on GitHub"
          className="rounded-full flex items-center gap-1.5 active:scale-[0.97] transition-transform"
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
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="rounded-full active:scale-[0.97] transition-transform"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAgent}
          title="Agent"
          className="rounded-full relative overflow-hidden select-none active:scale-[0.97] transition-transform"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${
                agentSidebarOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-1'
              }`}
            >
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m6 10 1.99994 1.9999-1.99994 2M11 5v14m-7 0h16c.5523 0 1-.4477 1-1V6c0-.55228-.4477-1-1-1H4c-.55228 0-1 .44772-1 1v12c0 .5523.44772 1 1 1Z"
                />
              </svg>
            </div>
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${
                agentSidebarOpen ? 'opacity-0 scale-75 -translate-y-1' : 'opacity-100 scale-100 translate-y-0'
              }`}
            >
              <Bot className="h-5 w-5" />
            </div>
          </div>
        </Button>
      </div>
    </header>
  )
}

export default Navbar