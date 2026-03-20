/**
 * Defines the possible types of nodes in the CSG (Constructive Solid Geometry) tree.
 * - 'BOX': A rectangular prism primitive.
 * - 'CYLINDER': A cylindrical primitive.
 * - 'SUBTRACT': A boolean operation that subtracts child nodes from a base node.
 * - 'UNION': A boolean operation that merges child nodes with a base node.
 */
export type NodeType = 'BOX' | 'CYLINDER' | 'SUBTRACT' | 'UNION';

/**
 * The base interface for all nodes in the CSG tree.
 * Contains common properties shared by both primitive shapes and operations.
 */
export interface BaseNode {
  /** Unique identifier for the node (e.g., UUID or structured string like 'box-1'). */
  id: string;
  /** The specific type of the node, determining how it's processed by the geometry engine. */
  type: NodeType;
  /** Human-readable name displayed in the UI (Outliner tree). */
  name: string;
  /** 
   * Local translation offset [x, y, z] relative to the parent node. 
   * For the root node, this is relative to the world origin.
   */
  position: [number, number, number];
  /** 
   * Local rotation angles [x, y, z] in degrees, relative to the parent node.
   * Rotation is typically applied before translation in the transformation matrix.
   */
  rotation: [number, number, number];
}

/**
 * Represents a basic geometric shape (leaf node in the CSG tree).
 */
export interface PrimitiveNode extends BaseNode {
  /** Restricts the type to only primitive shapes. */
  type: 'BOX' | 'CYLINDER';
  /** 
   * A dictionary of shape-specific parameters.
   * - For BOX: { width: number, height: number, depth: number }
   * - For CYLINDER: { radius: number, height: number }
   */
  parameters: Record<string, number>;
}

/**
 * Represents a boolean operation applied to other nodes (branch node in the CSG tree).
 */
export interface OperationNode extends BaseNode {
  /** Restricts the type to boolean operations. */
  type: 'SUBTRACT' | 'UNION';
  /** 
   * The primary node (shape) that operations will be applied to.
   * For example, in a SUBTRACT operation, this is the object being cut into.
   */
  base: CSGNode;
  /** 
   * An array of nodes to apply against the base node.
   * For example, in a SUBTRACT operation, these are the shapes representing the holes.
   */
  nodes: CSGNode[];
}

/**
 * A union type representing any valid node within the CSG tree structure.
 */
export type CSGNode = PrimitiveNode | OperationNode;

/**
 * Represents the entire state of a parametric 3D model document.
 * This structure is used for saving/loading the project to/from JSON.
 */
export interface ParametricDocument {
  /** Document format version, useful for future backward compatibility. */
  version: string;
  /** The top-level root node of the CSG tree. Evaluating this node generates the final 3D model. */
  root: CSGNode;
  /** 
   * Optional saved state of the 3D viewport camera.
   * Allows restoring the exact view angle when loading a saved document.
   */
  camera?: {
    /** The 3D coordinate position of the camera lens. */
    position: [number, number, number];
    /** The 3D coordinate point the camera is looking at (orbit center). */
    target: [number, number, number];
  };
}
