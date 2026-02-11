import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPhotoGenerator } from '../AIPhotoGenerator';
import axios from 'axios';

vi.mock('axios');

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  personaData: { name: 'Sarah Jenkins', role: 'Product Manager' },
  onApply: vi.fn(),
};

describe('AIPhotoGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<AIPhotoGenerator {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal with correct title', () => {
    render(<AIPhotoGenerator {...defaultProps} />);
    expect(screen.getByText('AI Avatar Styler')).toBeInTheDocument();
  });

  it('shows style buttons', () => {
    render(<AIPhotoGenerator {...defaultProps} />);
    expect(screen.getByText('Professional Headshot')).toBeInTheDocument();
    expect(screen.getByText('Creative / Illustration')).toBeInTheDocument();
    expect(screen.getByText('Minimalist')).toBeInTheDocument();
    expect(screen.getByText('Warm & Friendly')).toBeInTheDocument();
    expect(screen.getByText('Tech Professional')).toBeInTheDocument();
  });

  it('selects a style when clicked', () => {
    render(<AIPhotoGenerator {...defaultProps} />);
    const creative = screen.getByText('Creative / Illustration');
    fireEvent.click(creative);
    // The button should have selected styling
    const btn = creative.closest('button');
    expect(btn.style.border).toContain('2px solid');
  });

  it('generates avatar and shows preview', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        text: JSON.stringify({
          gradientStart: '#1e3a5f',
          gradientEnd: '#3b82f6',
          accentColor: '#2563eb',
          emoji: '👩',
          bgPattern: 'circles',
          textColor: '#ffffff',
        }),
      },
    });

    render(<AIPhotoGenerator {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      // After generation, Apply button should appear
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
  });

  it('falls back to preset colors on API error', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    render(<AIPhotoGenerator {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      // Fallback should still render Apply button
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
  });

  it('shows loading state during generation', async () => {
    let resolvePost;
    axios.post.mockReturnValueOnce(new Promise(r => { resolvePost = r; }));

    render(<AIPhotoGenerator {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate'));

    expect(screen.getByText('Generating...')).toBeInTheDocument();

    resolvePost({
      data: {
        text: JSON.stringify({
          gradientStart: '#000',
          gradientEnd: '#fff',
          accentColor: '#ccc',
          emoji: '👤',
          bgPattern: 'none',
          textColor: '#000',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    });
  });

  it('calls onApply with avatar data when Apply is clicked', async () => {
    const avatarData = {
      gradientStart: '#1e3a5f',
      gradientEnd: '#3b82f6',
      accentColor: '#2563eb',
      emoji: '👩',
      bgPattern: 'none',
      textColor: '#ffffff',
    };
    axios.post.mockResolvedValueOnce({ data: { text: JSON.stringify(avatarData) } });

    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<AIPhotoGenerator {...defaultProps} onApply={onApply} onClose={onClose} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(avatarData);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<AIPhotoGenerator {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
