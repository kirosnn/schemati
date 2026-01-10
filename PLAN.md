# Plan d'Implémentation: Agent IA avec Capacités d'Édition du Diagramme

## Vue d'Ensemble

Transformer l'agent Mistral actuel en un véritable agent capable de :
- Analyser le diagramme actuel (contexte visuel)
- Créer/modifier/supprimer des nœuds
- Créer/supprimer des connexions
- Créer/modifier/supprimer des bordures
- Générer des diagrammes complets à partir de descriptions
- Validation utilisateur avant exécution des actions

## Architecture Technique

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.jsx                                  │
│  - State: nodes, connections, borders                              │
│  - Handlers: handleNodesChange, handleConnectionsChange, etc.     │
└────────────────┬────────────────────────────────────────┬───────────┘
                 │                                        │
        ┌────────▼────────┐                      ┌───────▼────────┐
        │ SchemaCanvas    │                      │ AgentSidebar   │
        │                 │                      │                │
        │ - Render canvas │◄─────────────────────┤ - Chat UI      │
        │ - Mouse events  │  Context du diagram  │ - Actions UI   │
        └─────────────────┘                      └───────┬────────┘
                                                         │
                                                ┌────────▼─────────┐
                                                │ useAgentChat     │
                                                │ + useAgentActions│
                                                └────────┬─────────┘
                                                         │
                                                ┌────────▼─────────┐
                                                │ mistralService   │
                                                │ (+ diagram ctx)  │
                                                └────────┬─────────┘
                                                         │
                                                ┌────────▼─────────┐
                                                │ /api/chat        │
                                                │ (Edge Function)  │
                                                │ + Tool Calling   │
                                                └────────┬─────────┘
                                                         │
                                                ┌────────▼─────────┐
                                                │ Mistral API      │
                                                │ (devstral)       │
                                                │ + Functions      │
                                                └──────────────────┘
```

### Flux de Communication

1. **Utilisateur → Agent**: Message texte + contexte du diagramme
2. **Agent → Mistral**: Messages + functions disponibles + contexte
3. **Mistral → Agent**: Réponse + function calls (si nécessaire)
4. **Agent → UI**: Affiche la réponse + demande de validation pour les actions
5. **Utilisateur → Agent**: Valide ou rejette les actions proposées
6. **Agent → App**: Exécute les actions validées via callbacks
7. **App → Canvas**: Met à jour le state et re-render

## Système de Function Calling avec Mistral

### Functions Disponibles

**1. analyze_diagram**
```javascript
{
  name: "analyze_diagram",
  description: "Analyser le diagramme actuel pour obtenir des informations",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La question ou analyse demandée (ex: 'Combien de nœuds?', 'Structure du diagram?')"
      }
    },
    required: ["query"]
  }
}
```

**2. create_node**
```javascript
{
  name: "create_node",
  description: "Créer un nouveau nœud sur le canvas",
  parameters: {
    type: "object",
    properties: {
      label: { type: "string", description: "Texte du nœud" },
      x: { type: "number", description: "Position X (ou 'auto' pour placement automatique)" },
      y: { type: "number", description: "Position Y (ou 'auto' pour placement automatique)" },
      shape: { type: "string", enum: ["rectangle", "circle", "diamond"], default: "rectangle" },
      color: { type: "string", description: "Couleur hex (ex: #3b82f6)" },
      width: { type: "number", description: "Largeur (optionnel)" },
      height: { type: "number", description: "Hauteur (optionnel)" }
    },
    required: ["label"]
  }
}
```

**3. update_node**
```javascript
{
  name: "update_node",
  description: "Modifier un nœud existant",
  parameters: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "ID du nœud ou label pour recherche" },
      label: { type: "string", description: "Nouveau texte (optionnel)" },
      x: { type: "number" },
      y: { type: "number" },
      shape: { type: "string", enum: ["rectangle", "circle", "diamond"] },
      color: { type: "string" },
      width: { type: "number" },
      height: { type: "number" }
    },
    required: ["nodeId"]
  }
}
```

**4. delete_node**
```javascript
{
  name: "delete_node",
  description: "Supprimer un nœud (et ses connexions)",
  parameters: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "ID du nœud ou label" }
    },
    required: ["nodeId"]
  }
}
```

**5. create_connection**
```javascript
{
  name: "create_connection",
  description: "Créer une connexion entre deux nœuds",
  parameters: {
    type: "object",
    properties: {
      fromNodeId: { type: "string", description: "ID ou label du nœud source" },
      toNodeId: { type: "string", description: "ID ou label du nœud cible" },
      style: { type: "string", enum: ["curved", "straight", "orthogonal"], default: "curved" },
      color: { type: "string" },
      lineStyle: { type: "string", enum: ["solid", "dashed", "dotted"], default: "solid" }
    },
    required: ["fromNodeId", "toNodeId"]
  }
}
```

**6. delete_connection**
```javascript
{
  name: "delete_connection",
  description: "Supprimer une connexion",
  parameters: {
    type: "object",
    properties: {
      connectionId: { type: "string", description: "ID de la connexion ou description (ex: 'entre A et B')" }
    },
    required: ["connectionId"]
  }
}
```

**7. create_border**
```javascript
{
  name: "create_border",
  description: "Créer une bordure rectangulaire",
  parameters: {
    type: "object",
    properties: {
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      color: { type: "string" },
      borderWidth: { type: "number", default: 2 }
    },
    required: ["x", "y", "width", "height"]
  }
}
```

**8. generate_diagram**
```javascript
{
  name: "generate_diagram",
  description: "Générer un diagramme complet à partir d'une description",
  parameters: {
    type: "object",
    properties: {
      description: { type: "string", description: "Description du diagramme à créer" },
      clearExisting: { type: "boolean", description: "Effacer le diagramme actuel?", default: false },
      layout: { type: "string", enum: ["vertical", "horizontal", "hierarchical", "circular"], default: "hierarchical" }
    },
    required: ["description"]
  }
}
```

**9. clear_diagram**
```javascript
{
  name: "clear_diagram",
  description: "Effacer tout le diagramme (avec confirmation)",
  parameters: {
    type: "object",
    properties: {
      confirm: { type: "boolean", description: "Confirmation explicite", default: false }
    },
    required: ["confirm"]
  }
}
```

## Passage du Contexte du Diagramme

### Format du Contexte

Le contexte du diagramme sera automatiquement ajouté à chaque message envoyé à Mistral:

```javascript
{
  diagram_context: {
    nodes: [
      { id: "node-123", label: "Login", shape: "rectangle", x: 100, y: 100, ... }
    ],
    connections: [
      { id: "conn-456", from: "node-123", to: "node-789", style: "curved", ... }
    ],
    borders: [
      { id: "border-012", x: 50, y: 50, width: 300, height: 200, ... }
    ],
    statistics: {
      nodeCount: 5,
      connectionCount: 4,
      borderCount: 1
    }
  }
}
```

### Intégration dans le System Prompt

Le system prompt sera enrichi avec des informations sur :
- Les capacités d'édition disponibles
- Le format du contexte du diagramme
- Les conventions de nommage (IDs vs labels)
- Les best practices pour la génération

## Système de Validation Utilisateur

### Interface de Validation

Quand l'agent propose des actions, l'UI affichera une **carte d'action** avec :

```
┌────────────────────────────────────────────────┐
│  🤖 L'agent propose des actions                │
├────────────────────────────────────────────────┤
│                                                │
│  ✓ Créer un nœud "Login" (rectangle, bleu)    │
│    Position: (100, 100)                        │
│                                                │
│  ✓ Créer un nœud "Dashboard" (rectangle, vert)│
│    Position: (300, 100)                        │
│                                                │
│  ✓ Connecter "Login" → "Dashboard"            │
│    Style: curved, couleur: gris               │
│                                                │
│  [Valider tout] [Personnaliser] [Rejeter]     │
└────────────────────────────────────────────────┘
```

### Mode Personnalisation

En cliquant "Personnaliser", l'utilisateur peut :
- Cocher/décocher chaque action individuellement
- Modifier les paramètres de chaque action
- Puis valider les actions sélectionnées

### Composant ActionValidation

Nouveau composant `ActionValidation.jsx`:
- Affiche les actions proposées par l'agent
- Permet la validation/rejet
- Permet l'édition des paramètres
- Execute les actions via callbacks fournis par App

## Modifications des Fichiers

### 1. Nouveau: `src/lib/diagramActions.js`

Bibliothèque d'utilitaires pour les actions du diagramme:
- `createNode(params)`: Génère un objet node valide
- `findNodeByIdOrLabel(nodes, identifier)`: Recherche intelligente
- `validateNodeParams(params)`: Validation des paramètres
- `calculateAutoPosition(existingNodes, layout)`: Placement automatique
- `generateDiagramLayout(description, layout)`: Algorithme de layout pour génération

### 2. Nouveau: `src/hooks/useAgentActions.js`

Hook personnalisé pour gérer les actions de l'agent:
```javascript
const {
  pendingActions,        // Actions en attente de validation
  executePendingActions, // Exécute les actions validées
  rejectPendingActions,  // Rejette les actions
  updatePendingAction    // Modifie une action avant validation
} = useAgentActions({
  nodes,
  connections,
  borders,
  onNodesChange,
  onConnectionsChange,
  onBordersChange
})
```

### 3. Nouveau: `src/components/ActionValidation.jsx`

Composant pour l'UI de validation des actions:
- Affiche les actions proposées
- Boutons de validation/rejet/personnalisation
- Mode édition pour ajuster les paramètres

### 4. Nouveau: `api/tools.js`

Définition des tools Mistral pour function calling:
```javascript
export const AGENT_TOOLS = [
  { type: "function", function: { name: "analyze_diagram", ... } },
  { type: "function", function: { name: "create_node", ... } },
  // ... toutes les autres functions
]
```

### 5. Modifier: `api/system-prompt.js`

Enrichir le system prompt avec:
- Description des capacités d'édition
- Format du contexte du diagramme
- Instructions pour l'utilisation des tools
- Best practices pour la génération de diagrammes

**Changements**:
```javascript
export const SYSTEM_PROMPT = `You are an AI assistant specialized in creating and editing diagrams in Schemati.

You have access to the current diagram context and can:
- Analyze the existing diagram structure
- Create, modify, and delete nodes
- Create and delete connections between nodes
- Create borders to group elements
- Generate complete diagrams from descriptions

IMPORTANT RULES:
1. Always analyze the diagram context before making suggestions
2. When creating nodes, use descriptive labels
3. Use auto-positioning when exact coordinates aren't specified
4. Validate that source and target nodes exist before creating connections
5. When generating diagrams, choose appropriate layouts (hierarchical for flowcharts, etc.)
6. Always explain what actions you're proposing before executing them

You will receive diagram context with each message in this format:
{
  diagram_context: {
    nodes: [...],
    connections: [...],
    borders: [...],
    statistics: { nodeCount, connectionCount, borderCount }
  }
}

Use the available tools to perform actions. Be conversational and helpful!`
```

### 6. Modifier: `api/chat.js`

Ajouter le support des tools Mistral:

**Changements**:
- Importer `AGENT_TOOLS` depuis `./tools.js`
- Ajouter `tools: AGENT_TOOLS` dans le body de la requête Mistral
- Ajouter `tool_choice: "auto"` pour activer le function calling
- Parser les `tool_calls` dans la réponse
- Retourner les tool_calls dans le stream pour que le client les exécute

### 7. Modifier: `src/services/mistralService.js`

Enrichir le service pour envoyer le contexte du diagramme:

**Changements**:
- Nouvelle fonction `chatWithMistralAndContext(messages, diagramContext, onUpdate, onToolCall, abortSignal)`
- Ajouter le `diagramContext` dans le premier message utilisateur (caché visuellement)
- Parser les `tool_calls` depuis le stream
- Appeler `onToolCall(toolCall)` quand un tool call est détecté
- Retourner `{ text, toolCalls }` au lieu de juste le texte

### 8. Modifier: `src/hooks/useAgentChat.js`

Étendre le hook pour gérer les tool calls:

**Changements**:
- Accepter `diagramContext` en paramètre
- Nouveau state: `toolCalls` pour stocker les appels de fonction
- Callback `onToolCall` pour notifier les tool calls
- Passer `diagramContext` à `chatWithMistralAndContext`
- Retourner `{ ..., toolCalls }` pour que le composant puisse afficher les actions

### 9. Modifier: `src/components/AgentSidebar.jsx`

Intégrer l'UI de validation des actions:

**Changements**:
- Importer `useAgentActions` et `ActionValidation`
- Recevoir les props du diagramme depuis App: `nodes`, `connections`, `borders`, `onNodesChange`, etc.
- Passer `diagramContext` à `useAgentChat`
- Afficher `<ActionValidation>` quand `toolCalls` existe
- Intégrer les callbacks de validation/rejet

### 10. Modifier: `src/App.jsx`

Connecter l'agent au state du diagramme:

**Changements**:
- Passer les props du diagramme à `AgentSidebar`:
  ```jsx
  <AgentSidebar
    agentSidebarOpen={agentSidebarOpen}
    agentSidebarTop={navbarHeight}
    nodes={nodes}
    connections={connections}
    borders={borders}
    onNodesChange={handleNodesChange}
    onConnectionsChange={handleConnectionsChange}
    onBordersChange={handleBordersChange}
  />
  ```

## Plan d'Implémentation Étape par Étape

### Phase 1: Infrastructure de Base (Fondations)

**Étape 1.1**: Créer la bibliothèque d'actions
- ✅ Créer `src/lib/diagramActions.js`
- ✅ Implémenter les utilitaires: `createNode`, `findNodeByIdOrLabel`, `validateNodeParams`, `calculateAutoPosition`

**Étape 1.2**: Définir les tools Mistral
- ✅ Créer `api/tools.js`
- ✅ Définir toutes les functions (analyze, create_node, update_node, delete_node, create_connection, etc.)

**Étape 1.3**: Enrichir le system prompt
- ✅ Modifier `api/system-prompt.js`
- ✅ Ajouter les instructions pour l'utilisation des tools et du contexte

### Phase 2: Communication Backend (API)

**Étape 2.1**: Modifier l'API Edge Function
- ✅ Modifier `api/chat.js`
- ✅ Ajouter le support des tools dans la requête Mistral
- ✅ Parser et retourner les tool_calls dans le stream

**Étape 2.2**: Enrichir le service Mistral
- ✅ Modifier `src/services/mistralService.js`
- ✅ Ajouter `chatWithMistralAndContext`
- ✅ Gérer le passage du contexte du diagramme
- ✅ Parser les tool_calls depuis le stream

### Phase 3: Logique Frontend (Hooks & Actions)

**Étape 3.1**: Créer le hook de gestion des actions
- ✅ Créer `src/hooks/useAgentActions.js`
- ✅ Implémenter la logique d'exécution des actions
- ✅ Gérer les actions en attente (pending)

**Étape 3.2**: Étendre le hook de chat
- ✅ Modifier `src/hooks/useAgentChat.js`
- ✅ Intégrer le diagramContext
- ✅ Gérer les toolCalls dans le state

### Phase 4: Interface Utilisateur

**Étape 4.1**: Créer le composant de validation
- ✅ Créer `src/components/ActionValidation.jsx`
- ✅ Interface de validation/rejet
- ✅ Mode personnalisation (optionnel pour V1)

**Étape 4.2**: Intégrer dans AgentSidebar
- ✅ Modifier `src/components/AgentSidebar.jsx`
- ✅ Recevoir les props du diagramme
- ✅ Afficher ActionValidation quand nécessaire

**Étape 4.3**: Connecter App.jsx
- ✅ Modifier `src/App.jsx`
- ✅ Passer les props du diagramme à AgentSidebar

### Phase 5: Tests & Raffinement

**Étape 5.1**: Tests manuels
- ✅ Tester chaque fonction individuellement
- ✅ Tester la génération de diagrammes complets
- ✅ Tester les cas d'erreur (nœuds non trouvés, etc.)

**Étape 5.2**: Amélioration de l'UX
- ✅ Animations de transition pour les nouvelles actions
- ✅ Feedback visuel pendant l'exécution
- ✅ Messages d'erreur clairs

**Étape 5.3**: Documentation
- ✅ Mettre à jour `CLAUDE.md` avec les nouvelles capacités
- ✅ Ajouter des exemples d'utilisation de l'agent

## Exemples d'Utilisation

### Exemple 1: Créer des nœuds simples
```
User: "Crée-moi 3 nœuds: Login, Dashboard, et Settings"

Agent: "Je vais créer 3 nœuds pour vous. Voici ce que je propose:
- Nœud 'Login' (rectangle bleu) en position (100, 100)
- Nœud 'Dashboard' (rectangle vert) en position (300, 100)
- Nœud 'Settings' (rectangle orange) en position (500, 100)

[Actions: create_node x3]

→ UI affiche ActionValidation
→ User clique "Valider tout"
→ Actions exécutées, nœuds créés
```

### Exemple 2: Analyser le diagramme
```
User: "Combien de nœuds j'ai actuellement?"

Agent: [Appelle analyze_diagram]
"Vous avez actuellement 5 nœuds dans votre diagramme:
- Login (rectangle)
- Dashboard (rectangle)
- Settings (rectangle)
- Profile (circle)
- Logout (diamond)

Et 4 connexions entre ces nœuds."
```

### Exemple 3: Générer un flowchart complet
```
User: "Génère-moi un flowchart pour un processus d'authentification"

Agent: "Je vais créer un flowchart d'authentification complet. Voici la structure:

1. Start (circle vert)
2. Enter credentials (rectangle)
3. Validate credentials (diamond)
4. Success (rectangle vert)
5. Error (rectangle rouge)
6. End (circle gris)

Avec connexions:
- Start → Enter credentials
- Enter credentials → Validate credentials
- Validate credentials → Success (Yes)
- Validate credentials → Error (No)
- Success → End
- Error → Enter credentials

[Actions: generate_diagram]

→ UI affiche ActionValidation avec preview
→ User valide
→ Diagramme complet généré avec layout automatique
```

## Considérations Techniques

### Sécurité
- ✅ Validation stricte des paramètres côté serveur
- ✅ Limites sur le nombre d'actions par requête (max 20)
- ✅ Validation utilisateur obligatoire pour actions destructives (clear_diagram)

### Performance
- ✅ Batch des actions pour mise à jour unique du state
- ✅ Debouncing de l'autosave après exécution des actions
- ✅ Streaming des réponses pour UX réactive

### Expérience Utilisateur
- ✅ Messages clairs quand l'agent propose des actions
- ✅ Preview visuel des actions (optionnel pour V1)
- ✅ Undo/Redo fonctionne avec les actions de l'agent (via useHistory)

### Extensibilité
- ✅ Architecture modulaire pour ajouter de nouveaux tools facilement
- ✅ Système de plugins pour les layouts de génération
- ✅ API documentée pour les actions

## Dépendances Supplémentaires

Aucune dépendance npm supplémentaire nécessaire! Tout est implémenté avec:
- React hooks natifs
- Fetch API native
- Mistral API (déjà configuré)
- Code existant de Schemati

## Risques & Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Mistral ne supporte pas bien les tools | Élevé | Fallback: Parser manuellement les actions depuis le texte (format structuré) |
| Actions incorrectes générées | Moyen | Validation stricte + UI de prévisualisation |
| Performance dégradée avec gros diagrammes | Faible | Contexte résumé si > 100 nœuds |
| Confusion utilisateur sur les IDs vs labels | Moyen | Recherche intelligente par label prioritaire |

## Critères de Succès

- ✅ L'agent peut créer des nœuds avec placement automatique
- ✅ L'agent peut connecter des nœuds par leurs labels
- ✅ L'agent peut analyser et décrire le diagramme
- ✅ L'agent peut générer un flowchart simple (3-5 nœuds)
- ✅ La validation utilisateur fonctionne correctement
- ✅ Aucune régression sur les fonctionnalités existantes
- ✅ Documentation à jour dans CLAUDE.md

## Timeline Estimée

**Phase 1-2**: Infrastructure & Backend ~ 2-3h de développement
**Phase 3**: Logique Frontend ~ 2h
**Phase 4**: UI ~ 2h
**Phase 5**: Tests & Raffinement ~ 1-2h

**TOTAL**: ~7-9 heures de développement
