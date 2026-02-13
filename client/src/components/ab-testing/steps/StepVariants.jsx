import { Plus, Trash2 } from 'lucide-react';
import './Steps.css';

/**
 * Step 2: Create Variants
 *
 * Create 2-5 variants with different content:
 * - Variant name (auto-assigned: A, B, C, D, E)
 * - Subject line (email only)
 * - Body content (required)
 * - Media attachments (optional)
 */
export default function StepVariants({ config, setConfig }) {
    const handleAddVariant = () => {
        if (config.variants.length >= 5) {
            return;
        }

        const variantNames = ['A', 'B', 'C', 'D', 'E'];
        const nextName = variantNames[config.variants.length];

        const equalAllocation = 100 / (config.variants.length + 1);

        // Recalculate traffic for all variants
        const updatedVariants = config.variants.map(v => ({
            ...v,
            trafficAllocation: parseFloat(equalAllocation.toFixed(1))
        }));

        setConfig(prev => ({
            ...prev,
            variants: [
                ...updatedVariants,
                {
                    name: nextName,
                    subject: '',
                    body: '',
                    mediaAttachments: [],
                    trafficAllocation: parseFloat(equalAllocation.toFixed(1))
                }
            ]
        }));
    };

    const handleRemoveVariant = (index) => {
        if (config.variants.length <= 2) {
            return;
        }

        const newVariants = config.variants.filter((_, i) => i !== index);

        // Recalculate traffic allocation
        const equalAllocation = 100 / newVariants.length;
        const updatedVariants = newVariants.map(v => ({
            ...v,
            trafficAllocation: parseFloat(equalAllocation.toFixed(1))
        }));

        setConfig(prev => ({
            ...prev,
            variants: updatedVariants
        }));
    };

    const handleVariantChange = (index, field, value) => {
        setConfig(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            )
        }));
    };

    return (
        <div className="step-container">
            <div className="step-header-with-action">
                <div>
                    <h2>Create Variants</h2>
                    <p className="step-description">
                        Create 2-5 variants to test different message content
                    </p>
                </div>
                <button
                    className="btn-add-variant"
                    onClick={handleAddVariant}
                    disabled={config.variants.length >= 5}
                >
                    <Plus size={18} />
                    Add Variant
                </button>
            </div>

            <div className="variants-list">
                {config.variants.map((variant, index) => (
                    <div key={variant.name} className="variant-card" data-variant={variant.name}>
                        {/* Variant header */}
                        <div className="variant-header">
                            <div className="variant-badge">
                                Variant {variant.name}
                            </div>
                            {config.variants.length > 2 && (
                                <button
                                    className="btn-remove-variant"
                                    onClick={() => handleRemoveVariant(index)}
                                    title="Remove variant"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Subject (email only) */}
                        {config.channel === 'email' && (
                            <div className="form-group">
                                <label htmlFor={`subject-${variant.name}`}>
                                    Subject Line <span className="required">*</span>
                                </label>
                                <input
                                    id={`subject-${variant.name}`}
                                    name="subject"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Hello {{name}}! Take our survey"
                                    value={variant.subject}
                                    onChange={(e) => handleVariantChange(index, 'subject', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Body */}
                        <div className="form-group">
                            <label htmlFor={`body-${variant.name}`}>
                                Message Body <span className="required">*</span>
                            </label>
                            <textarea
                                id={`body-${variant.name}`}
                                name="body"
                                className="form-textarea"
                                placeholder="Hi {{name}},&#10;&#10;We'd love your feedback! Click here: {{link}}"
                                rows={5}
                                value={variant.body}
                                onChange={(e) => handleVariantChange(index, 'body', e.target.value)}
                            />
                            <p className="field-hint">
                                Use placeholders: <code>{'{{name}}'}</code>, <code>{'{{link}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{phone}}'}</code>
                            </p>
                        </div>

                        {/* Media attachments placeholder */}
                        <div className="form-group">
                            <label>Media Attachments</label>
                            <div className="media-placeholder">
                                No media selected (optional)
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
