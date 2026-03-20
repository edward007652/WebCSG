Technical Exercise: Browser-Based Parametric 3D
Modelling
You are asked to build a small browser application that demonstrates parametric, nondestructive 3D modelling.
The goal is not visual polish, but correctness of approach and architecture.
What you need to build
Create a browser-based 3D scene in which:
• A rectangular solid (box) is displayed
• A cylindrical cut is applied through the solid, forming a hole
This cut must behave as a parametric feature, not a destructive mesh operation.
Functional requirements
1. Scene and rendering
• Render a 3D object in the browser
• Provide basic camera controls (orbit, zoom, pan) polish doesnt matter, just able to
move the camera around
2. Parametric cut feature
Implement a cylindrical cut through the solid such that:
• The cylinder acts as a subtractive operation
• The resulting geometry shows a clean hole through the object
3. Editing behaviour (core requirement)
The cylindrical cut must be fully editable after creation.
You must support:
• Moving the cut to a different position
• Changing its diameter
• Removing the cut entirely
Each change must update the resulting geometry correctly.
4. Non-destructive modelling
Your implementation must ensure:
• The underlying solid is not permanently modified
• Geometry is regenerated from a source-of-truth model
• Edits do not degrade the mesh over time
5. Data model
You should maintain a clear representation of:
• The base solid
• The applied operations (e.g. the cylindrical cut and its parameters)
You are free to design this structure, but it must support regeneration of the model at any
time.
6. Export requirement (important)
The resulting model must be exportable in a parametric or CAD-compatible format, such
as:
• STEP (preferred)
• Or another format suitable for import into tools like AutoCAD
The exported result should reflect the current state of the model.
7. User interaction (minimal UI)
Provide simple controls to:
• Adjust the position of the cut
• Adjust the diameter
• Add or remove the cut
Basic controls are sufficient (sliders, inputs, or simple UI elements, whatever you want to
use is fine).
Technical guidance
You may use any appropriate tools or libraries, for example:
• Geometry kernel such as OpenCascade js - parametric
• Three.js for rendering or better
• Your choice of tools should be justified by your implementation.
Deliverables
Please provide:
1. A working demo (hosted or runnable locally)
2. Source code
3. A short written explanation covering:
◦ Your architecture
◦ How you implemented non-destructive editing
◦ Limitations or trade-offs in your approach
What we are evaluating
We are primarily interested in:
• Your understanding of parametric vs destructive modelling
• How you structure and manage geometry data
• Your ability to produce stable, editable results