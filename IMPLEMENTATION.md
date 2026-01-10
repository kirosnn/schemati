# AI Agent Implementation

## Overview

The AI agent can interact with the diagram canvas through function calling, allowing users to create, modify, and analyze diagrams using natural language.

## Architecture

```
App.jsx (State Management)
    ├── SchemaCanvas (Rendering)
    └── AgentSidebar (Chat Interface)
        ├── useAgentChat (Message handling)
        ├── useAgentActions (Action execution)
        └── ActionValidation (User approval UI)
```

## Key Components

### API Layer
- **api/chat.js**: Vercel Edge Function proxying requests to Mistral AI
- **api/tools.js**: 13 tool definitions for function calling
- **api/system-prompt.js**: Agent instructions and behavior

### Service Layer
- **services/mistralService.js**: Communication with Mistral API
  - `chatWithMistralAndContext()`: Sends diagram context automatically
  - Parses tool calls from streaming responses

### State Management
- **hooks/useAgentChat.js**: Chat state and message handling
- **hooks/useAgentActions.js**: Action execution and validation

### Utilities
- **lib/diagramActions.js**: Pure functions for diagram operations
  - Smart auto-positioning (avoids overlaps)
  - Node/connection/border creation
  - Diagram analysis

### UI Components
- **components/AgentSidebar.jsx**: Chat interface with action validation
- **components/ActionValidation.jsx**: Displays pending actions for user approval

## Available Tools

1. **analyze_diagram**: Get diagram statistics and structure
2. **create_node**: Add nodes with auto or manual positioning
3. **update_node**: Modify existing nodes
4. **delete_node**: Remove nodes and their connections
5. **create_connection**: Connect two nodes
6. **delete_connection**: Remove connections
7. **create_border**: Add grouping rectangles
8. **delete_border**: Remove borders
9. **move_node**: Reposition nodes
10. **arrange_nodes**: Auto-layout in grid/circle/horizontal/vertical
11. **clear_diagram**: Remove all elements

Note: The agent can call multiple tools at once. When asked to create complete diagrams, it will use multiple create_node and create_connection calls that are all validated together.

## Auto-Positioning

The `smart` layout algorithm:
- Scans grid positions (100x100 starting at 100,100)
- Checks for overlaps with existing nodes
- Selects nearest available position
- Ensures minimum 200px spacing

## User Workflow

1. User sends message to agent
2. Agent analyzes diagram context (auto-injected)
3. Agent responds with text + tool calls
4. ActionValidation component shows pending actions
5. User approves or rejects
6. Actions execute and update canvas
7. Changes saved to history (undo/redo compatible)

## Configuration

Environment variable required:
```
MISTRAL_API_KEY=your_key_here
```

Local: Create `.env` file
Vercel: Add in dashboard Settings > Environment Variables

## Example Usage

```
User: "Create 3 nodes: Login, Dashboard, Settings"
Agent: Creates 3 nodes with smart positioning (3 create_node calls)

User: "Connect Login to Dashboard"
Agent: Creates curved connection between nodes (1 create_connection call)

User: "Create a login flowchart"
Agent: Creates multiple nodes (Start, Login, Validate, Success, Error, End)
      and connections between them (6 create_node + 5 create_connection calls)
      All presented for validation at once

User: "Arrange all nodes in a grid"
Agent: Repositions all nodes in grid layout (1 arrange_nodes call)

User: "How many nodes do I have?"
Agent: Analyzes and reports node count (1 analyze_diagram call)
```

## Technical Notes

- All actions require user approval (security)
- Node lookup by label (case-insensitive)
- Diagram context automatically included in requests
- Streaming responses for better UX
- No external dependencies beyond existing stack
