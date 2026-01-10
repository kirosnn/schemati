export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'analyze_diagram',
      description: 'Analyze the current diagram to get information about nodes, connections, structure, and statistics. Use this before making modifications to understand the current state.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The specific question or analysis requested (e.g., "How many nodes?", "What is the structure?", "Are there isolated nodes?")'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_node',
      description: 'Create a new node on the canvas. Position can be specified or set to "auto" for automatic placement.',
      parameters: {
        type: 'object',
        properties: {
          label: {
            type: 'string',
            description: 'The text label for the node'
          },
          x: {
            type: ['number', 'string'],
            description: 'X coordinate position (number) or "auto" for automatic placement. Default: "auto"'
          },
          y: {
            type: ['number', 'string'],
            description: 'Y coordinate position (number) or "auto" for automatic placement. Default: "auto"'
          },
          shape: {
            type: 'string',
            enum: ['rectangle', 'circle', 'diamond'],
            description: 'Shape of the node. Default: "rectangle"'
          },
          color: {
            type: 'string',
            description: 'Hex color for the node (e.g., "#3b82f6"). Default: "#3b82f6" (blue)'
          },
          width: {
            type: 'number',
            description: 'Width of the node in pixels (optional, uses default based on shape)'
          },
          height: {
            type: 'number',
            description: 'Height of the node in pixels (optional, uses default based on shape)'
          }
        },
        required: ['label']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_node',
      description: 'Modify an existing node. Can find the node by ID or by label text.',
      parameters: {
        type: 'object',
        properties: {
          nodeId: {
            type: 'string',
            description: 'The node ID or label text to identify which node to update'
          },
          label: {
            type: 'string',
            description: 'New text label (optional)'
          },
          x: {
            type: 'number',
            description: 'New X position (optional)'
          },
          y: {
            type: 'number',
            description: 'New Y position (optional)'
          },
          shape: {
            type: 'string',
            enum: ['rectangle', 'circle', 'diamond'],
            description: 'New shape (optional)'
          },
          color: {
            type: 'string',
            description: 'New hex color (optional)'
          },
          width: {
            type: 'number',
            description: 'New width in pixels (optional)'
          },
          height: {
            type: 'number',
            description: 'New height in pixels (optional)'
          }
        },
        required: ['nodeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_node',
      description: 'Delete a node from the diagram. This will also remove all connections to/from this node. Can find the node by ID or label.',
      parameters: {
        type: 'object',
        properties: {
          nodeId: {
            type: 'string',
            description: 'The node ID or label text to identify which node to delete'
          }
        },
        required: ['nodeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_connection',
      description: 'Create a connection (arrow/line) between two nodes. Nodes can be identified by ID or label.',
      parameters: {
        type: 'object',
        properties: {
          fromNodeId: {
            type: 'string',
            description: 'The source node ID or label text'
          },
          toNodeId: {
            type: 'string',
            description: 'The target node ID or label text'
          },
          style: {
            type: 'string',
            enum: ['curved', 'straight', 'orthogonal'],
            description: 'Connection line style. Default: "curved"'
          },
          color: {
            type: 'string',
            description: 'Hex color for the connection (e.g., "#6b7280"). Default: "#6b7280" (gray)'
          },
          lineStyle: {
            type: 'string',
            enum: ['solid', 'dashed', 'dotted'],
            description: 'Line pattern style. Default: "solid"'
          }
        },
        required: ['fromNodeId', 'toNodeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_connection',
      description: 'Delete a connection between nodes. Can identify by connection ID or by describing the connection (e.g., "between Login and Dashboard").',
      parameters: {
        type: 'object',
        properties: {
          connectionId: {
            type: 'string',
            description: 'The connection ID or a description like "between NodeA and NodeB"'
          }
        },
        required: ['connectionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_border',
      description: 'Create a rectangular border to visually group elements.',
      parameters: {
        type: 'object',
        properties: {
          x: {
            type: 'number',
            description: 'X coordinate of top-left corner'
          },
          y: {
            type: 'number',
            description: 'Y coordinate of top-left corner'
          },
          width: {
            type: 'number',
            description: 'Width of the border rectangle'
          },
          height: {
            type: 'number',
            description: 'Height of the border rectangle'
          },
          color: {
            type: 'string',
            description: 'Hex color for the border line. Default: "#6b7280"'
          },
          borderWidth: {
            type: 'number',
            description: 'Line width in pixels. Default: 2'
          }
        },
        required: ['x', 'y', 'width', 'height']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_border',
      description: 'Delete a border from the diagram.',
      parameters: {
        type: 'object',
        properties: {
          borderId: {
            type: 'string',
            description: 'The border ID to delete'
          }
        },
        required: ['borderId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clear_diagram',
      description: 'Clear the entire diagram (remove all nodes, connections, and borders). This is a destructive action that requires explicit confirmation.',
      parameters: {
        type: 'object',
        properties: {
          confirm: {
            type: 'boolean',
            description: 'Must be true to confirm clearing the diagram'
          }
        },
        required: ['confirm']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_node',
      description: 'Move a node to a new position.',
      parameters: {
        type: 'object',
        properties: {
          nodeId: {
            type: 'string',
            description: 'The node ID or label to move'
          },
          x: {
            type: 'number',
            description: 'New X coordinate'
          },
          y: {
            type: 'number',
            description: 'New Y coordinate'
          }
        },
        required: ['nodeId', 'x', 'y']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'arrange_nodes',
      description: 'Auto-arrange all nodes or selected nodes in a specific layout pattern. CRITICAL: When the user explicitly chooses a layout (e.g., "horizontal" or "vertical"), you MUST use that EXACT layout value. If user says "horizontal", use layout: "horizontal". If user says "vertical", use layout: "vertical".',
      parameters: {
        type: 'object',
        properties: {
          layout: {
            type: 'string',
            enum: ['horizontal', 'vertical', 'grid', 'circular'],
            description: 'The layout pattern to apply. MUST match the user\'s choice exactly: "horizontal" for left-to-right, "vertical" for top-to-bottom'
          },
          nodeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific node IDs/labels to arrange. If empty, arranges all nodes.'
          }
        },
        required: ['layout']
      }
    }
  }
]
