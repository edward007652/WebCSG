import type { CSGNode } from '../types/cad.types';

/**
 * Helper function to apply transformations (translation and rotation) to an OpenCascade shape.
 * 
 * @param oc The OpenCascade instance.
 * @param shape The TopoDS_Shape to be transformed.
 * @param position Translation vector [x, y, z].
 * @param rotation Euler angles [rx, ry, rz] in degrees.
 * @returns The transformed TopoDS_Shape.
 */
function applyTransform(oc: any, shape: any, position: [number, number, number], rotation: [number, number, number]): any {
  const [x, y, z] = position;
  const [rx, ry, rz] = rotation;
  
  if (x === 0 && y === 0 && z === 0 && rx === 0 && ry === 0 && rz === 0) {
    return shape; // No transformation needed if parameters are all zeros
  }

  const transform = new oc.gp_Trsf_1();

  // Apply rotation (convert from degrees to radians)
  if (rx !== 0 || ry !== 0 || rz !== 0) {
    // OpenCascade uses Quaternions or axis-based rotations.
    // To combine rotations, we create individual transformations and multiply them.
    const degToRad = Math.PI / 180;
    
    if (rx !== 0) {
      const rotX = new oc.gp_Trsf_1();
      rotX.SetRotation_1(new oc.gp_Ax1_2(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(1, 0, 0)), rx * degToRad);
      transform.Multiply(rotX);
    }
    if (ry !== 0) {
      const rotY = new oc.gp_Trsf_1();
      rotY.SetRotation_1(new oc.gp_Ax1_2(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(0, 1, 0)), ry * degToRad);
      transform.Multiply(rotY);
    }
    if (rz !== 0) {
      const rotZ = new oc.gp_Trsf_1();
      rotZ.SetRotation_1(new oc.gp_Ax1_2(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(0, 0, 1)), rz * degToRad);
      transform.Multiply(rotZ);
    }
  }

  // Apply translation. Translation should be applied relative to the parent space, 
  // effectively moving the object after it has been rotated in its local space.
  if (x !== 0 || y !== 0 || z !== 0) {
    const translation = new oc.gp_Trsf_1();
    translation.SetTranslation_1(new oc.gp_Vec_4(x, y, z));
    
    // Multiply translation BEFORE rotation in OpenCascade context
    // (T = T1 * T2 means T2 is applied first).
    // T = Translation * Rotation -> object rotates in place, then translates to the new position.
    const finalTransform = translation;
    finalTransform.Multiply(transform);
    
    const brepTransform = new oc.BRepBuilderAPI_Transform_2(shape, finalTransform, true);
    return brepTransform.Shape();
  }

  const brepTransform = new oc.BRepBuilderAPI_Transform_2(shape, transform, true);
  return brepTransform.Shape();
}

/**
 * Recursively evaluates the CSG tree and generates the final 3D shape.
 * 
 * @param oc The OpenCascade instance.
 * @param node The current CSG node being evaluated (Root node to start).
 * @returns The resulting TopoDS_Shape.
 */
export function evaluateCSGTree(oc: any, node: CSGNode): any {
  let shapeToReturn: any = null;

  if (node.type === 'BOX') {
    const { width, height, depth } = node.parameters;
    // Box in OpenCascade starts from [0,0,0] to [w,h,d].
    // We translate it to center it around the origin so rotation happens around its geometric center.
    const box = new oc.BRepPrimAPI_MakeBox_2(width, height, depth);
    const shape = box.Shape();
    
    const centerTrsf = new oc.gp_Trsf_1();
    centerTrsf.SetTranslation_1(new oc.gp_Vec_4(-width/2, -height/2, -depth/2));
    const centeredBox = new oc.BRepBuilderAPI_Transform_2(shape, centerTrsf, true);
    shapeToReturn = centeredBox.Shape();
  }
  
  else if (node.type === 'CYLINDER') {
    const { radius, height } = node.parameters;
    // Cylinder by default is along Z axis from [0,0,0] to [0,0,height].
    // We adjust its axis placement to center it along the Z axis for better rotation behavior.
    const axes = new oc.gp_Ax2_3(new oc.gp_Pnt_3(0, 0, -height/2), new oc.gp_Dir_4(0, 0, 1));
    const cylinder = new oc.BRepPrimAPI_MakeCylinder_3(axes, radius, height);
    shapeToReturn = cylinder.Shape();
  }

  else if (node.type === 'SUBTRACT') {
    // Evaluate the base shape first
    let resultShape = evaluateCSGTree(oc, node.base);
    
    if (resultShape) {
      // Subtract each tool node from the base shape sequentially
      for (const toolNode of node.nodes) {
        const toolShape = evaluateCSGTree(oc, toolNode);
        if (toolShape) {
          const cut = new oc.BRepAlgoAPI_Cut_3(resultShape, toolShape, new oc.Message_ProgressRange_1());
          cut.Build(new oc.Message_ProgressRange_1());
          resultShape = cut.Shape();
        }
      }
    }
    shapeToReturn = resultShape;
  }

  else if (node.type === 'UNION') {
    // Evaluate the base shape first
    let resultShape = evaluateCSGTree(oc, node.base);
    
    if (resultShape) {
      // Fuse (union) each tool node with the base shape sequentially
      for (const toolNode of node.nodes) {
        const toolShape = evaluateCSGTree(oc, toolNode);
        if (toolShape) {
          const fuse = new oc.BRepAlgoAPI_Fuse_3(resultShape, toolShape, new oc.Message_ProgressRange_1());
          fuse.Build(new oc.Message_ProgressRange_1());
          resultShape = fuse.Shape();
        }
      }
    }
    shapeToReturn = resultShape;
  }

  if (!shapeToReturn) {
    throw new Error(`Unsupported node type or evaluation failed: ${(node as any).type}`);
  }

  // Apply position (translation) and rotation to EVERY evaluated node.
  // This allows child nodes in operations to be positioned relative to their parent.
  return applyTransform(oc, shapeToReturn, node.position, node.rotation || [0, 0, 0]);
}
