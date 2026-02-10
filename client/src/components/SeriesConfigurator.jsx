import React from 'react';

const SeriesConfigurator = ({ series = [], onChange }) => {
    const update = (idx, field, val) => {
        const newSeries = [...series];
        newSeries[idx] = { ...newSeries[idx], [field]: val };
        onChange(newSeries);
    };

    const add = () => onChange([...series, { type: 'bar', dataKey: '', color: '#000', name: '' }]);
    const remove = (idx) => onChange(series.filter((_, i) => i !== idx));

    return (
        <div style={{ background: '#f9f9f9', padding: '10px', marginTop: '10px' }}>
            <label><strong>Data Series Layers</strong></label>
            {series.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    <select value={s.type} onChange={(e) => update(i, 'type', e.target.value)}>
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                    </select>
                    <input placeholder="Key (e.g. revenue)" value={s.dataKey} onChange={(e) => update(i, 'dataKey', e.target.value)} />
                    <input type="color" value={s.color} onChange={(e) => update(i, 'color', e.target.value)} />
                    <button onClick={() => remove(i)} style={{ color: 'red' }}>&times;</button>
                </div>
            ))}
            <button onClick={add} style={{ width: '100%', marginTop: '5px' }}>+ Add Series</button>
        </div>
    );
};
export default SeriesConfigurator;
