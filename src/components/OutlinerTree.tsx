import React from 'react';
import type { CSGNode } from '../types/cad.types';

interface OutlinerTreeProps {
  node: CSGNode;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  onUpdateType?: (id: string, type: 'SUBTRACT' | 'UNION') => void;
  depth?: number;
}

/**
 * A recursive component that renders the hierarchical CSG tree structure.
 * Allows users to visualize relationships between operations and primitives,
 * select nodes, and quickly change operation types (e.g., SUBTRACT to UNION).
 */
export const OutlinerTree: React.FC<OutlinerTreeProps> = ({ 
  node, 
  selectedNodeId, 
  onSelect,
  onUpdateType,
  depth = 0 
}) => {
  const isSelected = selectedNodeId === node.id;
  
  return (
    <div style={{ marginLeft: depth * 15, marginTop: 4 }}>
      <div 
        onClick={() => onSelect(node.id)}
        style={{
          padding: '4px 8px',
          backgroundColor: isSelected ? '#3498db' : 'transparent',
          color: isSelected ? 'white' : 'inherit',
          cursor: 'pointer',
          borderRadius: 4,
          border: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{node.name}</span>
        
        {('base' in node) ? (
          <select 
            value={node.type} 
            onChange={(e) => {
              e.stopPropagation(); // Prevent selecting the node when changing type
              if (onUpdateType) onUpdateType(node.id, e.target.value as 'SUBTRACT' | 'UNION');
            }}
            style={{ 
              padding: '2px 4px', 
              borderRadius: '3px', 
              border: 'none',
              backgroundColor: isSelected ? '#2980b9' : '#2c3e50',
              color: 'white',
              fontSize: '0.85em',
              cursor: 'pointer'
            }}
          >
            <option value="SUBTRACT">SUBTRACT</option>
            <option value="UNION">UNION</option>
          </select>
        ) : (
          <span style={{ fontSize: '0.85em', color: isSelected ? '#ecf0f1' : '#95a5a6' }}>
            ({node.type})
          </span>
        )}
      </div>
      
      {('base' in node) && (
        <>
          <div style={{ marginLeft: (depth + 1) * 15, marginTop: 4, fontSize: '0.8em', color: '#bdc3c7' }}>Base:</div>
          <OutlinerTree 
            node={node.base} 
            selectedNodeId={selectedNodeId} 
            onSelect={onSelect} 
            onUpdateType={onUpdateType}
            depth={depth + 1} 
          />
          {node.nodes.length > 0 && (
            <div style={{ marginLeft: (depth + 1) * 15, marginTop: 4, fontSize: '0.8em', color: '#bdc3c7' }}>Operands:</div>
          )}
          {node.nodes.map((n) => (
            <OutlinerTree 
              key={n.id}
              node={n} 
              selectedNodeId={selectedNodeId} 
              onSelect={onSelect} 
              onUpdateType={onUpdateType}
              depth={depth + 1} 
            />
          ))}
        </>
      )}
    </div>
  );
};
