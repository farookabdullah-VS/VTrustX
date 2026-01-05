import { Serializer } from "survey-core";

// 1. Register 'renderGradient' property on Standard Rating
export const registerCustomTypes = () => {
    if (!Serializer.findProperty("rating", "renderGradient")) {
        Serializer.addProperty("rating", {
            name: "renderGradient",
            displayName: "Gradient Style",
            category: "general",
            choices: [
                { value: "none", text: "None" },
                { value: "nps", text: "NPS (0-10 Red -> Green)" },
                { value: "csat", text: "CSAT (1-5 Red -> Green)" },
                { value: "ces", text: "CES (1-5 Green -> Red)" }
            ],
            default: "none"
        });
    }
};

// 2. Color Definitions
const CSAT_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']; // Red -> Green
const CES_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']; // Green -> Red
const NPS_COLORS = [
    '#ef4444', // 0
    '#ef5939', // 1
    '#f06e2e', // 2
    '#f18423', // 3
    '#f19918', // 4
    '#f2ae0d', // 5
    '#eab308', // 6
    '#b4c407', // 7
    '#7ed506', // 8
    '#48e605', // 9
    '#22c55e'  // 10
];

// 3. Robust Coloring Logic & Design Surface Locking
export const setupSurveyColors = (survey) => {
    survey.onAfterRenderQuestion.add((sender, options) => {
        // Check our custom property
        const gradientType = options.question.renderGradient;

        // Safety check: only apply if property exists and is not 'none'
        if (!gradientType || gradientType === 'none') return;

        let colors;
        switch (gradientType) {
            case 'csat': colors = CSAT_COLORS; break;
            case 'ces': colors = CES_COLORS; break;
            case 'nps': colors = NPS_COLORS; break;
            default: return;
        }

        const root = options.htmlElement;

        // --- DESIGNER LOCKING LOGIC ---
        // Find the Survey Creator wrapper element to inject a locking class
        // Standard class in V2 Creator is 'svc-question__content' or 'svc-question'
        const creatorWrapper = root.closest('.svc-question__content') || root.closest('.svc-question') || root.closest('.sd-question');

        if (creatorWrapper) {
            creatorWrapper.classList.add('custom-locked-control');
        }

        // --- COLORING LOGIC ---
        // Find rating items (Support both modern .sd-* and legacy .sv-*)
        const items = root.querySelectorAll('.sd-rating__item, .sv-rating__item');

        items.forEach((item, index) => {
            if (index < colors.length) {
                // Apply Styles
                item.style.setProperty('background-color', colors[index], 'important');
                item.style.setProperty('border-color', colors[index], 'important');

                // Ensure text is readable (White)
                const textSpan = item.querySelector('span');
                if (textSpan) {
                    textSpan.style.setProperty('color', '#ffffff', 'important');
                    textSpan.style.setProperty('font-weight', 'bold', 'important');
                }
            }
        });
    });
};

// 4. Default VTrust Theme (Red)
export const VTrustTheme = {
    "themeName": "default",
    "colorPalette": "light",
    "isPanelless": false,
    "cssVariables": {
        "--sjs-primary-backcolor": "#b91c1c",
        "--sjs-primary-backcolor-light": "rgba(185, 28, 28, 0.1)",
        "--sjs-primary-backcolor-dark": "rgba(153, 27, 27, 1)",
        "--sjs-primary-forecolor": "rgba(255, 255, 255, 1)"
    }
};
