import { useState, useCallback } from 'react';
import { Rota } from '../types/rota';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  past: Rota[];
  future: Rota[];
}

export const useUndoRedo = (
  currentRota: Rota | null,
  onStateChange: () => void
) => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: []
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const pushAction = useCallback((newRota: Rota) => {
    setHistory(prev => {
      // Add current state to past
      const newPast = currentRota 
        ? [...prev.past.slice(-MAX_HISTORY_SIZE + 1), currentRota]
        : prev.past;

      return {
        past: newPast,
        future: [] // Clear future when new action is pushed
      };
    });
  }, [currentRota]);

  const undo = useCallback(() => {
    if (!canUndo || !currentRota) return;

    setHistory(prev => {
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        future: [currentRota, ...prev.future]
      };
    });

    onStateChange();
  }, [canUndo, currentRota, onStateChange]);

  const redo = useCallback(() => {
    if (!canRedo || !currentRota) return;

    setHistory(prev => {
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, currentRota],
        future: newFuture
      };
    });

    onStateChange();
  }, [canRedo, currentRota, onStateChange]);

  const clearHistory = useCallback(() => {
    setHistory({
      past: [],
      future: []
    });
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushAction,
    clearHistory,
    historySize: {
      past: history.past.length,
      future: history.future.length
    }
  };
};

export default useUndoRedo;
