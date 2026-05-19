// app/accept-invite.tsx
// Validates and accepts a robot sharing invitation token from an email deep link
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AppText from '../src/components/AppText';
import { useThemeContext } from '../src/context/ThemeContext';
import { supabase } from '../src/services/supabase';
import { useAppNavigation } from '../hooks/useAppNavigation';

type PageState = 'loading' | 'valid' | 'expired' | 'already_accepted' | 'error' | 'accepted' | 'declined';

export default function AcceptInviteScreen() {
    const { token, robot_id } = useLocalSearchParams<{ token: string; robot_id: string }>();
    const { colors, darkMode }       = useThemeContext();
    const { replace }                = useAppNavigation();

    const [pageState, setPageState]         = useState<PageState>('loading');
    const [robotName, setRobotName]         = useState('');
    const [inviterName, setInviterName]     = useState('');
    const [role, setRole]                   = useState('viewer');
    const [busy, setBusy]                   = useState(false);
    const [errorMsg, setErrorMsg]           = useState('');

    const textPrimary   = darkMode ? '#ffffff' : '#1a1a2e';
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const cardBg        = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder    = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    // ── Validate token on mount ──────────────────────────────────────────────

    useEffect(() => {
        if (!token) { setPageState('error'); setErrorMsg('No invitation token provided.'); return; }
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const { data: invite, error } = await supabase
                .from('invite_tokens')
                .select('token, robot_id, inviter_id, invitee_email, role, expires_at, accepted_at, declined_at, robots(name), inviter:inviter_id(raw_user_meta_data)')
                .eq('token', token)
                .maybeSingle();

            if (error || !invite) { setPageState('error'); setErrorMsg('Invitation not found.'); return; }

            if (invite.accepted_at) { setPageState('already_accepted'); return; }
            if (new Date(invite.expires_at) < new Date()) { setPageState('expired'); return; }

            const rName = (invite as any).robots?.name ?? 'Unknown Robot';
            const iMeta = (invite as any).inviter?.raw_user_meta_data;
            const iName = iMeta?.full_name ?? 'Someone';

            setRobotName(rName);
            setInviterName(iName.split(' ')[0]);
            setRole(invite.role ?? 'viewer');
            setPageState('valid');
        } catch (err: any) {
            setPageState('error');
            setErrorMsg(err.message ?? 'Unexpected error');
        }
    };

    // ── Accept ───────────────────────────────────────────────────────────────

    const acceptInvite = useCallback(async () => {
        if (busy) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setBusy(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in to accept this invitation.');

            // Mark invite accepted
            const { error: updateErr } = await supabase
                .from('invite_tokens')
                .update({ accepted_at: new Date().toISOString() })
                .eq('token', token);

            if (updateErr) throw updateErr;

            // Add user as robot member
            const { error: memberErr } = await supabase
                .from('robot_members')
                .upsert({ robot_id: robot_id, user_id: user.id, role });

            if (memberErr) throw memberErr;

            setPageState('accepted');
        } catch (err: any) {
            setPageState('error');
            setErrorMsg(err.message ?? 'Failed to accept invitation.');
        } finally {
            setBusy(false);
        }
    }, [busy, token, robot_id, role]);

    // ── Decline ──────────────────────────────────────────────────────────────

    const declineInvite = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            await supabase
                .from('invite_tokens')
                .update({ declined_at: new Date().toISOString() })
                .eq('token', token);
            setPageState('declined');
        } catch {
            // ignore decline errors silently
        } finally {
            setBusy(false);
        }
    }, [busy, token]);

    // ── Render ───────────────────────────────────────────────────────────────

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

            <View style={styles.inner}>
                {pageState === 'loading' && (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <AppText style={[styles.subtitle, { color: textSecondary, marginTop: 16 }]}>Validating invitation…</AppText>
                    </View>
                )}

                {pageState === 'valid' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                            <Ionicons name="people" size={40} color="#8B5CF6" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>You're Invited!</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>
                            <AppText style={{ fontWeight: '700', color: textPrimary }}>{inviterName}</AppText>
                            {' '}invited you to access{' '}
                            <AppText style={{ fontWeight: '700', color: textPrimary }}>{robotName}</AppText>
                        </AppText>

                        <View style={[styles.roleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
                            <AppText style={[styles.roleText, { color: textPrimary }]}>
                                Your role: <AppText style={{ fontWeight: '700', color: '#8B5CF6' }}>{roleLabel}</AppText>
                            </AppText>
                        </View>

                        <TouchableOpacity
                            style={[styles.acceptBtn, { opacity: busy ? 0.6 : 1 }]}
                            onPress={acceptInvite}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                            <AppText style={styles.acceptBtnText}>Accept Invitation</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.declineBtn, { borderColor: cardBorder }]}
                            onPress={declineInvite}
                            disabled={busy}
                            activeOpacity={0.7}
                        >
                            <AppText style={[styles.declineBtnText, { color: textSecondary }]}>Decline</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {pageState === 'accepted' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>Invitation Accepted!</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>
                            You now have access to <AppText style={{ fontWeight: '700', color: textPrimary }}>{robotName}</AppText> as a <AppText style={{ fontWeight: '700', color: '#10B981' }}>{roleLabel}</AppText>.
                        </AppText>
                        <TouchableOpacity
                            style={[styles.acceptBtn, { marginTop: 32 }]}
                            onPress={() => replace('/(tabs)')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="home" size={20} color="#fff" />
                            <AppText style={styles.acceptBtnText}>Go to Dashboard</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {pageState === 'declined' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                            <Ionicons name="close-circle" size={40} color="#EF4444" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>Invitation Declined</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>You have declined the invitation to access {robotName}.</AppText>
                        <TouchableOpacity style={[styles.acceptBtn, { marginTop: 32, backgroundColor: '#6B7280' }]} onPress={() => replace('/(tabs)')} activeOpacity={0.8}>
                            <AppText style={styles.acceptBtnText}>Go to Dashboard</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {pageState === 'expired' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                            <Ionicons name="time-outline" size={40} color="#F59E0B" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>Invitation Expired</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>This invitation has expired. Please ask the robot owner to send a new one.</AppText>
                        <TouchableOpacity style={[styles.acceptBtn, { marginTop: 32, backgroundColor: '#6B7280' }]} onPress={() => replace('/(tabs)')} activeOpacity={0.8}>
                            <AppText style={styles.acceptBtnText}>Go to Dashboard</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {pageState === 'already_accepted' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                            <Ionicons name="checkmark-done-circle" size={40} color="#10B981" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>Already Accepted</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>This invitation was already accepted. You already have access to this robot.</AppText>
                        <TouchableOpacity style={[styles.acceptBtn, { marginTop: 32 }]} onPress={() => replace('/(tabs)')} activeOpacity={0.8}>
                            <Ionicons name="home" size={20} color="#fff" />
                            <AppText style={styles.acceptBtnText}>Go to Dashboard</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {pageState === 'error' && (
                    <View style={styles.centerContent}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                            <Ionicons name="alert-circle" size={40} color="#EF4444" />
                        </View>
                        <AppText style={[styles.heading, { color: textPrimary }]}>Something Went Wrong</AppText>
                        <AppText style={[styles.subtitle, { color: textSecondary }]}>{errorMsg || 'Unable to process this invitation.'}</AppText>
                        <TouchableOpacity style={[styles.acceptBtn, { marginTop: 32, backgroundColor: '#6B7280' }]} onPress={() => replace('/(tabs)')} activeOpacity={0.8}>
                            <AppText style={styles.acceptBtnText}>Go to Dashboard</AppText>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1 },
    inner:         { flex: 1, padding: 24 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    iconWrap:      { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    heading:       { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    subtitle:      { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320, marginBottom: 8 },
    roleCard:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 14, marginTop: 20, marginBottom: 4 },
    roleText:      { fontSize: 15 },
    acceptBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8B5CF6', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 15, marginTop: 24, width: '100%', maxWidth: 320 },
    acceptBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    declineBtn:    { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 32, paddingVertical: 14, marginTop: 12, width: '100%', maxWidth: 320, alignItems: 'center' },
    declineBtnText:{ fontSize: 15, fontWeight: '500' },
});
