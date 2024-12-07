import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsProps {
  paintMode: boolean;
  onPaintModeToggle: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearSelection?: () => void;
}

export const useKeyboardShortcuts = ({
  paintMode,
  onPaintModeToggle,
  onUndo,
  onRedo,
  onClearSelection
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if the target is an input element
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Paint Mode (Ctrl + B)
    if (event.ctrlKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      onPaintModeToggle();
    }

    // Undo (Ctrl + Z)
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      onUndo?.();
    }

    // Redo (Ctrl + Shift + Z)
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      onRedo?.();
    }

    // Clear Selection (Escape)
    if (event.key === 'Escape') {
      event.preventDefault();
      if (paintMode) {
        onPaintModeToggle();
      }
      onClearSelection?.();
    }
  }, [paintMode, onPaintModeToggle, onUndo, onRedo, onClearSelection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: {
      'Ctrl + B': 'Toggle Paint Mode',
      'Ctrl + Z': 'Undo',
      'Ctrl + Shift + Z': 'Redo',
      'Escape': 'Clear Selection/Exit Paint Mode'
    }
  };
};

export default useKeyboardShortcuts;
