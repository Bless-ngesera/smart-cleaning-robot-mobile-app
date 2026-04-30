// src/context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastContextValue {
    toast: ToastMessage | null;
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    hideToast: () => void;
}

export const ToastContext = createContext<ToastContextValue>({
    toast: null,
    showToast: () => {},
    hideToast: () => {},
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideToast = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setToast(null);
    }, []);

    const showToast = useCallback((
        message: string,
        type: ToastType = 'info',
        duration: number = 3500
    ) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const id = `${Date.now()}-${Math.random()}`;
        setToast({ id, message, type, duration });

        timerRef.current = setTimeout(() => {
            setToast(null);
            timerRef.current = null;
        }, duration);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toast, showToast, hideToast }}>
            {children}
        </ToastContext.Provider>
    );
}
