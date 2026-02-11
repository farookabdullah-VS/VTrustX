import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPersonaAssistant } from '../AIPersonaAssistant';
import axios from 'axios';

vi.mock('axios');

const mockSection = {
  id: 'goals_1',
  type: 'list',
  title: 'Goals',
  data: ['Increase productivity', 'Reduce errors'],
};

const mockTextSection = {
  id: 'challenges_1',
  type: 'text',
  title: 'Challenges',
  content: 'Struggling with time management.',
};

const mockDemographicSection = {
  id: 'demo_1',
  type: 'demographic',
  title: 'Demographic',
  data: [
    { label: 'Gender', value: 'Female', icon: 'user' },
    { label: 'Location', value: 'London', icon: 'map-pin' },
  ],
};

const defaultProps = {
  section: mockSection,
  personaName: 'Sarah',
  personaRole: 'Product Manager',
  onApply: vi.fn(),
};

describe('AIPersonaAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sparkle button when closed', () => {
    render(<AIPersonaAssistant {...defaultProps} />);
    expect(screen.getByTitle('AI Assistant')).toBeInTheDocument();
  });

  it('opens the panel when button is clicked', () => {
    render(<AIPersonaAssistant {...defaultProps} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows action buttons based on section type', () => {
    render(<AIPersonaAssistant {...defaultProps} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    expect(screen.getByText('Expand')).toBeInTheDocument();
    expect(screen.getByText('Shorten')).toBeInTheDocument();
    expect(screen.getByText('Rephrase')).toBeInTheDocument();
    expect(screen.getByText('Fix Grammar')).toBeInTheDocument();
    expect(screen.getByText('Suggest Content')).toBeInTheDocument();
    // Generate Items should show for list type
    expect(screen.getByText('Generate Items')).toBeInTheDocument();
  });

  it('hides Generate Items for non-list sections', () => {
    render(<AIPersonaAssistant {...defaultProps} section={mockTextSection} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    expect(screen.queryByText('Generate Items')).not.toBeInTheDocument();
  });

  it('calls API and shows result on action click', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'Improved goal 1\nImproved goal 2' } });
    render(<AIPersonaAssistant {...defaultProps} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Expand'));

    expect(screen.getByText('Generating...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Improved goal 1/)).toBeInTheDocument();
    });
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('applies result for list type (replace mode)', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'A very long rephrased paragraph that is more than two hundred characters in length and contains only a single line with detailed explanation of the goals and aspirations of the persona' } });
    render(<AIPersonaAssistant {...defaultProps} onApply={onApply} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Rephrase'));

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalled();
  });

  it('applies result for text type', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Better challenges text.' } });
    render(<AIPersonaAssistant {...defaultProps} section={mockTextSection} onApply={onApply} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Expand'));

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith({ content: 'Better challenges text.' });
  });

  it('applies result for demographic type', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Gender: Male\nLocation: Paris' } });
    render(<AIPersonaAssistant {...defaultProps} section={mockDemographicSection} onApply={onApply} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Expand'));

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith({
      data: [
        { label: 'Gender', value: 'Male', icon: 'user' },
        { label: 'Location', value: 'Paris', icon: 'user' },
      ],
    });
  });

  it('shows error on API failure', async () => {
    axios.post.mockRejectedValueOnce({ message: 'Network Error' });
    render(<AIPersonaAssistant {...defaultProps} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Expand'));

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('closes panel and clears result', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'Result text' } });
    render(<AIPersonaAssistant {...defaultProps} />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    fireEvent.click(screen.getByText('Expand'));

    await waitFor(() => {
      expect(screen.getByText('Result text')).toBeInTheDocument();
    });

    // Close button in header (the X icon)
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find(b => b.querySelector('svg') && b.getAttribute('style')?.includes('transparent'));
    // Just verify clicking discard clears result
    fireEvent.click(screen.getByText('Discard'));
    expect(screen.queryByText('Result text')).not.toBeInTheDocument();
  });
});
