import React from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * Reusable virtualized list component.
 * Renders only visible rows for large datasets (contacts, results, analytics).
 *
 * Usage:
 *   <VirtualizedList
 *     items={filteredContacts}
 *     height={500}
 *     itemHeight={60}
 *     renderItem={({ item, index, style }) => (
 *       <div style={style} key={item.id}>
 *         {item.name}
 *       </div>
 *     )}
 *   />
 */
const VirtualizedList = React.memo(({ items, height = 400, itemHeight = 50, width = '100%', renderItem }) => {
    if (!items || items.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No items to display</div>;
    }

    // For small lists, render normally (virtualization overhead not worth it)
    if (items.length < 50) {
        return (
            <div style={{ height, overflow: 'auto' }}>
                {items.map((item, index) => renderItem({ item, index, style: {} }))}
            </div>
        );
    }

    const Row = ({ index, style }) => {
        return renderItem({ item: items[index], index, style });
    };

    return (
        <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
        >
            {Row}
        </List>
    );
});

export default VirtualizedList;
