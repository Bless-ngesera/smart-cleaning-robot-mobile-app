// app/settings/support.tsx
import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Linking,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';

export default function HelpSupport() {
    const { colors, darkMode } = useThemeContext();

    // Same as Dashboard
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    // Design tokens matching Dashboard
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const openLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open this link');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not open link');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Large Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Help & Support
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            We're here to help
                        </AppText>
                    </View>

                    {/* Frequently Asked Questions */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                            Frequently Asked Questions
                        </AppText>

                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#connect')}>
                            <Ionicons name="bluetooth-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                How do I connect my robot via Bluetooth or Wi-Fi?
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#cleaning')}>
                            <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                Why is my robot not cleaning properly or missing spots?
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#battery')}>
                            <Ionicons name="battery-half-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                How do I improve battery life or fix low battery warnings?
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#map')}>
                            <Ionicons name="map-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                Why is the map not accurate or robot getting stuck?
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Contact Us */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                            Contact Us
                        </AppText>

                        <TouchableOpacity style={styles.row} onPress={() => openLink('mailto:support@smartcleaner.com')}>
                            <Ionicons name="mail-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                Email Support
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

                        <TouchableOpacity style={styles.row} onPress={() => openLink('tel:+256700123456')}>
                            <Ionicons name="call-outline" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                Call Support (+256 700 123 456)
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://wa.me/256700123456')}>
                            <Ionicons name="logo-whatsapp" size={24} color={colors.primary} />
                            <AppText style={[styles.rowText, { color: textPrimary }]}>
                                WhatsApp Support
                            </AppText>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Footer note */}
                    <AppText style={[styles.footerNote, { color: textSecondary }]}>
                        Response time: usually within 1–2 hours during business hours (8 AM – 8 PM EAT)
                    </AppText>

                    {/* App footer */}
                    <AppText style={[styles.footer, { color: textSecondary }]}>
                        Version 1.0.0 • Smart Cleaner Pro © 2026
                    </AppText>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 120,
        paddingBottom: 80,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },

    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    sectionCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    rowDivider: {
        height: 1,
        marginLeft: 40,
    },
    rowText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },

    footerNote: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 24,
        marginBottom: 16,
        lineHeight: 20,
    },
    footer: {
        textAlign: 'center',
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },
});