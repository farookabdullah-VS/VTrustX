import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPersonaChat } from '../AIPersonaChat';
import axios from 'axios';

vi.mock('axios');

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  sections: [
    { type: 'header', data: { name: 'Sarah', role: 'PM', description: 'A PM persona' } },
    { type: 'list', title: 'Goals', data: ['Ship on time', 'Improve UX'] },
    { type: 'text', title: 'Challenges', content: 'Tight deadlines.' },
  ],
  personaName: 'Sarah',
  personaRole: 'Product Manager',
  personaType: 'Rational',
};

describe('AIPersonaChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<AIPersonaChat {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the chat panel when open', () => {
    render(<AIPersonaChat {...defaultProps} />);
    expect(screen.getByText('Chat with Sarah')).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything/)).toBeInTheDocument();
  });

  it('shows starter questions', () => {
    render(<AIPersonaChat {...defaultProps} />);
    expect(screen.getByText('Suggested Questions')).toBeInTheDocument();
    expect(screen.getByText('What frustrates you most about your current workflow?')).toBeInTheDocument();
  });

  it('sends a message and shows persona response', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'I get frustrated with long meetings.' } });
    render(<AIPersonaChat {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask Sarah a question...');
    fireEvent.change(input, { target: { value: 'Hello Sarah' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Hello Sarah')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('I get frustrated with long meetings.')).toBeInTheDocument();
    });
  });

  it('sends a starter question on click', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'I really dislike slow tools.' } });
    render(<AIPersonaChat {...defaultProps} />);

    fireEvent.click(screen.getByText('What frustrates you most about your current workflow?'));

    await waitFor(() => {
      expect(screen.getByText('I really dislike slow tools.')).toBeInTheDocument();
    });
  });

  it('shows loading indicator during message', async () => {
    let resolvePost;
    axios.post.mockReturnValueOnce(new Promise(r => { resolvePost = r; }));

    render(<AIPersonaChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask Sarah a question...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Thinking...')).toBeInTheDocument();

    resolvePost({ data: { text: 'Response' } });
    await waitFor(() => {
      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
    });
  });

  it('resets chat on reset button click', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'Hello!' } });
    render(<AIPersonaChat {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask Sarah a question...');
    fireEvent.change(input, { target: { value: 'Hi' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    // Click reset button
    fireEvent.click(screen.getByTitle('Reset chat'));
    expect(screen.queryByText('Hello!')).not.toBeInTheDocument();
    expect(screen.getByText('Suggested Questions')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AIPersonaChat {...defaultProps} onClose={onClose} />);
    // Find the close button (X icon in header)
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find(b => !b.title && b.querySelector('svg'));
    if (closeBtn) fireEvent.click(closeBtn);
    // The component calls onClose
    expect(onClose).toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    render(<AIPersonaChat {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask Sarah a question...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/trouble responding/)).toBeInTheDocument();
    });
  });
});
