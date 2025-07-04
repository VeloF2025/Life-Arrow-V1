import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

/**
 * Hook to register keyboard shortcuts
 * @param key The key or key combination to listen for (e.g., '/', 'Escape', 'ctrl+s')
 * @param callback The function to call when the key is pressed
 * @param deps Optional dependency array for the effect
 */
export function useKeyboardShortcut(
  key: string, 
  callback: KeyHandler, 
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contentEditable element
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        // For the '/' key, we want to allow it to focus the search input
        // So we only skip if it's not the '/' key
        if (e.key !== '/') {
          return;
        }
      }
      
      // Handle key combinations (e.g., 'ctrl+s')
      if (key.includes('+')) {
        const [modifier, targetKey] = key.split('+');
        const modifierPressed = 
          (modifier === 'ctrl' && e.ctrlKey) || 
          (modifier === 'alt' && e.altKey) || 
          (modifier === 'shift' && e.shiftKey) || 
          (modifier === 'meta' && e.metaKey);
        
        if (modifierPressed && e.key.toLowerCase() === targetKey.toLowerCase()) {
          callback(e);
        }
      } 
      // Handle single keys
      else if (e.key === key) {
        callback(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [key, callback, ...deps]);
}

export default useKeyboardShortcut;
