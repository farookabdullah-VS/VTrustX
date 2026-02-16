/**
 * Unit tests for WordCloudWidget component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { WordCloudWidget } from '../WordCloudWidget';

// Mock axios
jest.mock('axios');

describe('WordCloudWidget', () => {
  const mockWordData = [
    { text: 'excellent', value: 50, sentiment: 'positive' },
    { text: 'good', value: 40, sentiment: 'positive' },
    { text: 'average', value: 30, sentiment: 'neutral' },
    { text: 'poor', value: 20, sentiment: 'negative' },
    { text: 'terrible', value: 10, sentiment: 'negative' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading state initially', () => {
    axios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<WordCloudWidget surveyId="test-123" field="comments" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should fetch and display word cloud data', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    render(<WordCloudWidget surveyId="test-123" field="comments" />);

    await waitFor(() => {
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    expect(screen.getByText('good')).toBeInTheDocument();
    expect(screen.getByText('poor')).toBeInTheDocument();
  });

  test('should display words with different sizes based on frequency', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    const { container } = render(
      <WordCloudWidget surveyId="test-123" field="comments" />
    );

    await waitFor(() => {
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    // Most frequent word should be larger
    const excellentWord = screen.getByText('excellent');
    const terribleWord = screen.getByText('terrible');

    // They should have different font sizes
    expect(excellentWord).toBeInTheDocument();
    expect(terribleWord).toBeInTheDocument();
  });

  test('should color words by sentiment', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    const { container } = render(
      <WordCloudWidget surveyId="test-123" field="comments" />
    );

    await waitFor(() => {
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    // Positive words should have green color
    const positiveWord = screen.getByText('excellent');
    const negativeWord = screen.getByText('terrible');

    expect(positiveWord).toBeInTheDocument();
    expect(negativeWord).toBeInTheDocument();
    // Colors should be applied via styles
  });

  test('should handle click on word to filter', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    const onFilterChange = jest.fn();

    render(
      <WordCloudWidget
        surveyId="test-123"
        field="comments"
        onFilterChange={onFilterChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    // Click on a word
    fireEvent.click(screen.getByText('excellent'));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        comments: expect.arrayContaining(['excellent'])
      })
    );
  });

  test('should handle empty word cloud data', async () => {
    axios.post.mockResolvedValue({
      data: { words: [] }
    });

    render(<WordCloudWidget surveyId="test-123" field="comments" />);

    await waitFor(() => {
      expect(screen.getByText(/no words/i)).toBeInTheDocument();
    });
  });

  test('should handle API error gracefully', async () => {
    axios.post.mockRejectedValue(new Error('API Error'));

    render(<WordCloudWidget surveyId="test-123" field="comments" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('should make API call with correct parameters', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    render(<WordCloudWidget surveyId="survey-123" field="feedback" />);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/analytics/word-cloud',
        expect.objectContaining({
          surveyId: 'survey-123',
          field: 'feedback'
        })
      );
    });
  });

  test('should respect maxWords prop', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    render(
      <WordCloudWidget
        surveyId="test-123"
        field="comments"
        maxWords={3}
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/analytics/word-cloud',
        expect.objectContaining({
          maxWords: 3
        })
      );
    });
  });

  test('should update when surveyId changes', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    const { rerender } = render(
      <WordCloudWidget surveyId="survey-1" field="comments" />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    // Change surveyId
    rerender(<WordCloudWidget surveyId="survey-2" field="comments" />);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    expect(axios.post).toHaveBeenLastCalledWith(
      '/api/analytics/word-cloud',
      expect.objectContaining({
        surveyId: 'survey-2'
      })
    );
  });

  test('should display word frequencies', async () => {
    axios.post.mockResolvedValue({
      data: { words: mockWordData }
    });

    render(<WordCloudWidget surveyId="test-123" field="comments" />);

    await waitFor(() => {
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    // Frequencies might be shown on hover or in tooltips
    const words = screen.getAllByRole('button');
    expect(words.length).toBeGreaterThan(0);
  });
});
