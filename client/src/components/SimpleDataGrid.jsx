import React, { useState } from 'react';

const SimpleDataGrid = ({ data }) => {
    const [sortConfig, setSortConfig] = useState(null);

    const sortedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        if (sortConfig !== null) {
            return [...data].sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return data;
    }, [data, sortConfig]);

    if (!data || data.length === 0) return <div style={{ padding: '20px', color: '#666' }}>No data available</div>;

    const columns = Object.keys(data[0]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col}
                                onClick={() => requestSort(col)}
                                style={{
                                    padding: '12px',
                                    textAlign: 'left',
                                    background: '#f8fafc',
                                    borderBottom: '2px solid #e2e8f0',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    color: '#475569',
                                    fontWeight: '600'
                                }}
                            >
                                {col}
                                {sortConfig && sortConfig.key === col && (
                                    <span style={{ marginLeft: '5px' }}>
                                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {columns.map((col) => (
                                <td key={col} style={{ padding: '12px', color: '#334155' }}>
                                    {row[col]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SimpleDataGrid;
