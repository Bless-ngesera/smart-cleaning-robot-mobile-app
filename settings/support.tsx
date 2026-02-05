// app/(tabs)/settings/support.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../src/components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupport() {
    const { colors } = useThemeContext();

    const openLink = (url) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link'));
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Help & Support" subtitle="Get help and contact us" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => openLink('https://example.com/faq')}
                    >
                        <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>How do I connect my robot?</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => openLink('https://example.com/faq')}
                    >
                        <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Troubleshooting cleaning issues</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Support</Text>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => openLink('mailto:support@smartcleanerpro.com')}
                    >
                        <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Email Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => openLink('tel:+256123456789')}
                    >
                        <Ionicons name="call-outline" size={24} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Call Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => openLink('https://example.com/chat')}
                    >
                        <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Live Chat</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.footer, { color: colors.textSecondary }]}>
                    We're here to help 24/7. Response time usually within 1 hour.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    linkText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 16,
    },
});