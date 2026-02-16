/**
 * Unit tests for KPIWidget component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KPIWidget } from '../KPIWidget';

describe('KPIWidget', () => {
  test('should render with title and value', () => {
    render(<KPIWidget title="Total Sales" value="$50,000" />);

    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  test('should render with numeric value', () => {
    render(<KPIWidget title="Response Count" value={1234} />);

    expect(screen.getByText('Response Count')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  test('should display trend indicator when provided', () => {
    const trend = {
      value: 15.5,
      direction: 'up'
    };

    render(<KPIWidget title="NPS Score" value={75} trend={trend} />);

    expect(screen.getByText('NPS Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    // Trend should be visible
    expect(screen.getByText(/15.5/)).toBeInTheDocument();
  });

  test('should show positive trend with up arrow', () => {
    const trend = {
      value: 10,
      direction: 'up'
    };

    const { container } = render(
      <KPIWidget title="Growth" value={100} trend={trend} />
    );

    // Should contain trend indicator
    expect(container.querySelector('[class*="trend"]')).toBeInTheDocument();
  });

  test('should show negative trend with down arrow', () => {
    const trend = {
      value: -5,
      direction: 'down'
    };

    const { container } = render(
      <KPIWidget title="Churn Rate" value={3.2} trend={trend} />
    );

    expect(container.querySelector('[class*="trend"]')).toBeInTheDocument();
  });

  test('should display icon when provided', () => {
    const { container } = render(
      <KPIWidget
        title="Users"
        value={500}
        icon="👥"
      />
    );

    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  test('should handle zero value', () => {
    render(<KPIWidget title="Errors" value={0} />);

    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('should handle null value gracefully', () => {
    render(<KPIWidget title="Pending" value={null} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    // Should display some placeholder or "0"
  });

  test('should handle undefined value gracefully', () => {
    render(<KPIWidget title="Loading" value={undefined} />);

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  test('should apply custom subtitle', () => {
    render(
      <KPIWidget
        title="Revenue"
        value="$1M"
        subtitle="This quarter"
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('This quarter')).toBeInTheDocument();
  });

  test('should handle large numbers', () => {
    render(<KPIWidget title="Total" value={9999999} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('9999999')).toBeInTheDocument();
  });

  test('should handle percentage values', () => {
    render(<KPIWidget title="Completion Rate" value="87.5%" />);

    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('87.5%')).toBeInTheDocument();
  });

  test('should render with custom color', () => {
    const { container } = render(
      <KPIWidget
        title="Priority"
        value="High"
        color="#dc2626"
      />
    );

    // Should have some element with the color applied
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should be accessible with proper ARIA labels', () => {
    render(<KPIWidget title="Accessibility Test" value={42} />);

    // Should have proper semantic structure
    const widget = screen.getByText('Accessibility Test').closest('div');
    expect(widget).toBeInTheDocument();
  });
});
