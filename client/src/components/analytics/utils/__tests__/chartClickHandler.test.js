/**
 * Unit tests for chartClickHandler utility
 */

import { createChartClickHandler } from '../chartClickHandler';

describe('chartClickHandler', () => {
  describe('createChartClickHandler', () => {
    test('should create a function', () => {
      const config = { xKey: 'region' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      expect(typeof handler).toBe('function');
    });

    test('should handle legend click to toggle filter', () => {
      const config = { xKey: 'region', legendKey: 'product' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Simulate legend click
      const legendData = { value: 'Product A' };
      handler(legendData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        product: ['Product A']
      });
    });

    test('should remove filter if already exists (toggle off)', () => {
      const config = { xKey: 'region', legendKey: 'product' };
      const filters = { product: ['Product A'] };
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Click same legend item again
      const legendData = { value: 'Product A' };
      handler(legendData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        product: []
      });
    });

    test('should handle axis click for xKey filter', () => {
      const config = { xKey: 'region' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Simulate axis label click
      const axisData = { value: 'North Region' };
      handler(axisData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        region: ['North Region']
      });
    });

    test('should handle data point click', () => {
      const config = { xKey: 'region' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Simulate clicking on a bar/point
      const pointData = { region: 'South' };
      handler(pointData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        region: ['South']
      });
    });

    test('should add to existing filters (multi-select)', () => {
      const config = { xKey: 'region' };
      const filters = { region: ['North'] };
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Click on another region
      const pointData = { region: 'South' };
      handler(pointData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        region: ['North', 'South']
      });
    });

    test('should handle empty data gracefully', () => {
      const config = { xKey: 'region' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Click with no data
      handler(null, 0);

      // Should not crash
      expect(onFilterChange).not.toHaveBeenCalled();
    });

    test('should handle undefined config gracefully', () => {
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(undefined, filters, onFilterChange);

      expect(typeof handler).toBe('function');

      // Should not crash when called
      handler({ value: 'test' }, 0);
    });

    test('should preserve other filters when updating one', () => {
      const config = { xKey: 'region' };
      const filters = { product: ['Product A'], status: ['Active'] };
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      const pointData = { region: 'North' };
      handler(pointData, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        product: ['Product A'],
        status: ['Active'],
        region: ['North']
      });
    });

    test('should handle activeLabel from chart click events', () => {
      const config = { xKey: 'date' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      // Some charts pass activeLabel instead of direct data
      const chartEvent = { activeLabel: '2024-01-15' };
      handler(chartEvent, 0);

      expect(onFilterChange).toHaveBeenCalledWith({
        date: ['2024-01-15']
      });
    });

    test('should handle complex nested data structures', () => {
      const config = { xKey: 'region' };
      const filters = {};
      const onFilterChange = jest.fn();

      const handler = createChartClickHandler(config, filters, onFilterChange);

      const complexData = {
        region: 'West',
        payload: { region: 'West', sales: 1000 },
        other: 'data'
      };
      handler(complexData, 0);

      expect(onFilterChange).toHaveBeenCalled();
    });
  });

  describe('Filter state management', () => {
    test('should toggle filter on/off with repeated clicks', () => {
      const config = { xKey: 'region' };
      let currentFilters = {};
      const onFilterChange = jest.fn((newFilters) => {
        currentFilters = newFilters;
      });

      // First click - add filter
      let handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'North' }, 0);
      expect(onFilterChange).toHaveBeenLastCalledWith({ region: ['North'] });
      currentFilters = { region: ['North'] };

      // Second click on same - remove filter
      handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'North' }, 0);
      expect(onFilterChange).toHaveBeenLastCalledWith({ region: [] });
      currentFilters = { region: [] };

      // Third click - add again
      handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'North' }, 0);
      expect(onFilterChange).toHaveBeenLastCalledWith({ region: ['North'] });
    });

    test('should support multiple selections before toggling off', () => {
      const config = { xKey: 'region' };
      let currentFilters = {};
      const onFilterChange = jest.fn((newFilters) => {
        currentFilters = newFilters;
      });

      // Click region 1
      let handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'North' }, 0);
      currentFilters = { region: ['North'] };

      // Click region 2
      handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'South' }, 0);
      currentFilters = { region: ['North', 'South'] };

      // Click region 1 again to remove
      handler = createChartClickHandler(config, currentFilters, onFilterChange);
      handler({ region: 'North' }, 0);

      expect(onFilterChange).toHaveBeenLastCalledWith({ region: ['South'] });
    });
  });
});
