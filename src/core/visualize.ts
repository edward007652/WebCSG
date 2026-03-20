/**
 * Exports an OpenCascade XCAF Document to a GLB file and creates a Blob URL.
 * 
 * @param oc The OpenCascade instance.
 * @param doc The OpenCascade TDocStd_Document containing the shapes to export.
 * @returns A temporary Object URL pointing to the generated GLB binary data.
 */
export function visualizeDoc(oc: any, doc: any) {
  // Export a GLB file (this will also perform the meshing)
  const cafWriter = new oc.RWGltf_CafWriter(new oc.TCollection_AsciiString_2("./file.glb"), true);
  cafWriter.Perform_2(new oc.Handle_TDocStd_Document_2(doc), new oc.TColStd_IndexedDataMapOfStringString_1(), new oc.Message_ProgressRange_1());

  // Read the GLB file from the virtual file system
  const glbFile = oc.FS.readFile("./file.glb", { encoding: "binary" });
  
  // Create a Blob URL so Three.js can load it directly from memory
  return URL.createObjectURL(new Blob([glbFile.buffer], { type: "model/gltf-binary" }));
}

/**
 * Prepares one or more TopoDS_Shape objects for visualization by meshing them
 * and placing them into an XCAF Document, then exports to GLB.
 * 
 * @param oc The OpenCascade instance.
 * @param shapes_ A single TopoDS_Shape or an array of TopoDS_Shape objects.
 * @returns A temporary Object URL pointing to the generated GLB binary data.
 */
export function visualizeShapes(oc: any, shapes_: any) {
  const shapes = Array.isArray(shapes_) ? shapes_ : [shapes_];

  // Create a document and add our shapes
  const doc = new oc.TDocStd_Document(new oc.TCollection_ExtendedString_1());
  const shapeTool = oc.XCAFDoc_DocumentTool.ShapeTool(doc.Main()).get();
  
  for (const s of shapes) {
    shapeTool.SetShape(shapeTool.NewShape(), s);
    // Tell OpenCascade that we want our shape to get meshed (triangulated)
    // Parameters like 0.1 control the deflection (quality/density) of the generated mesh
    new oc.BRepMesh_IncrementalMesh_2(s, 0.1, false, 0.1, false);
  }

  // Return our visualized document as a GLB URL
  return visualizeDoc(oc, doc);
}
