/**
 * Table Widget
 *
 * Displays paginated data table
 */

import React from 'react';
import { X } from 'lucide-react';

const TableWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const rows = data?.rows || [];
    const total = data?.total || 0;
    const page = data?.page || 1;
    const totalPages = data?.totalPages || 1;

    return (
        <div
            className={`widget table-widget ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={widget.style}
        >
            <div className="widget-header">
                {widget.showTitle && <h3 className="widget-title">{widget.title}</h3>}
                <button className="widget-remove" onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}>
                    <X size={16} />
                </button>
            </div>

            <div className="table-content">
                {rows.length === 0 ? (
                    <div className="table-empty">
                        <p>No data available</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {Object.keys(rows[0] || {}).slice(0, 5).map((key) => (
                                        <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index}>
                                        {Object.values(row).slice(0, 5).map((value, idx) => (
                                            <td key={idx}>{String(value).substring(0, 50)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="table-pagination">
                            <span>Page {page} of {totalPages} ({total} total)</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TableWidget;
