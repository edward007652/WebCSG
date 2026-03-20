import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useImmer } from 'use-immer';
import initOpenCascade from 'opencascade.js/dist/opencascade.full.js';
import wasmUrl from 'opencascade.js/dist/opencascade.full.wasm?url';
import type { ParametricDocument, CSGNode, PrimitiveNode } from './types/cad.types';
import { evaluateCSGTree } from './core/geometryEngine';
import { visualizeShapes } from './core/visualize';
import { exportSTEP, downloadSTEP } from './core/exporter';
import { Scene3D } from './canvas/Scene3D';
import type { CameraState } from './canvas/Scene3D';
import { OutlinerTree } from './components/OutlinerTree';
import { NodeProperties } from './components/NodeProperties';
import './App.css';

export default function App() {
  const [oc, setOc] = useState<any>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  const currentCameraState = useRef<CameraState | undefined>(undefined);
  const [importedCameraState, setImportedCameraState] = useState<CameraState | undefined>(undefined);

  // Default state: Box subtracted by multiple Cylinders
  const [document, setDocument] = useImmer<ParametricDocument>({
    version: '1.0',
    root: {
      id: 'op-1',
      type: 'SUBTRACT',
      name: 'Cut Operation',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      base: {
        id: 'box-1', type: 'BOX', name: 'Base Box',
        parameters: { width: 10, height: 10, depth: 10 },
        position: [0, 0, 0], // Box is now centered internally, so we start at 0,0,0
        rotation: [0, 0, 0]
      },
      nodes: [
        {
          id: 'cyl-1', type: 'CYLINDER', name: 'Cut Hole 1',
          parameters: { radius: 2, height: 20 },
          position: [0, 0, 0],
          rotation: [0, 0, 0]
        }
      ]
    }
  });

  const [debouncedDocument, setDebouncedDocument] = useState<ParametricDocument>(document);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDocument(document);
    }, 50); // Reduced debounce time for faster response, adjust as needed
    return () => clearTimeout(timer);
  }, [document]);

  const [error, setError] = useState<string | null>(null);

  // Initialize OpenCascade WebAssembly module
  useEffect(() => {
    // @ts-ignore - The types might not reflect the initialization options correctly
    initOpenCascade({
      // The locateFile callback is required by Emscripten to find the .wasm binary.
      // Since Vite (or other bundlers) hashes and moves assets during build, 
      // we must explicitly return the URL of the imported .wasm file.
      locateFile: (path: string) => {
        // If the requested file is the WebAssembly binary, return the correct URL
        if (path.endsWith('.wasm')) {
          return wasmUrl;
        }
        // Otherwise, fallback to the default path resolution
        return path;
      }
    }).then((ocInstance: any) => {
      setOc(ocInstance);
    }).catch((err: any) => {
      console.error("Failed to initialize OpenCascade:", err);
      setError(err.toString());
    });
  }, []);

  // Update Geometry whenever debouncedDocument or oc changes
  useEffect(() => {
    if (!oc) return;
    
    let currentUrl: string | null = null;

    try {
      setIsProcessing(true);

      // 1. Evaluate Tree to get Shape
      const shape = evaluateCSGTree(oc, debouncedDocument.root);
      
      // 2. Visualize Shape to get GLB URL
      if (shape) {
        currentUrl = visualizeShapes(oc, shape);
        setModelUrl(currentUrl);
      } else {
        setModelUrl(null);
      }
    } catch (err) {
      console.error("Error evaluating CSG tree:", err);
    } finally {
      setIsProcessing(false);
    }

    // Cleanup: revoke the object URL only AFTER the new one is created and cached
    return () => {
      if (currentUrl) {
        // We add a delay to allow the new ThreeJS components to load the new URL
        // before we revoke the old one, preventing "Failed to fetch blob" errors.
        setTimeout(() => {
          URL.revokeObjectURL(currentUrl!);
        }, 3000);
      }
    };
  }, [debouncedDocument, oc]);

  // Find node by ID
  const findNode = (node: CSGNode, id: string): CSGNode | null => {
    if (node.id === id) return node;
    if ('base' in node) {
      const baseResult = findNode(node.base, id);
      if (baseResult) return baseResult;
      
      for (const childNode of node.nodes) {
        const childResult = findNode(childNode, id);
        if (childResult) return childResult;
      }
    }
    return null;
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return findNode(document.root, selectedNodeId);
  }, [document, selectedNodeId]);

  // Update functions
  const handleUpdateParameters = useCallback((id: string, params: Record<string, number>) => {
    setDocument((draft) => {
      const node = findNode(draft.root, id) as PrimitiveNode;
      if (node && (node.type === 'BOX' || node.type === 'CYLINDER')) {
        node.parameters = params;
      }
    });
  }, [setDocument]);

  const handleUpdatePosition = useCallback((id: string, position: [number, number, number]) => {
    setDocument((draft) => {
      const node = findNode(draft.root, id);
      if (node) {
        node.position = position;
      }
    });
  }, [setDocument]);

  const handleUpdateRotation = useCallback((id: string, rotation: [number, number, number]) => {
    setDocument((draft) => {
      const node = findNode(draft.root, id);
      if (node) {
        node.rotation = rotation;
      }
    });
  }, [setDocument]);

  const handleUpdateType = useCallback((id: string, type: 'SUBTRACT' | 'UNION') => {
    setDocument((draft) => {
      const node = findNode(draft.root, id);
      if (node && (node.type === 'SUBTRACT' || node.type === 'UNION')) {
        node.type = type;
        node.name = type === 'SUBTRACT' ? 'Cut Operation' : 'Union Operation';
      }
    });
  }, [setDocument]);

  const handleRemoveCut = useCallback((id: string) => {
    setDocument((draft) => {
      // Helper function to remove a node from the nodes array of an OperationNode
      // Or to remove an entire OperationNode if it is the root
      
      // Special case: removing the root operation itself
      if (draft.root.id === id && 'base' in draft.root) {
         draft.root = draft.root.base;
         if (selectedNodeId === id) setSelectedNodeId(null);
         return;
      }

      const removeNodeFromTree = (node: CSGNode, targetId: string): boolean => {
        if (!('base' in node)) return false;

        // Check if the target is the base node (edge case, shouldn't normally happen unless we want to delete everything)
        if (node.base.id === targetId) {
          // If we remove the base, the operation becomes invalid. 
          // For simplicity, we just clear the nodes.
          node.nodes = [];
          return true;
        }

        // Check if the target is in the nodes array
        const index = node.nodes.findIndex(n => n.id === targetId);
        if (index !== -1) {
          node.nodes.splice(index, 1);
          
          // If we are at the root and nodes become empty, we can simplify the tree:
          if (node.id === draft.root.id && node.nodes.length === 0) {
            draft.root = node.base;
          }
          return true;
        }

        // Recursively check base and other nodes
        if (removeNodeFromTree(node.base, targetId)) return true;
        
        for (const childNode of node.nodes) {
          if (removeNodeFromTree(childNode, targetId)) return true;
        }

        return false;
      };

      removeNodeFromTree(draft.root, id);
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
      }
    });
  }, [setDocument, selectedNodeId]);

  const handleAddOperation = useCallback((type: 'SUBTRACT' | 'UNION') => {
    setDocument((draft) => {
      const oldRoot = draft.root;
      draft.root = {
        id: `op-${Date.now()}`,
        type: type,
        name: type === 'SUBTRACT' ? 'New Cut' : 'New Union',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        base: oldRoot,
        nodes: [
          {
            id: `cyl-${Date.now()}`,
            type: 'CYLINDER',
            name: 'New Cylinder',
            parameters: { radius: 1, height: 20 },
            position: [2, 0, 0],
            rotation: [0, 0, 0]
          }
        ]
      };
    });
  }, [setDocument]);

  const handleAddNodeToCurrentOperation = useCallback((shapeType: 'BOX' | 'CYLINDER') => {
    setDocument((draft) => {
      const isBox = shapeType === 'BOX';
      const newNode = {
        id: `${isBox ? 'box' : 'cyl'}-${Date.now()}`,
        type: shapeType,
        name: isBox ? 'New Box' : 'New Cylinder',
        parameters: isBox ? { width: 5, height: 5, depth: 5 } : { radius: 1, height: 20 },
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      };

      if ('base' in draft.root) {
        newNode.name = `${newNode.name} ${draft.root.nodes.length + 1}`;
        draft.root.nodes.push(newNode as any);
      } else {
        // If root is a primitive, convert it to a SUBTRACT operation
        const oldRoot = draft.root;
        draft.root = {
          id: `op-${Date.now()}`,
          type: 'SUBTRACT',
          name: 'Cut Operation',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          base: oldRoot,
          nodes: [newNode as any]
        };
      }
    });
  }, [setDocument]);

  const handleExportSTEP = () => {
    if (!oc) return;
    const shape = evaluateCSGTree(oc, document.root);
    if (shape) {
      const stepContent = exportSTEP(oc, shape);
      downloadSTEP(stepContent, 'parametric_model.step');
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      ...document,
      camera: currentCameraState.current
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'parametric_model.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as ParametricDocument;
        if (parsed && parsed.version && parsed.root) {
          setDocument(parsed);
          setSelectedNodeId(null);
          if (parsed.camera) {
            setImportedCameraState(parsed.camera);
          }
        } else {
          alert('Invalid JSON format for Parametric Model');
        }
      } catch (err) {
        console.error('Error parsing JSON:', err);
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  if (error) {
    return <div style={{ color: 'red', padding: 20 }}>Error: {error}</div>;
  }

  if (!oc) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading OpenCascade.js...</div>;
  }

  return (
    <div className="app-container">
      {/* Sidebars Wrapper */}
      <div className="sidebars-wrapper">
        {/* Sidebar */}
        <div className="sidebar-main">
          <h2>WebCSG Parametric 3D</h2>
        
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Operations & Export */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleExportSTEP}
                style={{ padding: '8px 12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                Export STEP
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#34495e', borderRadius: '4px' }}>
              <div style={{ width: '100%', fontSize: '0.9em', color: '#ecf0f1', marginBottom: '2px' }}>Wrap current shape in Operation:</div>
              <button 
                onClick={() => handleAddOperation('SUBTRACT')}
                style={{ padding: '8px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                Cut (-)
              </button>
              <button 
                onClick={() => handleAddOperation('UNION')}
                style={{ padding: '8px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                Union (+)
              </button>
            </div>
          </div>

          {/* Shapes */}
          {('base' in document.root) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#34495e', borderRadius: '4px' }}>
              <div style={{ width: '100%', fontSize: '0.9em', color: '#ecf0f1', marginBottom: '2px' }}>Add shape to current Operation:</div>
              <button 
                onClick={() => handleAddNodeToCurrentOperation('BOX')}
                style={{ padding: '8px 12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                + Box
              </button>
              <button 
                onClick={() => handleAddNodeToCurrentOperation('CYLINDER')}
                style={{ padding: '8px 12px', background: '#d35400', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                + Cylinder
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h3>Outliner</h3>
          <div style={{ background: '#34495e', padding: '10px', borderRadius: '4px' }}>
            <OutlinerTree 
              node={document.root} 
              selectedNodeId={selectedNodeId} 
              onSelect={setSelectedNodeId} 
              onUpdateType={handleUpdateType}
            />
          </div>
          
          {/* JSON Import/Export Below Outliner */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button 
              onClick={handleExportJSON}
              style={{ padding: '8px 12px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
            >
              Export JSON
            </button>
            <label 
              style={{ padding: '8px 12px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, textAlign: 'center' }}
            >
              Import JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJSON} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
          <div style={{ fontSize: '0.8em', color: '#bdc3c7', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
            Export/Import the entire parametric model<br/>(CSG Tree & Camera State) to a JSON file.
          </div>
        </div>
      </div>

      {/* Properties Panel (Right side of Sidebar) */}
        <div className="sidebar-properties">
          <NodeProperties 
            node={selectedNode} 
            onUpdateParameters={handleUpdateParameters}
            onUpdatePosition={handleUpdatePosition}
            onUpdateRotation={handleUpdateRotation}
            onUpdateType={handleUpdateType}
            onRemove={handleRemoveCut}
          />
        </div>
      </div>

      {/* Main 3D View */}
      <div className="main-view">
        {isProcessing && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
            Computing geometry...
          </div>
        )}
        <Scene3D 
          modelUrl={modelUrl} 
          cameraState={importedCameraState}
          onCameraChange={(state) => {
            currentCameraState.current = state;
          }}
        />
      </div>
    </div>
  );
}
