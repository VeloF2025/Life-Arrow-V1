import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: string;
  className?: string;
}

/**
 * Component that highlights occurrences of a search term within text
 * Used to visually emphasize matched search terms in client data
 */
const HighlightedText: React.FC<HighlightedTextProps> = React.memo(({ text, highlight, className = '' }) => {
  if (!highlight.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  // Split the search term into individual words for multi-word highlighting
  const searchTerms = highlight.toLowerCase().split(' ').filter(term => term.length > 0);
  
  // If no valid search terms, just return the original text
  if (searchTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  // Create a regex pattern that matches any of the search terms
  const regex = new RegExp(`(${searchTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  
  // Split the text by the regex pattern
  const parts = text.split(regex);
  
  // Use useMemo to memoize the rendered parts to avoid unnecessary recalculations
  const renderedContent = useMemo(() => {
    return (
      <span className={className}>
        {parts.map((part, i) => {
          // Check if this part matches any of the search terms (case insensitive)
          const isMatch = searchTerms.some(term => 
            part.toLowerCase() === term.toLowerCase()
          );
          
          return isMatch ? (
            <span key={i} className="bg-yellow-200 font-medium">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  }, [parts, searchTerms, className]);
  
  return renderedContent;
});

// Use React.memo to prevent unnecessary re-renders when props haven't changed
export default HighlightedText;
