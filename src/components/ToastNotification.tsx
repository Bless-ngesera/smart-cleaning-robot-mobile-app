// src/components/ToastNotification.tsx
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { useToast, ToastType } from '../context/ToastContext';

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
    warning: 'warning',
};

const SCHEME: Record<ToastType, { bg: string; border: string }> = {
    success: { bg: '#059669', border: '#10B981' },
    error:   { bg: '#DC2626', border: '#EF4444' },
    info:    { bg: '#2563EB', border: '#3B82F6' },
    warning: { bg: '#D97706', border: '#F59E0B' },
};

export default function ToastNotification() {
    const { toast, hideToast } = useToast();
    const insets = useSafeAreaInsets();

    const translateY = useRef(new Animated.Value(-120)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Track last rendered ID so we re-animate on every new toast
    const lastId = useRef<string | null>(null);

    useEffect(() => {
        if (toast && toast.id !== lastId.current) {
            lastId.current = toast.id;

            // Reset first so back-to-back toasts also animate
            translateY.setValue(-120);
            opacity.setValue(0);

            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!toast) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -120,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                lastId.current = null;
            });
        }
    }, [toast?.id]);

    // Always render (null state just means the toast is invisible/offscreen)
    const scheme = toast ? SCHEME[toast.type] : SCHEME.info;
    const icon = toast ? ICONS[toast.type] : ICONS.info;

    return (
        <Animated.View
            pointerEvents={toast ? 'auto' : 'none'}
            style={[
                styles.container,
                {
                    top: insets.top + 10,
                    backgroundColor: scheme.bg,
                    borderColor: scheme.border,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons name={icon} size={22} color="#ffffff" />
                <AppText style={styles.message} numberOfLines={3}>
                    {toast?.message ?? ''}
                </AppText>
                <TouchableOpacity
                    onPress={hideToast}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 14,
        borderWidth: 1,
        zIndex: 9999,
        elevation: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    message: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: '500',
        lineHeight: 20,
        color: '#ffffff',
    },
});
