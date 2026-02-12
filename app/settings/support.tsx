// app/settings/support.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/src/context/ThemeContext';
import Header from '../../src/components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupport() {
    const { colors } = useThemeContext();

    const openLink = async (url) => {
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header title="Help & Support" subtitle="We're here to help" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Frequently Asked Questions */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#connect')}>
                        <Ionicons name="bluetooth-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>How do I connect my robot via Bluetooth or Wi-Fi?</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#cleaning')}>
                        <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Why is my robot not cleaning properly or missing spots?</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#battery')}>
                        <Ionicons name="battery-half-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>How do I improve battery life or fix low battery warnings?</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/faq#map')}>
                        <Ionicons name="map-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Why is the map not accurate or robot getting stuck?</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* === C++ INTEGRATION POINT: Add robot-specific troubleshooting ===
              If you want to include direct robot diagnostics or firmware-related FAQs:
              - Add rows like "How to reset robot firmware" or "Run robot self-diagnostic"
              - On press: either open link or trigger C++ command via bridge
              Example:
              <TouchableOpacity style={styles.row} onPress={() => RobotBridge.runDiagnostic()}>
                <Ionicons name="cog-outline" size={24} color={colors.primary} />
                <AppText style={styles.rowText}>Run robot self-diagnostic</AppText>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
          */}
                </View>

                {/* Contact Us */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('mailto:support@smartcleaner.com')}>
                        <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Email Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('tel:+256700123456')}>
                        <Ionicons name="call-outline" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>Call Support (+256 700 123 456)</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => openLink('https://wa.me/256700123456')}>
                        <Ionicons name="logo-whatsapp" size={24} color={colors.primary} />
                        <Text style={[styles.rowText, { color: colors.text }]}>WhatsApp Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* === C++ INTEGRATION POINT: Add robot-specific contact ===
              If you want a button to send robot logs/diagnostics directly to support:
              - On press: collect logs via C++ bridge → attach to email or send via API
              Example:
              <TouchableOpacity style={styles.row} onPress={() => sendRobotLogsToSupport()}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <AppText style={styles.rowText}>Send robot diagnostic logs to support</AppText>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
          */}
                </View>

                <Text style={[styles.footer, { color: colors.textSecondary }]}>
                    Response time: usually within 1–2 hours during business hours (8 AM – 8 PM EAT)
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    rowText: {
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