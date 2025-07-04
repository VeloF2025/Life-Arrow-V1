import React from 'react';
import { render, screen } from '@testing-library/react';
import HighlightedText from './HighlightedText';

describe('HighlightedText', () => {
  it('renders text without highlighting when no highlight term is provided', () => {
    render(<HighlightedText text="Sample text" highlight="" />);
    expect(screen.getByText('Sample text')).toBeInTheDocument();
    expect(screen.queryByText(/Sample/)).not.toHaveClass('bg-yellow-200');
  });

  it('renders text without highlighting when highlight term does not match', () => {
    render(<HighlightedText text="Sample text" highlight="nomatch" />);
    expect(screen.getByText('Sample text')).toBeInTheDocument();
    expect(screen.queryByText(/Sample/)).not.toHaveClass('bg-yellow-200');
  });

  it('highlights single word matches', () => {
    const { container } = render(<HighlightedText text="Sample text" highlight="sample" />);
    
    // Check that the highlighted span exists with the correct class
    const highlightedSpan = container.querySelector('.bg-yellow-200');
    expect(highlightedSpan).toBeInTheDocument();
    expect(highlightedSpan).toHaveTextContent('Sample');
  });

  it('highlights multiple occurrences of the same word', () => {
    const { container } = render(
      <HighlightedText text="Sample text with another sample" highlight="sample" />
    );
    
    // Check that two highlighted spans exist
    const highlightedSpans = container.querySelectorAll('.bg-yellow-200');
    expect(highlightedSpans.length).toBe(2);
    expect(highlightedSpans[0]).toHaveTextContent('Sample');
    expect(highlightedSpans[1]).toHaveTextContent('sample');
  });

  it('highlights multiple different words from search term', () => {
    const { container } = render(
      <HighlightedText text="John Smith from Acme Corp" highlight="john corp" />
    );
    
    // Check that two highlighted spans exist for different words
    const highlightedSpans = container.querySelectorAll('.bg-yellow-200');
    expect(highlightedSpans.length).toBe(2);
    expect(highlightedSpans[0]).toHaveTextContent('John');
    expect(highlightedSpans[1]).toHaveTextContent('Corp');
  });

  it('applies custom className to the wrapper span', () => {
    const { container } = render(
      <HighlightedText 
        text="Sample text" 
        highlight="sample" 
        className="custom-class" 
      />
    );
    
    // Check that the wrapper span has the custom class
    const wrapperSpan = container.firstChild;
    expect(wrapperSpan).toHaveClass('custom-class');
  });
});
