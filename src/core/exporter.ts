/**
 * Exports an OpenCascade shape to a STEP format string.
 * 
 * @param oc The OpenCascade instance.
 * @param shape The TopoDS_Shape to export.
 * @returns The contents of the generated STEP file as a string.
 */
export function exportSTEP(oc: any, shape: any): string {
  const writer = new oc.STEPControl_Writer_1();
  // The correct method signature in opencascade.js for STEPControl_Writer.Transfer is typically Transfer(shape, mode, compgraph, progress)
  // STEPControl_AsIs is 1
  writer.Transfer(shape, 1, true, new oc.Message_ProgressRange_1()); 
  
  // Write to a virtual file
  writer.Write('model.step');
  
  // Read the virtual file
  const stepFile = oc.FS.readFile('model.step', { encoding: 'utf8' });
  return stepFile;
}

/**
 * Triggers a browser download of the provided STEP content.
 * 
 * @param stepContent The string content of the STEP file.
 * @param filename The desired name for the downloaded file (default: 'model.step').
 */
export function downloadSTEP(stepContent: string, filename: string = 'model.step') {
  const blob = new Blob([stepContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
