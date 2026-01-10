# Schemati

Create diagrams and flowcharts with ease. A powerful and intuitive diagramming tool built with React.

## Features

- **Multiple Node Shapes**: Rectangle, Circle, Diamond
- **Connection Styles**: Curved, Straight, Orthogonal lines
- **Customizable Styles**: Colors, borders, shadows, and more
- **Magnetic Snapping**: Smart alignment system for precise positioning
- **Grid System**: Optional grid with customizable size
- **Project Management**: Save, load, and manage multiple projects
- **Auto-save**: Automatic saving to browser localStorage
- **Undo/Redo**: Full history management with Ctrl+Z/Ctrl+Y
- **Export Options**: PNG export with transparent backgrounds and JSON project files
- **Dark/Light Theme**: Automatic theme switching
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Online Version
Visit [Schemati](https://schemati.vercel.app/) to use the application directly in your browser!

### Local Development

#### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/kirosnn/schemati.git
cd schemati
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Basic Tools
- **Select Tool**: Click and drag to select and move elements
- **Node Tool**: Click and drag to create new nodes
- **Text Tool**: Click to add text elements
- **Connection Tool**: Click on two nodes to connect them
- **Border Tool**: Click and drag to create borders
- **Delete Tool**: Click on elements to remove them

### Project Management
- **Project Manager**: Access via the folder icon or Ctrl+P to save/load projects
- **Auto-save**: Automatically saves your work to browser storage (can be disabled)
- **Import/Export**: Export projects as JSON files or import existing ones
- **History**: Full undo/redo support with Ctrl+Z/Ctrl+Y

### Example 
m 
Schema's AI agent explained by itself :

<img src="schemati-diagram.png" alt="AI Example" width="1000"/>

### Tips
- Projects are automatically saved to your browser's localStorage
- Use magnetic snapping for precise alignment
- The grid helps with consistent spacing
- Export your diagrams as PNG for sharing

## Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z`: Undo last action
- `Ctrl+Y` / `Cmd+Y` or `Ctrl+Shift+Z`: Redo last undone action
- `Ctrl+P` / `Cmd+P`: Open project manager
- `Ctrl+S` / `Cmd+S`: Save current project
- `Ctrl+C` / `Cmd+C`: Copy selected element
- `Ctrl+V` / `Cmd+V`: Paste copied element

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=kirosnn/schemati&type=Date)](https://star-history.com/#kirosnn/schemati&Date)

---

Made with ❤️ using React, Vite, and Tailwind CSS