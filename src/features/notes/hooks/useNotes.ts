'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useNotes() {
    return useQuery({
        queryKey: ['notes'],
        queryFn: () => api.notes.list(),
        staleTime: 30_000,
    });
}

export function useCreateNote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (content: string) => api.notes.create(content),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
    });
}

export function useUpdateNote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) => api.notes.update(id, content),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
    });
}

export function useDeleteNote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.notes.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
    });
}
