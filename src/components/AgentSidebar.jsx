function AgentSidebar({ agentSidebarOpen, agentSidebarTop }) {
  return (
    <div
      className={`fixed right-0 bottom-0 w-80 bg-card border-l border-border z-40 overflow-y-auto transition-all duration-400 ease-out ${
        agentSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ top: agentSidebarTop }}
    >
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 select-none">Agent</h2>
      </div>
    </div>
  )
}

export default AgentSidebar