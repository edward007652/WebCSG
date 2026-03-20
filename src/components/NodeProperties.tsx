import React from 'react';
import type { CSGNode, PrimitiveNode } from '../types/cad.types';

/**
 * Helper component for Vector3 inputs (X, Y, Z coordinates).
 * Used for modifying Position and Rotation of nodes.
 */
const Vector3Input = ({ 
  label, 
  value, 
  onChange, 
  step = 1 
}: { 
  label: string, 
  value: [number, number, number], 
  onChange: (val: [number, number, number]) => void,
  step?: number 
}) => {
  const handleChange = (axis: number, val: string) => {
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      const newVals = [...value] as [number, number, number];
      newVals[axis] = numVal;
      onChange(newVals);
    }
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['X', 'Y', 'Z'].map((axisLabel, idx) => (
          <div key={axisLabel} style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#34495e', borderRadius: '4px', overflow: 'hidden', border: '1px solid #7f8c8d' }}>
            <span style={{ padding: '8px', background: '#2c3e50', color: '#ecf0f1', fontSize: '0.85em', fontWeight: 'bold' }}>{axisLabel}</span>
            <input 
              type="number" 
              step={step}
              value={value[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 4px', 
                backgroundColor: 'transparent', 
                color: 'white', 
                border: 'none', 
                outline: 'none',
                minWidth: '0' // prevents input from overflowing flex container
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface NodePropertiesProps {
  node: CSGNode | null;
  onUpdateParameters: (id: string, params: Record<string, number>) => void;
  onUpdatePosition: (id: string, position: [number, number, number]) => void;
  onUpdateRotation: (id: string, rotation: [number, number, number]) => void;
  onUpdateType?: (id: string, type: 'SUBTRACT' | 'UNION') => void;
  onRemove?: (id: string) => void;
}

/**
 * Component to display and edit properties of the currently selected CSG node.
 * It renders different controls based on whether the node is a Primitive or an Operation.
 */
export const NodeProperties: React.FC<NodePropertiesProps> = ({ 
  node, 
  onUpdateParameters, 
  onUpdatePosition,
  onUpdateRotation,
  onUpdateType,
  onRemove
}) => {
  if (!node) {
    return <div style={{ marginTop: 20 }}>Select a node to edit properties</div>;
  }

  const isPrimitive = node.type === 'BOX' || node.type === 'CYLINDER';
  const isOperation = node.type === 'SUBTRACT' || node.type === 'UNION';

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{node.name} Properties</h3>
      
      {isPrimitive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h4>Parameters</h4>
          {Object.entries((node as PrimitiveNode).parameters).map(([key, value]) => (
            <div key={key}>
              <label>{key}: {value}</label>
              <br />
              <input 
                type="range" 
                min="0.1" 
                max="20" 
                step="0.1"
                value={value}
                onChange={(e) => {
                  onUpdateParameters(node.id, {
                    ...(node as PrimitiveNode).parameters,
                    [key]: parseFloat(e.target.value)
                  });
                }}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Position is now applicable to ALL nodes (BaseNode) */}
      <Vector3Input 
        label="Position [X, Y, Z]" 
        value={node.position} 
        onChange={(newPos) => onUpdatePosition(node.id, newPos)} 
        step={0.5} 
      />

      {/* Rotation applicable to ALL nodes */}
      <Vector3Input 
        label="Rotation [X, Y, Z] (Degrees)" 
        value={node.rotation || [0, 0, 0]} 
        onChange={(newRot) => onUpdateRotation(node.id, newRot)} 
        step={5} 
      />

      {isOperation && onUpdateType && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h4>Operation Type</h4>
          <select 
            value={node.type} 
            onChange={(e) => onUpdateType(node.id, e.target.value as 'SUBTRACT' | 'UNION')}
            style={{ padding: '8px', borderRadius: '4px', border: 'none' }}
          >
            <option value="SUBTRACT">SUBTRACT</option>
            <option value="UNION">UNION</option>
          </select>
        </div>
      )}

      {onRemove && (
        <button 
          onClick={() => onRemove(node.id)}
          style={{
            marginTop: 20,
            padding: '8px 12px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            width: '100%'
          }}
        >
          {isOperation ? 'Remove Operation & Children' : 'Remove Node'}
        </button>
      )}
    </div>
  );
};
