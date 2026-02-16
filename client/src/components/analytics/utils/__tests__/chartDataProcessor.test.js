/**
 * Unit tests for chartDataProcessor utility
 */

import {
  processChartData,
  getSeriesKeys,
  getColor
} from '../chartDataProcessor';

describe('chartDataProcessor', () => {
  describe('processChartData', () => {
    const mockData = [
      { region: 'North', product: 'A', sales: 100, date: '2024-01-01' },
      { region: 'North', product: 'B', sales: 150, date: '2024-01-01' },
      { region: 'South', product: 'A', sales: 200, date: '2024-01-02' },
      { region: 'South', product: 'B', sales: 250, date: '2024-01-02' },
      { region: 'East', product: 'A', sales: 300, date: '2024-01-03' }
    ];

    const mockFields = [
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'product', label: 'Product', type: 'text' },
      { name: 'sales', label: 'Sales', type: 'number' },
      { name: 'date', label: 'Date', type: 'date' }
    ];

    test('should group data by xKey with sum aggregation', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'sum'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result).toHaveLength(3); // North, South, East
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ region: 'North', sales: 250 }), // 100 + 150
        expect.objectContaining({ region: 'South', sales: 450 }), // 200 + 250
        expect.objectContaining({ region: 'East', sales: 300 })   // 300
      ]));
    });

    test('should group data by xKey with average aggregation', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'avg'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result).toHaveLength(3);
      expect(result[0].sales).toBe(125); // (100 + 150) / 2
    });

    test('should group data by xKey with count aggregation', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'count'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ region: 'North', sales: 2 }),
        expect.objectContaining({ region: 'South', sales: 2 }),
        expect.objectContaining({ region: 'East', sales: 1 })
      ]));
    });

    test('should handle legendKey for series grouping', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        legendKey: 'product',
        yAggregation: 'sum'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('A');
      expect(result[0]).toHaveProperty('B');
      expect(result[0].A).toBe(100);
      expect(result[0].B).toBe(150);
    });

    test('should apply topN filter', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'sum',
        topN: 2,
        sortBy: 'value_desc'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result).toHaveLength(2);
      expect(result[0].region).toBe('South'); // Highest: 450
      expect(result[1].region).toBe('East');  // Second: 300
    });

    test('should sort by value ascending', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'sum',
        sortBy: 'value_asc'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result[0].region).toBe('North'); // Lowest: 250
      expect(result[2].region).toBe('South'); // Highest: 450
    });

    test('should sort alphabetically', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'sum',
        sortBy: 'label_asc'
      };

      const result = processChartData(mockData, config, mockFields);

      expect(result[0].region).toBe('East');
      expect(result[1].region).toBe('North');
      expect(result[2].region).toBe('South');
    });

    test('should handle min aggregation', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'min'
      };

      const result = processChartData(mockData, config, mockFields);

      const north = result.find(r => r.region === 'North');
      expect(north.sales).toBe(100); // min of 100, 150
    });

    test('should handle max aggregation', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'max'
      };

      const result = processChartData(mockData, config, mockFields);

      const north = result.find(r => r.region === 'North');
      expect(north.sales).toBe(150); // max of 100, 150
    });

    test('should handle empty data', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        yAggregation: 'sum'
      };

      const result = processChartData([], config, mockFields);

      expect(result).toEqual([]);
    });

    test('should handle missing config keys', () => {
      const config = {};
      const result = processChartData(mockData, config, mockFields);

      // Should return original data or handle gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSeriesKeys', () => {
    test('should extract unique series keys from chart data', () => {
      const chartData = [
        { name: 'Jan', productA: 100, productB: 200 },
        { name: 'Feb', productA: 150, productB: 250, productC: 300 },
        { name: 'Mar', productA: 120, productB: 220 }
      ];

      const keys = getSeriesKeys(chartData);

      expect(keys).toContain('productA');
      expect(keys).toContain('productB');
      expect(keys).toContain('productC');
      expect(keys).not.toContain('name'); // X-axis key typically excluded
      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    test('should handle empty data', () => {
      const keys = getSeriesKeys([]);
      expect(Array.isArray(keys)).toBe(true);
    });

    test('should handle data with only one field', () => {
      const chartData = [{ name: 'Jan' }, { name: 'Feb' }];
      const keys = getSeriesKeys(chartData);

      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('getColor', () => {
    test('should return consistent color for same key', () => {
      const color1 = getColor('productA', 0);
      const color2 = getColor('productA', 0);

      expect(color1).toBe(color2);
    });

    test('should return different colors for different indices', () => {
      const color1 = getColor('product', 0);
      const color2 = getColor('product', 1);
      const color3 = getColor('product', 2);

      expect(color1).not.toBe(color2);
      expect(color2).not.toBe(color3);
    });

    test('should return valid hex color codes', () => {
      const color = getColor('test', 0);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('should cycle through color palette', () => {
      const colors = [];
      for (let i = 0; i < 20; i++) {
        colors.push(getColor('test', i));
      }

      // Should have colors defined
      expect(colors.every(c => c && c.startsWith('#'))).toBe(true);
    });
  });
});
