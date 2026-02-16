/**
 * Unit tests for chartAxisConfig utility
 */

import {
  getXAxisProps,
  getYAxisProps,
  getSecondaryYAxisProps,
  getCommonChartProps,
  getElementProps
} from '../chartAxisConfig';

describe('chartAxisConfig', () => {
  const mockFields = [
    { name: 'region', label: 'Region', type: 'text' },
    { name: 'sales', label: 'Sales ($)', type: 'number' },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'date', label: 'Date', type: 'date' }
  ];

  describe('getXAxisProps', () => {
    test('should return basic props for text axis', () => {
      const config = { xKey: 'region' };
      const props = getXAxisProps('text', config, mockFields);

      expect(props).toHaveProperty('dataKey', 'region');
      expect(props).toHaveProperty('label');
      expect(props.label).toHaveProperty('value', 'Region');
    });

    test('should return date formatting props for date axis', () => {
      const config = { xKey: 'date' };
      const props = getXAxisProps('date', config, mockFields);

      expect(props).toHaveProperty('dataKey', 'date');
      expect(props.label.value).toBe('Date');
    });

    test('should handle missing field label', () => {
      const config = { xKey: 'unknownField' };
      const props = getXAxisProps('text', config, mockFields);

      expect(props.dataKey).toBe('unknownField');
      // Should gracefully handle missing field
      expect(props.label).toBeDefined();
    });

    test('should apply angle for rotated labels', () => {
      const config = { xKey: 'region', xAxisAngle: -45 };
      const props = getXAxisProps('text', config, mockFields);

      expect(props).toHaveProperty('angle', -45);
      expect(props).toHaveProperty('textAnchor', 'end');
    });

    test('should handle custom label', () => {
      const config = { xKey: 'region', xLabel: 'Custom Region Label' };
      const props = getXAxisProps('text', config, mockFields);

      expect(props.label.value).toBe('Custom Region Label');
    });
  });

  describe('getYAxisProps', () => {
    test('should return basic props for numeric axis', () => {
      const config = { yKey: 'sales' };
      const props = getYAxisProps(config, mockFields);

      expect(props).toHaveProperty('label');
      expect(props.label.value).toBe('Sales ($)');
      expect(props.label.angle).toBe(-90);
    });

    test('should handle custom Y label', () => {
      const config = { yKey: 'sales', yLabel: 'Revenue' };
      const props = getYAxisProps(config, mockFields);

      expect(props.label.value).toBe('Revenue');
    });

    test('should handle missing field', () => {
      const config = { yKey: 'unknownField' };
      const props = getYAxisProps(config, mockFields);

      expect(props.label).toBeDefined();
    });

    test('should include axis position', () => {
      const config = { yKey: 'sales' };
      const props = getYAxisProps(config, mockFields);

      expect(props).toHaveProperty('yAxisId', 'left');
      expect(props).toHaveProperty('orientation', 'left');
    });
  });

  describe('getSecondaryYAxisProps', () => {
    test('should return props for secondary axis', () => {
      const config = { secondaryYKey: 'quantity' };
      const props = getSecondaryYAxisProps(config, mockFields);

      expect(props).toHaveProperty('yAxisId', 'right');
      expect(props).toHaveProperty('orientation', 'right');
      expect(props.label.value).toBe('Quantity');
    });

    test('should return null when no secondary key', () => {
      const config = {};
      const props = getSecondaryYAxisProps(config, mockFields);

      expect(props).toBeNull();
    });

    test('should handle custom secondary label', () => {
      const config = {
        secondaryYKey: 'quantity',
        secondaryYLabel: 'Units Sold'
      };
      const props = getSecondaryYAxisProps(config, mockFields);

      expect(props.label.value).toBe('Units Sold');
    });
  });

  describe('getCommonChartProps', () => {
    test('should return props with click handler', () => {
      const mockClickHandler = jest.fn();
      const props = getCommonChartProps(mockClickHandler);

      expect(props).toHaveProperty('onClick');
      expect(typeof props.onClick).toBe('function');
    });

    test('should call click handler when triggered', () => {
      const mockClickHandler = jest.fn();
      const props = getCommonChartProps(mockClickHandler);

      const mockData = { activeLabel: 'Test' };
      props.onClick(mockData);

      expect(mockClickHandler).toHaveBeenCalledWith(mockData);
    });

    test('should include common styling props', () => {
      const mockClickHandler = jest.fn();
      const props = getCommonChartProps(mockClickHandler);

      // Should include margin settings for proper spacing
      expect(props).toHaveProperty('margin');
    });
  });

  describe('getElementProps', () => {
    test('should return props with click handler', () => {
      const mockClickHandler = jest.fn();
      const props = getElementProps(mockClickHandler);

      expect(props).toHaveProperty('onClick');
      expect(typeof props.onClick).toBe('function');
    });

    test('should call click handler on element click', () => {
      const mockClickHandler = jest.fn();
      const props = getElementProps(mockClickHandler);

      const mockEvent = { name: 'Region A', value: 100 };
      props.onClick(mockEvent);

      expect(mockClickHandler).toHaveBeenCalledWith(mockEvent);
    });

    test('should include cursor style', () => {
      const mockClickHandler = jest.fn();
      const props = getElementProps(mockClickHandler);

      expect(props).toHaveProperty('cursor', 'pointer');
    });
  });

  describe('Integration tests', () => {
    test('should work together for complete chart configuration', () => {
      const config = {
        xKey: 'region',
        yKey: 'sales',
        secondaryYKey: 'quantity'
      };
      const mockClickHandler = jest.fn();

      const xAxisProps = getXAxisProps('text', config, mockFields);
      const yAxisProps = getYAxisProps(config, mockFields);
      const secondaryYAxisProps = getSecondaryYAxisProps(config, mockFields);
      const commonProps = getCommonChartProps(mockClickHandler);
      const elementProps = getElementProps(mockClickHandler);

      // All props should be valid objects
      expect(xAxisProps).toBeTruthy();
      expect(yAxisProps).toBeTruthy();
      expect(secondaryYAxisProps).toBeTruthy();
      expect(commonProps).toBeTruthy();
      expect(elementProps).toBeTruthy();

      // Props should have expected keys
      expect(xAxisProps).toHaveProperty('dataKey');
      expect(yAxisProps).toHaveProperty('yAxisId', 'left');
      expect(secondaryYAxisProps).toHaveProperty('yAxisId', 'right');
      expect(commonProps).toHaveProperty('onClick');
      expect(elementProps).toHaveProperty('onClick');
    });
  });
});
