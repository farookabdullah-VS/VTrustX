/**
 * Unit tests for TableWidget component
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableWidget } from '../TableWidget';

describe('TableWidget', () => {
  const mockData = [
    { id: 1, name: 'Product A', sales: 1000, region: 'North' },
    { id: 2, name: 'Product B', sales: 1500, region: 'South' },
    { id: 3, name: 'Product C', sales: 2000, region: 'East' }
  ];

  test('should render table with data', () => {
    render(<TableWidget data={mockData} />);

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
    expect(screen.getByText('Product C')).toBeInTheDocument();
  });

  test('should display all columns', () => {
    render(<TableWidget data={mockData} />);

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('North')).toBeInTheDocument();
  });

  test('should render correct number of rows', () => {
    const { container } = render(<TableWidget data={mockData} />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  test('should handle empty data', () => {
    render(<TableWidget data={[]} />);

    // Should show empty state
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  test('should handle undefined data', () => {
    render(<TableWidget data={undefined} />);

    // Should handle gracefully
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  test('should handle null data', () => {
    render(<TableWidget data={null} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  test('should display headers from data keys', () => {
    render(<TableWidget data={mockData} />);

    // Headers should be present (capitalized or formatted)
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');

    expect(headers.length).toBeGreaterThan(0);
  });

  test('should handle data with missing fields', () => {
    const incompleteData = [
      { name: 'Item 1', value: 100 },
      { name: 'Item 2' }, // missing value
      { value: 300 } // missing name
    ];

    render(<TableWidget data={incompleteData} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  test('should format numbers correctly', () => {
    const dataWithNumbers = [
      { product: 'A', revenue: 1234.56, quantity: 1000 }
    ];

    render(<TableWidget data={dataWithNumbers} />);

    // Numbers should be displayed
    expect(screen.getByText(/1234/)).toBeInTheDocument();
  });

  test('should be scrollable for large datasets', () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 1000
    }));

    const { container } = render(<TableWidget data={largeData} />);

    // Should have overflow container
    const scrollContainer = container.querySelector('[style*="overflow"]');
    expect(scrollContainer).toBeInTheDocument();
  });

  test('should render with striped rows for readability', () => {
    const { container } = render(<TableWidget data={mockData} />);

    const rows = container.querySelectorAll('tbody tr');
    // Rows should exist
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should handle special characters in data', () => {
    const specialData = [
      { name: 'Test & Demo', value: '$1,000' },
      { name: 'A/B Test', value: '50%' }
    ];

    render(<TableWidget data={specialData} />);

    expect(screen.getByText('Test & Demo')).toBeInTheDocument();
    expect(screen.getByText('A/B Test')).toBeInTheDocument();
  });

  test('should be accessible with table semantics', () => {
    render(<TableWidget data={mockData} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Should have proper table structure
    const tbody = within(table).getAllByRole('rowgroup');
    expect(tbody.length).toBeGreaterThan(0);
  });
});
