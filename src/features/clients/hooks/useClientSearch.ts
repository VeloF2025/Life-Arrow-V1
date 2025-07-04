import { useState, useRef, useEffect } from 'react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

/**
 * Custom hook for managing client search functionality
 * Provides debounced search term state and keyboard shortcuts for search
 */
export function useClientSearch() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search term to avoid excessive filtering/API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Focus search input when '/' key is pressed
  useKeyboardShortcut('/', (e) => {
    e.preventDefault();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  });

  // Clear search when 'Escape' key is pressed
  useKeyboardShortcut('Escape', () => {
    if (document.activeElement === searchInputRef.current) {
      setSearchTerm('');
      searchInputRef.current?.blur();
    }
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Clear search term
  const clearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    searchInputRef,
    handleSearchChange,
    clearSearch
  };
}

export default useClientSearch;
