import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPersonaGenerator } from '../AIPersonaGenerator';
import axios from 'axios';

vi.mock('axios');

const validPersonaJSON = JSON.stringify({
  name: 'Test Persona',
  title: 'UX Designer',
  persona_type: 'Idealist',
  sections: [
    { id: 'header_1', type: 'header', title: 'Identity', data: { name: 'Test', role: 'UX' } },
    { id: 'goals_1', type: 'list', title: 'Goals', data: ['Goal 1', 'Goal 2'] },
  ],
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onGenerate: vi.fn(),
};

describe('AIPersonaGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<AIPersonaGenerator {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the generator modal when open', () => {
    render(<AIPersonaGenerator {...defaultProps} />);
    expect(screen.getByText('AI Persona Generator')).toBeInTheDocument();
    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
  });

  it('fills textarea when a preset is clicked', () => {
    render(<AIPersonaGenerator {...defaultProps} />);
    fireEvent.click(screen.getByText('E-commerce Shopper'));

    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    expect(textarea.value).toContain('e-commerce');
  });

  it('disables generate button when description is empty', () => {
    render(<AIPersonaGenerator {...defaultProps} />);
    const genButton = screen.getByText('Generate Persona').closest('button');
    expect(genButton).toBeDisabled();
  });

  it('enables generate button when description has text', () => {
    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    const genButton = screen.getByText('Generate Persona').closest('button');
    expect(genButton).not.toBeDisabled();
  });

  it('shows spinner during generation', async () => {
    let resolvePost;
    axios.post.mockReturnValueOnce(new Promise(r => { resolvePost = r; }));

    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    expect(screen.getByText('Generating Your Persona')).toBeInTheDocument();

    resolvePost({ data: { text: validPersonaJSON } });
    await waitFor(() => {
      expect(screen.queryByText('Generating Your Persona')).not.toBeInTheDocument();
    });
  });

  it('shows preview on successful generation', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: validPersonaJSON } });

    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    await waitFor(() => {
      expect(screen.getByText('Persona generated successfully! Review and create.')).toBeInTheDocument();
      expect(screen.getByText('Test Persona')).toBeInTheDocument();
      expect(screen.getByText('UX Designer')).toBeInTheDocument();
    });
  });

  it('shows human-readable error on malformed JSON', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'not valid json {{{' } });

    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    await waitFor(() => {
      expect(screen.getByText('AI returned an invalid response. Please try again.')).toBeInTheDocument();
    });
  });

  it('calls onGenerate when Create Persona is clicked', async () => {
    const onGenerate = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: validPersonaJSON } });

    render(<AIPersonaGenerator {...defaultProps} onGenerate={onGenerate} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    await waitFor(() => {
      expect(screen.getByText('Create Persona')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Persona'));
    expect(onGenerate).toHaveBeenCalledWith(JSON.parse(validPersonaJSON));
  });

  it('allows regenerating from preview', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: validPersonaJSON } });

    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    await waitFor(() => {
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Regenerate'));
    // Should go back to input step
    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
  });

  it('shows API error on network failure', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: 'Server error' } } });

    render(<AIPersonaGenerator {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Describe the persona/);
    fireEvent.change(textarea, { target: { value: 'A tech user' } });
    fireEvent.click(screen.getByText('Generate Persona'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
