import { Serializer, ElementFactory } from "survey-core";

export function initLoopLogic(creator) {
    if (!creator) return;

    if (creator.onDefineElementMenuItems && typeof creator.onDefineElementMenuItems.add === 'function') {
        creator.onDefineElementMenuItems.add((sender, options) => {
            const q = options.obj;
            if (!q) return;

            // Prevent nesting loops indefinitely or looping panels for now to simplify
            if (!['paneldynamic', 'page', 'html'].includes(q.getType())) {

                // Separation: Check if item already exists to avoid dupes
                if (options.items.find(i => i.id === 'wrap-loop')) return;

                options.items.push({
                    id: 'wrap-loop',
                    title: '🔁 Loop / Repeat',
                    tooltip: 'Repeat this question multiple times (Dynamic)',
                    action: () => {
                        try {
                            const parent = q.parent;
                            if (!parent) {
                                alert("Cannot add loop here: Parent container not found.");
                                return;
                            }

                            if (!confirm("Wrap this question in a Loop (Dynamic Panel) for repeated entry?")) return;

                            // 0. Prompt for Logic Binding
                            const bindSource = prompt("To create a Dependent Loop, enter the SOURCE Question Name (e.g. 'number_of_kids').\nLeave empty for a standard User-Defined loop (Add/Remove buttons).");

                            // 1. Create Dynamic Panel Instance
                            const panelName = "loop_" + q.name;
                            const panel = ElementFactory.Instance.createElement("paneldynamic", panelName);
                            if (!panel) throw new Error("Could not create 'paneldynamic' element.");

                            panel.title = "Loop: " + (q.title || q.name);
                            panel.renderMode = "list";

                            if (bindSource && bindSource.trim()) {
                                // Logic-Driven (Dependent Loop)
                                panel.bindings.panelCount = bindSource.trim();
                                panel.minPanelCount = 0; // Usually handled by source, but safe init
                                panel.allowAddPanel = false; // Disable manual add if bound
                                panel.allowRemovePanel = false; // Disable manual remove if bound
                            } else {
                                // User-Defined (Do-While)
                                panel.panelCount = 1;
                                panel.minPanelCount = 1;
                                panel.confirmDelete = true;
                            }

                            // 2. Clone the properties of the selected element
                            const elJson = q.toJSON();

                            // 3. Add element to template
                            const templateQ = ElementFactory.Instance.createElement(q.getType(), q.name);
                            if (!templateQ) throw new Error(`Could not create template element of type '${q.getType()}'.`);

                            templateQ.fromJSON(elJson);

                            panel.templateElements.push(templateQ);

                            // 4. Swap positions in the parent container
                            const index = parent.elements.indexOf(q);
                            if (index < 0) throw new Error("Original question not found in parent elements.");

                            // Remove original
                            parent.removeElement(q);

                            // Insert the new loop panel
                            parent.addElement(panel, index);

                            // 5. Focus the new panel
                            sender.selectedElement = panel;

                        } catch (err) {
                            alert("Failed to create loop: " + err.message);
                        }
                    }
                });
            }
        });
    }
}
