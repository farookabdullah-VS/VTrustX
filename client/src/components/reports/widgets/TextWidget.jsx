/**
 * Text Widget
 *
 * Displays text content (headings, descriptions, etc.)
 */

import React from 'react';
import { X } from 'lucide-react';

const TextWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const content = widget.config?.content || 'Enter text here';

    return (
        <div
            className={`widget text-widget ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={widget.style}
        >
            <div className="widget-header">
                <button className="widget-remove" onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}>
                    <X size={16} />
                </button>
            </div>

            <div className="text-content" style={{ fontSize: widget.config?.fontSize || 16 }}>
                {content}
            </div>
        </div>
    );
};

export default TextWidget;
