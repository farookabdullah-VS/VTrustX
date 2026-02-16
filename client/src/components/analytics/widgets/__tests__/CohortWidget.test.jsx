/**
 * Unit tests for CohortWidget component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { CohortWidget } from '../CohortWidget';

jest.mock('axios');

describe('CohortWidget', () => {
  const mockCohortData = [
    {
      cohort: '2024-01',
      totalResponses: 150,
      metricValue: 72.5,
      trend: { change: 5.2, percentChange: 7.5, direction: 'up' }
    },
    {
      cohort: '2024-02',
      totalResponses: 180,
      metricValue: 75.0,
      trend: { change: 2.5, percentChange: 3.4, direction: 'up' }
    },
    {
      cohort: '2024-03',
      totalResponses: 200,
      metricValue: 78.2,
      trend: { change: 3.2, percentChange: 4.3, direction: 'up' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading state', () => {
    axios.post.mockImplementation(() => new Promise(() => {}));

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should fetch and display cohort data', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2024-01')).toBeInTheDocument();
    });

    expect(screen.getByText('2024-02')).toBeInTheDocument();
    expect(screen.getByText('2024-03')).toBeInTheDocument();
  });

  test('should display metric values', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/72\.5/)).toBeInTheDocument();
    });

    expect(screen.getByText(/75\.0/)).toBeInTheDocument();
    expect(screen.getByText(/78\.2/)).toBeInTheDocument();
  });

  test('should display trend indicators', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    const { container } = render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/7\.5%/)).toBeInTheDocument();
    });

    // Trend arrows should be present
    expect(screen.getByText(/3\.4%/)).toBeInTheDocument();
    expect(screen.getByText(/4\.3%/)).toBeInTheDocument();
  });

  test('should make API call with correct parameters', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    render(
      <CohortWidget
        surveyId="survey-456"
        metric="csat"
        cohortBy="week"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/analytics/cohorts',
        expect.objectContaining({
          surveyId: 'survey-456',
          metric: 'csat',
          cohortBy: 'week'
        })
      );
    });
  });

  test('should handle empty cohort data', async () => {
    axios.post.mockResolvedValue({ data: [] });

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no cohort data/i)).toBeInTheDocument();
    });
  });

  test('should handle API error', async () => {
    axios.post.mockRejectedValue(new Error('API Error'));

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('should support different cohort groupings', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    const { rerender } = render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="day"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/cohorts',
        expect.objectContaining({ cohortBy: 'day' })
      );
    });

    rerender(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="quarter"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/cohorts',
        expect.objectContaining({ cohortBy: 'quarter' })
      );
    });
  });

  test('should display total responses', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    expect(screen.getByText(/180/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  test('should render chart visualization', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    const { container } = render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      // Recharts creates an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  test('should handle metric changes', async () => {
    axios.post.mockResolvedValue({ data: mockCohortData });

    const { rerender } = render(
      <CohortWidget
        surveyId="test-123"
        metric="nps"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    rerender(
      <CohortWidget
        surveyId="test-123"
        metric="csat"
        cohortBy="month"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/cohorts',
        expect.objectContaining({ metric: 'csat' })
      );
    });
  });
});
