# WebCSG Parametric 3D Modelling

This is a browser-based application demonstrating parametric, non-destructive 3D modelling. It allows users to create basic shapes (Box, Cylinder) and apply Boolean operations (Subtract, Union) in a tree-based structure.

## Architecture & Approach (Deliverables Explanation)

As per the technical exercise requirements, here is a short written explanation covering the architecture, non-destructive editing, and limitations.

### 1. Architecture

The project follows a **Tree-based Constructive Solid Geometry (CSG)** architecture.
- **State Management:** The source of truth is a React state object (managed via `use-immer` for immutability) that represents a tree of nodes (Primitives like Box/Cylinder, and Operations like Subtract/Union).
- **Geometry Kernel:** We use `opencascade.js` (WebAssembly port of OpenCASCADE) in `src/core/geometryEngine.ts`. A recursive function traverses the CSG tree, generating pure boundary representation (BRep) geometry and applying boolean operations.
- **Visualization:** The computed geometry is meshed, exported as a temporary GLB file in virtual memory, and rendered using `Three.js` (via React Three Fiber).

### 2. How Non-destructive Editing is Implemented

1.  **Separation of Data and Mesh:** The UI components (sliders, inputs) do not modify the 3D polygon mesh directly. Instead, they only update the numerical parameters (e.g., cylinder radius, box position) stored in the CSG tree state.
2.  **Deterministic Re-evaluation:** Whenever the state changes, the geometry engine recalculates the entire shape from scratch starting from the base primitives.
3.  **No Mesh Degradation:** Because the final shape is always calculated mathematically from pure geometric boundaries rather than destructive mesh booleans, applying multiple cuts or continuous edits over time will never degrade the mesh quality or cause topology errors.

### 3. Limitations and Trade-offs

- **Performance vs. Complexity:** Evaluating boolean operations on a deep tree is computationally expensive in WebAssembly. To mitigate UI freezing, a 50ms debounce mechanism is implemented. For production-scale models, a Web Worker approach would be necessary to offload calculations from the main thread.
- **Visual "Flickering" during updates:** Because the mesh is regenerated and reloaded into Three.js upon every parameter change, there can be a slight delay. We implemented a custom GLTF loader in `ParametricMesh.tsx` to bypass React Suspense and minimize flickering, but true instantaneous feedback remains a trade-off.
- **Limited Primitives:** Currently, only Box and Cylinder are supported to demonstrate the core concept. Adding more primitives (Spheres, Cones) would require expanding the TypeScript definitions and the OpenCASCADE generation logic.


## Detailed Architecture

The project follows a **Tree-based Constructive Solid Geometry (CSG)** architecture.

### Directory Structure

```text
src/
│
├── core/                   # CAD Processing Core (OpenCascade)
│   ├── geometryEngine.ts   # Contains RECURSIVE function to traverse the tree and generate 3D shapes
│   ├── exporter.ts         # Handles exporting STEP files from the Root Node's result
│   └── visualize.ts        # Handles meshing TopoDS_Shape and exporting to temporary GLB format for Three.js
│
├── types/                  # TypeScript definitions for the Tree structure
│   └── cad.types.ts        # Contains CSGNode, PrimitiveNode, OperationNode, etc.
│
├── components/             # 2D UI Components
│   ├── OutlinerTree.tsx    # Displays the hierarchical Node list (Similar to Blender/AutoCAD outliner)
│   └── NodeProperties.tsx  # Control panel (Inputs) shown when clicking a Node to edit parameters
│
├── canvas/                 # 3D Viewport (Three.js / React Three Fiber)
│   ├── Scene3D.tsx         # Setup lighting, camera, and controls
│   └── ParametricMesh.tsx  # Receives the calculated geometry and renders the mesh
│
├── App.tsx                 # Main Anchor: Holds the entire Tree State and update flow
└── main.tsx
```

### Data Model (`src/types/cad.types.ts`)
The core data structure is a tree of nodes. There are two main types of nodes:
1.  **Primitive Nodes (Leaves):** Represent basic geometric shapes like `BOX` and `CYLINDER`. They store parameters (width, height, radius) and transforms (position, rotation).
2.  **Operation Nodes (Branches):** Represent boolean operations like `SUBTRACT` and `UNION`. They have a `base` node and a list of operand `nodes`.

This structure ensures that the modelling process is entirely **non-destructive**. The original shapes are never lost; the final mesh is only a visual representation of the evaluated tree.

### Geometry Engine (`src/core/geometryEngine.ts`)
This module uses `opencascade.js` (a WebAssembly port of the robust OpenCASCADE CAD kernel) to perform the actual geometric calculations. 
It features a **recursive evaluation function** (`evaluateCSGTree`). This function traverses the CSG tree from the root down to the leaves, generating basic shapes and applying boolean operations step-by-step to compute the final `TopoDS_Shape`.

### State Management (`src/App.tsx`)
The application state (the CSG tree) is managed using React state combined with `use-immer`. Immer allows for easy, immutable updates to deeply nested tree structures. When the user tweaks a parameter via the UI, the state is updated immutably, triggering a debounced re-evaluation of the geometry engine.

### Main Data Flow (Initialization & Updating)

1.  **Initialization (`App.tsx`):**
    *   The app defines an initial CSG Tree state (a Box with a Cylinder SUBTRACT operation) using `use-immer`.
    *   It waits for the `OpenCascade` WebAssembly module to load asynchronously.
    *   Once loaded, the `useEffect` hook triggers the first evaluation of the geometry.

2.  **Evaluating Geometry (`core/geometryEngine.ts`):**
    *   `App.tsx` passes the root node of the tree to `evaluateCSGTree()`.
    *   The engine recursively traverses the tree: creates the base Box, creates the Cylinder, then applies the boolean `BRepAlgoAPI_Cut` operation.
    *   It returns a final `TopoDS_Shape`.

3.  **Visualization (`core/visualize.ts` & `canvas/Scene3D.tsx`):**
    *   The returned `TopoDS_Shape` is passed to `visualizeShapes()`.
    *   OpenCascade meshes (triangulates) the shape and exports it to a temporary `.glb` file in the virtual memory.
    *   A Blob URL is created from this `.glb` file and passed down to the `<Scene3D />` component.
    *   Three.js (via `useGLTF`) loads the URL and renders the 3D mesh on the canvas.

4.  **User Interaction & Updating:**
    *   The user clicks a node in the `<OutlinerTree />` or adjusts a slider in `<NodeProperties />`.
    *   An event is fired back to `App.tsx` (e.g., `handleUpdateParameters`).
    *   `use-immer` updates the tree state immutably (e.g., changes the cylinder's radius).
    *   A **debounce timer** (50ms) waits for the user to finish dragging the slider to avoid freezing the UI.
    *   Once debounced, the updated state triggers **Step 2** again: the entire tree is re-evaluated from scratch, meshed, and rendered as a new GLB URL, ensuring true non-destructive editing.

### Visualization (`src/canvas/`)
The calculated `TopoDS_Shape` is triangulated and exported as a temporary GLB/GLTF file in memory. `Three.js` (via `@react-three/fiber` and `@react-three/drei`) then loads and renders this mesh, providing camera controls (orbit, zoom, pan) and lighting.

## Setup and Running Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Building for Production

```bash
npm run build
```
The optimized files will be generated in the `dist` folder.

## Tech Stack
- **React (TypeScript)**
- **OpenCascade.js:** Geometry kernel for accurate CAD operations and STEP export.
- **Three.js / React Three Fiber:** 3D rendering and scene management.
- **Immer:** Immutable state management for the nested tree structure.
- **Vite:** Fast build tool and development server.