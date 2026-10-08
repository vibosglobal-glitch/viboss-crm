'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

// Single shared socket instance
let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      withCredentials: true, // send httpOnly cookies with socket handshake
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socketInstance;
}

/** Disconnect and destroy the shared socket (call on logout) */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * useSocket — connects to Socket.IO and invalidates React Query caches
 * when lead data changes on the server. Debounced to max 1× per 500ms.
 */
export function useSocket() {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['hr-leads'] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
      qc.invalidateQueries({ queryKey: ['hr-closed-leads'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['lead-activities'] });
    };

    const debouncedHandler = () => {
      if (timerRef.current) return; // already scheduled
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        invalidateAll();
      }, 500);
    };

    const handlePageHide = () => {
      // Closing the socket during pagehide improves bfcache restoration eligibility.
      if (socket.connected) {
        socket.disconnect();
      }
    };

    const handlePageShow = () => {
      if (!socket.connected) {
        socket.connect();
      }
    };

    socket.on('lead:changed', debouncedHandler);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      socket.off('lead:changed', debouncedHandler);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [qc]);
}
