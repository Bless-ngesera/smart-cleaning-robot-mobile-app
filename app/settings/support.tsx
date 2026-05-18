// app/settings/support.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Linking,
    Alert,
    useWindowDimensions,
    StatusBar,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppNavigation } from '@/hooks/useAppNavigation';

import AppText from '../../src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';

// Toast Message Interface
interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

// FAQ Item Type
interface FAQItem {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    question: string;
    answer: string;
}

// Support Contact Type
interface SupportContact {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    action: () => Promise<void>;
    color: string;
}

const FAQ_ITEMS: FAQItem[] = [
{
        id: '1',
        icon: 'cloud-outline',
        question: 'How do I connect my robot to the app?',
        answer: '1. Go to Settings → Connection\n2. Tap "Add New Robot"\n3. Enter your robot\'s Serial Number (found on robot label or LCD screen)\n4. The robot will automatically register with our cloud service\n5. Once registered, tap "Connect" to start controlling your robot\n\nNote: The robot must be powered on and connected to Wi-Fi for cloud connection to work.',
    },
    {
        id: '2',
        icon: 'wifi-outline',
        question: 'What is a Serial Number and where do I find it?',
        answer: 'The Serial Number is a unique identifier for your robot. You can find it:\n\n• On the sticker underneath the robot\n• On the robot\'s LCD screen when powered on\n• In the ESP32 Serial Monitor (look for "Robot ID: XXXXX")\n• On the QR code label that came with your robot\n\nThe Serial Number format is alphanumeric (e.g., ROBOT_001, SCP_ABC123).',
    },
    {
        id: '3',
        icon: 'server-outline',
        question: 'How does the cloud connection work?',
        answer: 'Our robot uses Supabase cloud technology for secure, real-time communication:\n\n• No port forwarding or static IP needed\n• Robot connects outbound to Supabase\n• Mobile app connects to same Supabase instance\n• All communication is encrypted with TLS 1.3\n• Works from anywhere with internet access\n\nThis is the same technology used by professional IoT devices.',
    },
    {
        id: '4',
        icon: 'reload-outline',
        question: 'The robot shows "Offline" - How do I fix this?',
        answer: 'If your robot appears offline:\n\n1. Check that the robot is powered on\n2. Verify Wi-Fi connection on the robot\n3. Go to Settings → Connection and ensure the robot is connected\n4. Try disconnecting and reconnecting\n5. Check if the robot\'s serial number is correctly entered\n6. Pull down to refresh the robot list\n\nIf issues persist, restart the robot and try again.',
    },
    {
        id: '6',
        icon: 'alert-circle-outline',
        question: 'What do the error messages mean?',
        answer: 'Common messages:\n\n• "Connection failed" → Check serial number and robot power\n• "Robot not found" → Verify robot is registered\n• "Command failed" → Robot may be offline\n• "Invalid serial number" → Check the format\n\nAlways ensure your robot has a stable Wi-Fi connection.',
    },
    // {
    //     id: '2',
    //     icon: 'sparkles-outline',
    //     question: 'Why is my robot not cleaning properly or missing spots?',
    //     answer: 'Common causes:\n• Low battery - charge the robot fully\n• Dirty sensors - clean the sensors with a soft cloth\n• Obstacles blocking the path - clear the area\n• Update needed - check for firmware updates\n\nIf the issue persists, contact support.',
    // },
    // {
    //     id: '3',
    //     icon: 'battery-half-outline',
    //     question: 'How do I improve battery life?',
    //     answer: '• Keep the robot charged between 20-80%\n• Clean the charging contacts regularly\n• Reduce suction power for lighter cleaning\n• Schedule cleaning during off-peak hours\n• Avoid exposing the robot to extreme temperatures',
    // },
    // {
    //     id: '4',
    //     icon: 'map-outline',
    //     question: 'Why is the map not accurate?',
    //     answer: '• Ensure the robot has completed at least 2-3 cleaning cycles\n• Check that sensors are clean\n• Make sure there\'s adequate lighting\n• Reset the map in Settings → Robot Management\n• Update to the latest firmware',
    // },
    // {
    //     id: '5',
    //     icon: 'sync-outline',
    //     question: 'How often should I update the firmware?',
    //     answer: 'Firmware updates are released monthly. You\'ll receive a notification when an update is available. We recommend updating within 7 days to ensure optimal performance and security.',
    // },
    // {
    //     id: '6',
    //     icon: 'warning-outline',
    //     question: 'What do the error codes mean?',
    //     answer: '• E01: Low battery - Return to charger\n• E02: Sensor error - Clean sensors\n• E03: Wheel stuck - Check for debris\n• E04: Cliff sensor - Move away from stairs\n• E05: Filter clogged - Clean the filter\n\nContact support for other error codes.',
    // },
];

export default function HelpSupport() {
    const { back } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastAnimations = useRef<{ [key: string]: Animated.Value }>({});

    // Design tokens
    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const successColor = '#10B981';
    const errorColor = '#EF4444';
    const warningColor = '#F59E0B';
    const infoColor = '#3B82F6';

    // Show toast at TOP
    const showToast = useCallback((text: string, type: ToastMessage['type']) => {
        const id = Date.now().toString();
        const fadeAnim = new Animated.Value(0);
        const slideAnim = new Animated.Value(-100);
        
        toastAnimations.current[id] = fadeAnim;
        
        setToasts(prev => [...prev, { id, text, type }]);
        
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
        
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                delete toastAnimations.current[id];
            });
        }, 5000);
    }, []);

    // Toggle FAQ expansion
    const toggleFAQ = useCallback((id: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedFAQ(expandedFAQ === id ? null : id);
    }, [expandedFAQ]);

    // Open link with error handling
    const openLink = useCallback(async (url: string, type: 'email' | 'tel' | 'web' | 'whatsapp') => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
                showToast(`Opening ${type === 'email' ? 'email' : type === 'tel' ? 'phone' : 'link'}...`, 'info');
            } else {
                showToast(`Cannot open ${type === 'email' ? 'email' : type === 'tel' ? 'phone number' : 'link'}`, 'error');
            }
        } catch (err) {
            console.error('Link error:', err);
            showToast('Failed to open link. Please try again.', 'error');
        }
    }, [showToast]);

    // Support contacts
    const supportContacts: SupportContact[] = [
        {
            id: 'email',
            icon: 'mail-outline',
            title: 'Email Support',
            subtitle: 'support@smartcleaner.com',
            action: () => openLink('mailto:support@smartcleaner.com?subject=Smart%20Cleaner%20Pro%20Support', 'email'),
            color: infoColor,
        },
        {
            id: 'phone',
            icon: 'call-outline',
            title: 'Call Support',
            subtitle: '+256 700 123 456',
            action: () => openLink('tel:+256700123456', 'tel'),
            color: successColor,
        },
        {
            id: 'whatsapp',
            icon: 'logo-whatsapp',
            title: 'WhatsApp Support',
            subtitle: 'Message us on WhatsApp',
            action: () => openLink('https://wa.me/message/R2425YN4BWPPM1', 'whatsapp'),
            color: '#25D366',
        },
        {
            id: 'website',
            icon: 'globe-outline',
            title: 'Visit Website',
            subtitle: 'www.smartcleaner.com',
            action: () => openLink('https://www.smartcleaner.com', 'web'),
            color: warningColor,
        },
    ];

    // Render toast messages
    const renderToasts = () => {
        const statusBarHeight = StatusBar.currentHeight || (Platform.OS === 'ios' ? 47 : 0);
        
        return toasts.map((toast, index) => {
            const toastColor = toast.type === 'success' ? successColor : toast.type === 'error' ? errorColor : toast.type === 'warning' ? warningColor : infoColor;
            const fadeAnim = toastAnimations.current[toast.id] || new Animated.Value(1);
            
            return (
                <Animated.View
                    key={toast.id}
                    style={[
                        styles.toast,
                        {
                            backgroundColor: toastColor,
                            top: statusBarHeight + 10 + (index * 70),
                            left: 16,
                            right: 16,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : toast.type === 'warning' ? 'warning' : 'information-circle'}
                        size={22}
                        color="#fff"
                    />
                    <AppText style={styles.toastText}>{toast.text}</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            const anim = toastAnimations.current[toast.id];
                            if (anim) {
                                Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    delete toastAnimations.current[toast.id];
                                });
                            }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
            
            {renderToasts()}

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>
                    {/* Back Navigation */}
                    <TouchableOpacity style={styles.backButton} onPress={() => back()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>
                            Help & Support
                        </AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>
                            We're here to help you 24/7
                        </AppText>
                    </View>

                    {/* Quick Actions Row */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: `${infoColor}15`, borderColor: `${infoColor}30` }]}
                            onPress={() => openLink('mailto:support@smartcleaner.com', 'email')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="mail-outline" size={28} color={infoColor} />
                            <AppText style={[styles.quickActionText, { color: textPrimary }]}>Email</AppText>
                            <AppText style={[styles.quickActionSubtext, { color: textSecondary }]}>24h response</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: `${successColor}15`, borderColor: `${successColor}30` }]}
                            onPress={() => openLink('tel:+256700123456', 'tel')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call-outline" size={28} color={successColor} />
                            <AppText style={[styles.quickActionText, { color: textPrimary }]}>Call</AppText>
                            <AppText style={[styles.quickActionSubtext, { color: textSecondary }]}>8AM-8PM</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: `#25D36615`, borderColor: `#25D36630` }]}
                            onPress={() => openLink('https://wa.me/256700123456', 'whatsapp')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                            <AppText style={[styles.quickActionText, { color: textPrimary }]}>WhatsApp</AppText>
                            <AppText style={[styles.quickActionSubtext, { color: textSecondary }]}>Chat now</AppText>
                        </TouchableOpacity>
                    </View>

                    {/* Frequently Asked Questions */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Frequently Asked Questions
                            </AppText>
                        </View>

                        {FAQ_ITEMS.map((item, index) => (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={styles.faqRow}
                                    onPress={() => toggleFAQ(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.faqIcon, { backgroundColor: `${colors.primary}15` }]}>
                                        <Ionicons name={item.icon} size={22} color={colors.primary} />
                                    </View>
                                    <View style={styles.faqContent}>
                                        <AppText style={[styles.faqQuestion, { color: textPrimary }]}>
                                            {item.question}
                                        </AppText>
                                        {expandedFAQ === item.id && (
                                            <Animated.View style={styles.faqAnswerContainer}>
                                                <AppText style={[styles.faqAnswer, { color: textSecondary }]}>
                                                    {item.answer}
                                                </AppText>
                                            </Animated.View>
                                        )}
                                    </View>
                                    <Ionicons
                                        name={expandedFAQ === item.id ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={textSecondary}
                                    />
                                </TouchableOpacity>
                                {index < FAQ_ITEMS.length - 1 && (
                                    <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Contact Support Card */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people-outline" size={22} color={colors.primary} />
                            <AppText style={[styles.sectionTitle, { color: textPrimary }]}>
                                Contact Support Team
                            </AppText>
                        </View>

                        {supportContacts.map((contact, index) => (
                            <View key={contact.id}>
                                <TouchableOpacity
                                    style={styles.contactRow}
                                    onPress={contact.action}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.contactIcon, { backgroundColor: `${contact.color}15` }]}>
                                        <Ionicons name={contact.icon} size={24} color={contact.color} />
                                    </View>
                                    <View style={styles.contactContent}>
                                        <AppText style={[styles.contactTitle, { color: textPrimary }]}>
                                            {contact.title}
                                        </AppText>
                                        <AppText style={[styles.contactSubtitle, { color: textSecondary }]}>
                                            {contact.subtitle}
                                        </AppText>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                                </TouchableOpacity>
                                {index < supportContacts.length - 1 && (
                                    <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Business Hours Card */}
                    <View style={[styles.infoCard, { backgroundColor: `${infoColor}12`, borderColor: `${infoColor}30` }]}>
                        <Ionicons name="time-outline" size={22} color={infoColor} />
                        <View style={styles.infoContent}>
                            <AppText style={[styles.infoTitle, { color: textPrimary }]}>Business Hours</AppText>
                            <AppText style={[styles.infoText, { color: textSecondary }]}>
                                Monday - Friday: 8:00 AM - 8:00 PM EAT
                            </AppText>
                            <AppText style={[styles.infoText, { color: textSecondary }]}>
                                Saturday: 9:00 AM - 5:00 PM EAT
                            </AppText>
                            <AppText style={[styles.infoText, { color: textSecondary }]}>
                                Sunday: Closed (Emergency support available)
                            </AppText>
                        </View>
                    </View>

                    {/* Response Time Note */}
                    <View style={[styles.noteCard, { backgroundColor: `${warningColor}12`, borderColor: `${warningColor}30` }]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={warningColor} />
                        <AppText style={[styles.noteText, { color: textSecondary }]}>
                            Response time: Usually within 1-2 hours during business hours. For urgent issues, please call our support line.
                        </AppText>
                    </View>

                    {/* Emergency Support */}
                    <View style={[styles.emergencyCard, { backgroundColor: `${errorColor}12`, borderColor: `${errorColor}30` }]}>
                        <Ionicons name="alert-circle-outline" size={22} color={errorColor} />
                        <View style={styles.emergencyContent}>
                            <AppText style={[styles.emergencyTitle, { color: errorColor }]}>Emergency Support</AppText>
                            <AppText style={[styles.emergencyText, { color: textSecondary }]}>
                                For robot malfunctions, accidents, or safety concerns:
                            </AppText>
                            <TouchableOpacity
                                style={[styles.emergencyBtn, { backgroundColor: errorColor }]}
                                onPress={() => openLink('tel:+256700123456', 'tel')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={18} color="#fff" />
                                <AppText style={styles.emergencyBtnText}>Call Emergency Line</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
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
        paddingTop: 16,
        paddingBottom: 100,
    },
    scrollContentLarge: {
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    wrapper: { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 35,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    // Quick Actions
    quickActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    quickActionSubtext: {
        fontSize: 10,
        opacity: 0.7,
    },

    // Section Card
    sectionCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
    },

    // FAQ Items
    faqRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        gap: 14,
    },
    faqIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faqContent: {
        flex: 1,
    },
    faqQuestion: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    faqAnswerContainer: {
        marginTop: 10,
    },
    faqAnswer: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.8,
    },
    rowDivider: {
        height: 1,
    },

    // Contact Row
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    contactIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactContent: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    contactSubtitle: {
        fontSize: 12,
        opacity: 0.7,
    },

    // Info Card
    infoCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        marginBottom: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 2,
    },

    // Note Card
    noteCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },

    // Emergency Card
    emergencyCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        marginBottom: 20,
    },
    emergencyContent: {
        flex: 1,
    },
    emergencyTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    emergencyText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    emergencyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
    },
    emergencyBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12.5,
        opacity: 0.65,
        letterSpacing: 0.3,
    },

    // Toast
    toast: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
        zIndex: 9999,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    toastText: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});