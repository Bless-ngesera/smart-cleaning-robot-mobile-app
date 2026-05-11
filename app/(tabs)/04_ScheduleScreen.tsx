// app/(tabs)/04_ScheduleScreen.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { disableSystemFontScaling } from '@/src/utils/disableFontScaling';
disableSystemFontScaling();
import {
    View,
    FlatList,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Platform,
    useWindowDimensions,
    Animated,
    RefreshControl,
    TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Loader from '@/src/components/Loader';
import AppText from '@/src/components/AppText';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { useAppNavigation } from '@/hooks/useAppNavigation';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type Entry = {
    id: string;
    user_id: string;
    day: string;
    time: string;
    enabled: boolean;
    scheduled_at: string;
    missed?: boolean;
    acknowledged?: boolean;
};

/* ────────────────────────────────────────────────────────────────────
   DATE / TIME HELPERS
──────────────────────────────────────────────────────────────────── */
function formatDisplayDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
}

function formatDisplayTime(t: Date): string {
    return t.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function parseScheduledAt(iso: string): Date {
    return new Date(iso);
}

function isUpcoming(entry: Entry): boolean {
    const d = parseScheduledAt(entry.scheduled_at);
    return d.getTime() > Date.now();
}

function isMissed(entry: Entry): boolean {
    const d = parseScheduledAt(entry.scheduled_at);
    return entry.enabled && d.getTime() < Date.now();
}

function countdown(iso: string): string {
    const diff = parseScheduledAt(iso).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const totalMin = Math.floor(diff / 60_000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
}

/* ────────────────────────────────────────────────────────────────────
   CALENDAR PICKER
──────────────────────────────────────────────────────────────────── */
const CAL_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const CAL_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate: Date;
    minimumDate: Date;
    primaryColor: string;
    darkMode: boolean;
}

function CalendarPicker({ visible, onClose, onConfirm, initialDate, minimumDate, primaryColor, darkMode }: CalendarPickerProps) {
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [tempDate, setTempDate] = useState<Date>(initialDate);

    useEffect(() => {
        if (visible) {
            setTempDate(initialDate);
            setViewMonth(initialDate.getMonth());
            setViewYear(initialDate.getFullYear());
        }
    }, [visible, initialDate]);

    const bg = darkMode ? '#16162a' : '#fff';
    const txP = darkMode ? '#fff' : '#0f0f1a';
    const txS = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
    const div = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const surf = darkMode ? 'rgba(255,255,255,0.06)' : '#f4f5fb';

    const minDay = useMemo(() => { const d = new Date(minimumDate); d.setHours(0, 0, 0, 0); return d; }, [minimumDate]);
    const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
    const firstWeekday = (m: number, y: number) => new Date(y, m, 1).getDay();
    const isDisabled = (day: number) => { const d = new Date(viewYear, viewMonth, day); d.setHours(0, 0, 0, 0); return d < minDay; };
    const isToday = (day: number) => todayStart.getFullYear() === viewYear && todayStart.getMonth() === viewMonth && todayStart.getDate() === day;
    const isSelected = (day: number) => tempDate.getFullYear() === viewYear && tempDate.getMonth() === viewMonth && tempDate.getDate() === day;

    const prevDisabled = () => { const d = new Date(viewYear, viewMonth, 0); d.setHours(0, 0, 0, 0); return d < minDay; };
    const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
    const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

    const total = daysInMonth(viewMonth, viewYear);
    const cells: (number | null)[] = [...Array(firstWeekday(viewMonth, viewYear)).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={calS.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={[calS.card, { backgroundColor: bg }]}>
                    <View style={[calS.navRow, { borderBottomColor: div }]}>
                        <TouchableOpacity onPress={prevMonth} disabled={prevDisabled()} style={[calS.navBtn, { opacity: prevDisabled() ? 0.2 : 1 }]}>
                            <Ionicons name="chevron-back" size={22} color={primaryColor} />
                        </TouchableOpacity>
                        <AppText style={[calS.monthLabel, { color: txP }]}>{CAL_MONTHS[viewMonth]} {viewYear}</AppText>
                        <TouchableOpacity onPress={nextMonth} style={calS.navBtn}>
                            <Ionicons name="chevron-forward" size={22} color={primaryColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={calS.weekRow}>
                        {CAL_DAYS.map((d, i) => (
                            <View key={i} style={calS.weekCell}>
                                <AppText style={[calS.weekText, { color: txS }]}>{d}</AppText>
                            </View>
                        ))}
                    </View>
                    <View style={calS.grid}>
                        {cells.map((day, idx) => {
                            if (!day) return <View key={`e${idx}`} style={calS.dayCell} />;
                            const dis = isDisabled(day), sel = isSelected(day), tod = isToday(day);
                            // Fix TS2322: build style array with proper TextStyle objects, no boolean spreads
                            const dayTextStyle: TextStyle[] = [
                                calS.dayText,
                                { color: dis ? (darkMode ? 'rgba(255,255,255,0.18)' : '#ccc') : sel ? '#fff' : tod ? primaryColor : txP },
                                ...(sel || tod ? [{ fontWeight: '700' as const }] : []),
                            ];
                            return (
                                <TouchableOpacity
                                    key={`d${day}`}
                                    style={calS.dayCell}
                                    onPress={() => !dis && setTempDate(new Date(viewYear, viewMonth, day))}
                                    disabled={dis}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        calS.dayCircle,
                                        sel ? { backgroundColor: primaryColor } : undefined,
                                        !sel && tod ? { borderWidth: 2, borderColor: primaryColor } : undefined,
                                    ]}>
                                        <AppText style={dayTextStyle}>{day}</AppText>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={[calS.preview, { backgroundColor: surf }]}>
                        <Ionicons name="calendar-outline" size={14} color={primaryColor} />
                        <AppText style={[calS.previewText, { color: txP }]}>{formatDisplayDate(tempDate)}</AppText>
                    </View>
                    <View style={[calS.footer, { borderTopColor: div }]}>
                        <TouchableOpacity onPress={onClose} style={calS.footerBtn}>
                            <AppText style={[calS.cancelText, { color: txS }]}>CANCEL</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { onConfirm(tempDate); onClose(); }} style={[calS.footerBtn, calS.okWrap, { backgroundColor: primaryColor }]}>
                            <AppText style={calS.okText}>OK</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const calS = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 360, borderRadius: 20, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 14, borderBottomWidth: 1 },
    navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    weekRow: { flexDirection: 'row', paddingTop: 14, paddingBottom: 6, paddingHorizontal: 8 },
    weekCell: { flex: 1, alignItems: 'center' },
    weekText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8 },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
    dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontSize: 14, fontWeight: '500' },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    previewText: { fontSize: 13, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
    footerBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    okWrap: { minWidth: 72, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
    okText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: '#fff' },
});

/* ────────────────────────────────────────────────────────────────────
   CLOCK PICKER
──────────────────────────────────────────────────────────────────── */
const CLOCK_SIZE = 260;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const NUM_RADIUS = 96;

function getClockPos(index: number, total: number, radius: number) {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: CLOCK_CENTER + radius * Math.cos(angle), y: CLOCK_CENTER + radius * Math.sin(angle) };
}

const HOUR_RING = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MIN_MARKS = [{ label: '00', value: 0 }, { label: '15', value: 15 }, { label: '30', value: 30 }, { label: '45', value: 45 }];

interface ClockPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (time: Date) => void;
    initialTime: Date;
    primaryColor: string;
    darkMode: boolean;
}

function ClockPicker({ visible, onClose, onConfirm, initialTime, primaryColor, darkMode }: ClockPickerProps) {
    const parse = (t: Date) => ({ h: t.getHours() % 12 || 12, m: Math.round(t.getMinutes() / 15) * 15 % 60, per: (t.getHours() >= 12 ? 'PM' : 'AM') as 'AM' | 'PM' });
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const [hour, setHour] = useState(() => parse(initialTime).h);
    const [minute, setMinute] = useState(() => parse(initialTime).m);
    const [period, setPeriod] = useState<'AM' | 'PM'>(() => parse(initialTime).per);

    useEffect(() => {
        if (visible) { const p = parse(initialTime); setMode('hour'); setHour(p.h); setMinute(p.m); setPeriod(p.per); }
    }, [visible, initialTime]);

    const bg = darkMode ? '#16162a' : '#fff';
    const clockBg = darkMode ? 'rgba(255,255,255,0.07)' : '#f0f3fa';
    const txP = darkMode ? '#fff' : '#0f0f1a';
    const txS = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
    const div = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const segBg = darkMode ? 'rgba(255,255,255,0.1)' : '#eef0f6';

    const to24 = (h: number, p: 'AM' | 'PM') => p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);

    const selectHour = (h: number) => { setHour(h); setTimeout(() => setMode('minute'), 160); };

    const handleConfirm = () => {
        const r = new Date(); r.setHours(to24(hour, period), minute, 0, 0); onConfirm(r); onClose();
    };

    const hourIdx = HOUR_RING.indexOf(hour);
    const handEnd = mode === 'hour' ? getClockPos(hourIdx, 12, NUM_RADIUS - 4) : getClockPos(minute / 15, 4, NUM_RADIUS - 4);

    const renderHand = (ex: number, ey: number) => {
        const dx = ex - CLOCK_CENTER, dy = ey - CLOCK_CENTER, len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * (180 / Math.PI);
        const cx = (CLOCK_CENTER + ex) / 2, cy = (CLOCK_CENTER + ey) / 2;
        return (
            <>
                <View pointerEvents="none" style={{ position: 'absolute', width: len, height: 3, backgroundColor: primaryColor, borderRadius: 2, left: cx - len / 2, top: cy - 1.5, transform: [{ rotate: `${ang}deg` }] }} />
                <View style={[ckS.centerPin, { backgroundColor: primaryColor }]} />
            </>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={ckS.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={[ckS.card, { backgroundColor: bg }]}>
                    <View style={ckS.digitalRow}>
                        <View style={ckS.segRow}>
                            <TouchableOpacity onPress={() => setMode('hour')} style={[ckS.seg, { backgroundColor: mode === 'hour' ? primaryColor : segBg }]}>
                                <AppText style={[ckS.segText, { color: mode === 'hour' ? '#fff' : txP }]}>{String(hour).padStart(2, '0')}</AppText>
                            </TouchableOpacity>
                            <AppText style={[ckS.colon, { color: txS }]}>:</AppText>
                            <TouchableOpacity onPress={() => setMode('minute')} style={[ckS.seg, { backgroundColor: mode === 'minute' ? primaryColor : segBg }]}>
                                <AppText style={[ckS.segText, { color: mode === 'minute' ? '#fff' : txP }]}>{String(minute).padStart(2, '0')}</AppText>
                            </TouchableOpacity>
                        </View>
                        <View style={[ckS.periodWrap, { borderColor: div }]}>
                            {(['AM', 'PM'] as const).map(p => (
                                <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[ckS.periodBtn, period === p && { backgroundColor: primaryColor }]}>
                                    <AppText style={[ckS.periodText, { color: period === p ? '#fff' : txS }]}>{p}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <AppText style={[ckS.modeHint, { color: txS }]}>{mode === 'hour' ? 'Select hour' : 'Select minutes'}</AppText>
                    <View style={[ckS.clockFace, { backgroundColor: clockBg }]}>
                        {renderHand(handEnd.x, handEnd.y)}
                        {mode === 'hour' && HOUR_RING.map((h, i) => {
                            const pos = getClockPos(i, 12, NUM_RADIUS), sel = h === hour;
                            return (
                                <TouchableOpacity key={h} onPress={() => selectHour(h)} style={[ckS.numBtn, { left: pos.x - 20, top: pos.y - 20 }, sel && { backgroundColor: primaryColor }]} activeOpacity={0.75}>
                                    <AppText style={[ckS.numText, { color: sel ? '#fff' : txP, fontWeight: sel ? '700' : '500' }]}>{h}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                        {mode === 'minute' && (
                            <>
                                {Array.from({ length: 12 }).map((_, i) => {
                                    if ([0, 3, 6, 9].includes(i)) return null;
                                    const pos = getClockPos(i, 12, NUM_RADIUS);
                                    return <View key={`t${i}`} pointerEvents="none" style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: darkMode ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)', left: pos.x - 2.5, top: pos.y - 2.5 }} />;
                                })}
                                {MIN_MARKS.map((mk, i) => {
                                    const pos = getClockPos(i, 4, NUM_RADIUS), sel = mk.value === minute;
                                    return (
                                        <TouchableOpacity key={mk.value} onPress={() => setMinute(mk.value)} style={[ckS.numBtn, { left: pos.x - 20, top: pos.y - 20 }, sel && { backgroundColor: primaryColor }]} activeOpacity={0.75}>
                                            <AppText style={[ckS.numText, { color: sel ? '#fff' : txP, fontWeight: sel ? '700' : '500' }]}>{mk.label}</AppText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}
                    </View>
                    <View style={[ckS.footer, { borderTopColor: div }]}>
                        <TouchableOpacity onPress={onClose} style={ckS.footerBtn}>
                            <AppText style={[ckS.cancelText, { color: txS }]}>CANCEL</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleConfirm} style={[ckS.footerBtn, ckS.okWrap, { backgroundColor: primaryColor }]}>
                            <AppText style={ckS.okText}>OK</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const ckS = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    digitalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 24, paddingBottom: 6, paddingHorizontal: 24 },
    segRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    seg: { width: 66, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segText: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
    colon: { fontSize: 34, fontWeight: '700', marginBottom: 4 },
    periodWrap: { borderRadius: 10, borderWidth: 1.5, overflow: 'hidden' },
    periodBtn: { paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
    periodText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    modeHint: { textAlign: 'center', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginTop: 4, marginBottom: 14 },
    clockFace: { width: CLOCK_SIZE, height: CLOCK_SIZE, borderRadius: CLOCK_SIZE / 2, alignSelf: 'center', position: 'relative', marginBottom: 20 },
    centerPin: { position: 'absolute', width: 10, height: 10, borderRadius: 5, left: CLOCK_CENTER - 5, top: CLOCK_CENTER - 5, zIndex: 10 },
    numBtn: { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    numText: { fontSize: 15 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
    footerBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    okWrap: { minWidth: 72, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
    okText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: '#fff' },
});

/* ────────────────────────────────────────────────────────────────────
   MISSED BANNER
──────────────────────────────────────────────────────────────────── */
interface MissedBannerProps {
    count: number;
    onDismiss: () => void;
    onAcknowledgeAll: () => void;
    darkMode: boolean;
}

function MissedBanner({ count, onAcknowledgeAll }: MissedBannerProps) {
    const slideAnim = useRef(new Animated.Value(-80)).current;

    useEffect(() => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
    }, [slideAnim]);

    return (
        <Animated.View style={[missedS.banner, { transform: [{ translateY: slideAnim }] }]}>
            <View style={missedS.iconWrap}>
                <Ionicons name="warning" size={22} color="#fff" />
            </View>
            <View style={missedS.textWrap}>
                <AppText style={missedS.title}>
                    {count === 1 ? '1 missed session' : `${count} missed sessions`}
                </AppText>
                <AppText style={missedS.sub}>Robot did not run as scheduled</AppText>
            </View>
            <TouchableOpacity onPress={onAcknowledgeAll} style={missedS.ackBtn} activeOpacity={0.8}>
                <AppText style={missedS.ackText}>Dismiss All</AppText>
            </TouchableOpacity>
        </Animated.View>
    );
}

const missedS = StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 14, padding: 14, marginBottom: 16, gap: 12, elevation: 6, shadowColor: '#DC2626', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    textWrap: { flex: 1 },
    title: { color: '#fff', fontWeight: '700', fontSize: 15 },
    sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    ackBtn: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
    ackText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

/* ────────────────────────────────────────────────────────────────────
   INLINE ACTION BUTTONS  (replaces <Button> to guarantee text contrast)
──────────────────────────────────────────────────────────────────── */
interface ActionButtonProps {
    title: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'disabled';
    style?: object;
    primaryColor: string;
}

function ActionButton({ title, icon, onPress, variant = 'primary', style, primaryColor }: ActionButtonProps) {
    const isDisabled = variant === 'disabled';
    const isOutline = variant === 'outline';

    const bg = isDisabled
        ? 'rgba(255,255,255,0.08)'
        : isOutline
        ? 'transparent'
        : primaryColor;

    const borderColor = isDisabled
        ? 'rgba(255,255,255,0.12)'
        : primaryColor;

    const textColor = isDisabled
        ? 'rgba(255,255,255,0.35)'
        : '#ffffff';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={isDisabled ? 1 : 0.78}
            style={[
                abS.btn,
                { backgroundColor: bg, borderColor, borderWidth: isOutline || isDisabled ? 1.5 : 0 },
                style,
            ]}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={18}
                    color={isDisabled ? 'rgba(255,255,255,0.35)' : isOutline ? primaryColor : '#fff'}
                    style={{ marginRight: 6 }}
                />
            )}
            <AppText style={[abS.label, { color: isOutline ? primaryColor : textColor }]}>
                {title}
            </AppText>
        </TouchableOpacity>
    );
}

const abS = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});

/* ────────────────────────────────────────────────────────────────────
   SCHEDULE SCREEN
──────────────────────────────────────────────────────────────────── */
export default function ScheduleScreen() {
    const { push } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [entries, setEntries] = useState<Entry[]>([]);
    const [busy, setBusy] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [showCal, setShowCal] = useState(false);
    const [showClock, setShowClock] = useState(false);
    const [selDate, setSelDate] = useState<Date | null>(null);
    const [selTime, setSelTime] = useState<Date | null>(null);
    const [missedShown, setMissedShown] = useState(false);
    const [countdownTick, setCountdownTick] = useState(0);

    const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSec = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
    const divColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    useEffect(() => {
        const id = setInterval(() => setCountdownTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const defaultClockTime = useMemo(() => {
        if (selTime) return selTime;
        const b = new Date(); b.setHours(b.getHours() + 1, 0, 0, 0); return b;
    }, [selTime]);

    const upcoming = useMemo(() =>
        entries.filter(e => e.enabled && isUpcoming(e))
            .sort((a, b) => parseScheduledAt(a.scheduled_at).getTime() - parseScheduledAt(b.scheduled_at).getTime()),
        [entries, countdownTick]
    );

    const missed = useMemo(() =>
        entries.filter(e => isMissed(e) && !e.acknowledged),
        [entries, countdownTick]
    );

    const pastAcknowledged = useMemo(() =>
        entries.filter(e => !isUpcoming(e) && (e.acknowledged || !e.enabled))
            .sort((a, b) => parseScheduledAt(b.scheduled_at).getTime() - parseScheduledAt(a.scheduled_at).getTime())
            .slice(0, 10),
        [entries]
    );

    const nextRoutine = upcoming[0] ?? null;

    const stats = useMemo(() => ({
        total: entries.length,
        upcoming: upcoming.length,
        missed: missed.length,
    }), [entries, upcoming, missed]);

    useEffect(() => {
        if (missed.length > 0 && !missedShown) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setMissedShown(true);
        }
    }, [missed.length, missedShown]);

    const fetchEntries = useCallback(async (silent = false) => {
        if (!silent) { setBusy(true); setLoadingMsg('Syncing schedule…'); }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('schedules')
                .select('id, user_id, day, time, enabled, scheduled_at, missed, acknowledged')
                .eq('user_id', user.id)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;

            const now = new Date();
            const toMarkMissed = (data || []).filter(
                (e: Entry) => e.enabled && !e.missed && !e.acknowledged && new Date(e.scheduled_at) < now
            );
            if (toMarkMissed.length > 0) {
                await supabase
                    .from('schedules')
                    .update({ missed: true })
                    .in('id', toMarkMissed.map((e: Entry) => e.id));
            }

            setEntries((data || []).map((e: Entry) => ({
                ...e,
                missed: e.missed || toMarkMissed.some(m => m.id === e.id),
            })));
        } catch (err: any) {
            console.error('[Schedule] fetch error:', err);
            if (!silent) Alert.alert('Sync Error', err.message || 'Could not load schedule.');
        } finally {
            setBusy(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchEntries(true); }, [fetchEntries]);

    const acknowledgeAll = useCallback(async () => {
        const ids = missed.map(e => e.id);
        setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, acknowledged: true } : e));
        try {
            await supabase.from('schedules').update({ acknowledged: true }).in('id', ids);
        } catch (err) { console.error('[Schedule] acknowledge error:', err); }
    }, [missed]);

    const addRoutine = useCallback(async () => {
        if (!selDate || !selTime) {
            Alert.alert('Missing info', 'Please select both a date and time.');
            return;
        }
        const scheduledAt = new Date(
            selDate.getFullYear(), selDate.getMonth(), selDate.getDate(),
            selTime.getHours(), selTime.getMinutes(), 0, 0
        );
        if (scheduledAt.getTime() <= Date.now()) {
            Alert.alert('Invalid time', 'Please select a future date and time.');
            return;
        }

        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBusy(true); setLoadingMsg('Adding routine…');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { data: inserted, error } = await supabase
                .from('schedules')
                .insert({
                    user_id: user.id,
                    day: formatDisplayDate(selDate),
                    time: formatDisplayTime(selTime),
                    enabled: true,
                    scheduled_at: scheduledAt.toISOString(),
                    missed: false,
                    acknowledged: false,
                })
                .select('id, user_id, day, time, enabled, scheduled_at, missed, acknowledged')
                .single();

            if (error) throw error;
            setEntries(prev => [...prev, inserted].sort(
                (a, b) => parseScheduledAt(a.scheduled_at).getTime() - parseScheduledAt(b.scheduled_at).getTime()
            ));
            setSelDate(null); setSelTime(null);
            Alert.alert('Routine added ✓', `Scheduled for ${formatDisplayDate(selDate)} at ${formatDisplayTime(selTime)}`);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to add routine.');
        } finally { setBusy(false); }
    }, [selDate, selTime]);

    const toggleRoutine = useCallback(async (id: string) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        const item = entries.find(e => e.id === id);
        if (!item) return;
        const newEnabled = !item.enabled;
        setEntries(prev => prev.map(e => e.id === id ? { ...e, enabled: newEnabled } : e));
        try {
            const { error } = await supabase.from('schedules').update({ enabled: newEnabled }).eq('id', id);
            if (error) throw error;
        } catch (err) {
            setEntries(prev => prev.map(e => e.id === id ? { ...e, enabled: item.enabled } : e));
            Alert.alert('Error', 'Failed to update routine.');
        }
    }, [entries]);

    const deleteRoutine = useCallback(async (id: string) => {
        Alert.alert('Delete Routine', 'Remove this scheduled cleaning?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setBusy(true); setLoadingMsg('Deleting…');
                    try {
                        const { error } = await supabase.from('schedules').delete().eq('id', id);
                        if (error) throw error;
                        setEntries(prev => prev.filter(e => e.id !== id));
                    } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to delete.');
                    } finally { setBusy(false); }
                },
            },
        ]);
    }, []);

    const clearUpcoming = useCallback(async () => {
        if (upcoming.length === 0) return;
        Alert.alert('Clear All Upcoming', `Remove all ${upcoming.length} upcoming routines?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All', style: 'destructive',
                onPress: async () => {
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setBusy(true); setLoadingMsg('Clearing…');
                    try {
                        const ids = upcoming.map(e => e.id);
                        const { error } = await supabase.from('schedules').delete().in('id', ids);
                        if (error) throw error;
                        setEntries(prev => prev.filter(e => !ids.includes(e.id)));
                    } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to clear.');
                    } finally { setBusy(false); }
                },
            },
        ]);
    }, [upcoming]);

    if (busy) return <Loader message={loadingMsg} />;

    return (
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={[s.scroll, isLargeScreen && s.scrollLarge]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={[s.wrapper, isLargeScreen && s.wrapperLarge]}>

                    {/* Header */}
                    <View style={s.header}>
                        <AppText style={[s.headerTitle, { color: textPrimary }]}>Cleaning Schedule</AppText>
                        <AppText style={[s.headerSub, { color: textSec }]}>Time-based adaptive routines</AppText>
                    </View>

                    {/* Missed banner */}
                    {missed.length > 0 && (
                        <MissedBanner
                            count={missed.length}
                            onDismiss={() => setMissedShown(true)}
                            onAcknowledgeAll={acknowledgeAll}
                            darkMode={darkMode}
                        />
                    )}

                    {/* Stats */}
                    <View style={s.statsRow}>
                        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[s.statIcon, { backgroundColor: `${colors.primary}1a` }]}>
                                <Ionicons name="calendar" size={22} color={colors.primary} />
                            </View>
                            <AppText style={[s.statVal, { color: colors.primary }]}>{stats.total}</AppText>
                            <AppText style={[s.statLbl, { color: textSec }]}>Total</AppText>
                        </View>
                        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[s.statIcon, { backgroundColor: '#10B9811a' }]}>
                                <Ionicons name="flash" size={22} color="#10B981" />
                            </View>
                            <AppText style={[s.statVal, { color: '#10B981' }]}>{stats.upcoming}</AppText>
                            <AppText style={[s.statLbl, { color: textSec }]}>Upcoming</AppText>
                        </View>
                        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[s.statIcon, { backgroundColor: '#EF44441a' }]}>
                                <Ionicons name="alert-circle" size={22} color="#EF4444" />
                            </View>
                            <AppText style={[s.statVal, { color: '#EF4444' }]}>{stats.missed}</AppText>
                            <AppText style={[s.statLbl, { color: textSec }]}>Missed</AppText>
                        </View>
                    </View>

                    {/* Next routine */}
                    {nextRoutine ? (
                        <View style={[s.nextCard, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}50` }]}>
                            <View style={s.nextHeader}>
                                <View style={[s.pulseWrap, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="flash" size={18} color="#fff" />
                                </View>
                                <AppText style={[s.nextTitle, { color: colors.primary }]}>Next Cleaning</AppText>
                                <View style={[s.countdownPill, { backgroundColor: `${colors.primary}22` }]}>
                                    <AppText style={[s.countdownText, { color: colors.primary }]}>
                                        {countdown(nextRoutine.scheduled_at)}
                                    </AppText>
                                </View>
                            </View>
                            <View style={s.nextBody}>
                                <View style={s.nextInfo}>
                                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                                    <AppText style={[s.nextDay, { color: textPrimary }]}>{nextRoutine.day}</AppText>
                                </View>
                                <View style={s.nextInfo}>
                                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                                    <AppText style={[s.nextTime, { color: textPrimary }]}>{nextRoutine.time}</AppText>
                                </View>
                            </View>
                            {upcoming.length > 1 && (
                                <AppText style={[s.nextFooter, { color: textSec }]}>
                                    +{upcoming.length - 1} more {upcoming.length === 2 ? 'routine' : 'routines'}
                                </AppText>
                            )}
                        </View>
                    ) : (
                        <View style={[s.noNextCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Ionicons name="moon-outline" size={28} color={textSec} style={{ opacity: 0.5 }} />
                            <AppText style={[s.noNextText, { color: textSec }]}>No upcoming routines</AppText>
                        </View>
                    )}

                    {/* Sync button — custom for guaranteed text visibility */}
                    <ActionButton
                        title="Sync from Robot"
                        icon="sync-outline"
                        onPress={() => fetchEntries()}
                        variant="outline"
                        primaryColor={colors.primary}
                        style={s.syncBtn}
                    />

                    {/* Add New Routine */}
                    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={s.cardHeader}>
                            <Ionicons name="add-circle" size={20} color={colors.primary} />
                            <AppText style={[s.cardTitle, { color: textPrimary }]}>Add New Routine</AppText>
                        </View>

                        <TouchableOpacity
                            style={[s.pickerRow, { borderColor: selDate ? colors.primary : cardBorder, backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#f7f8fc' }]}
                            onPress={() => setShowCal(true)} activeOpacity={0.75}
                        >
                            <View style={[s.pickerIcon, { backgroundColor: selDate ? `${colors.primary}20` : `${textSec}14` }]}>
                                <Ionicons name="calendar-outline" size={20} color={selDate ? colors.primary : textSec} />
                            </View>
                            <View style={s.pickerMeta}>
                                <AppText style={[s.pickerCap, { color: textSec }]}>DATE</AppText>
                                <AppText style={[s.pickerVal, { color: selDate ? textPrimary : textSec }]}>
                                    {selDate ? formatDisplayDate(selDate) : 'Tap to select date'}
                                </AppText>
                            </View>
                            {selDate
                                ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                : <Ionicons name="chevron-forward" size={16} color={textSec} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.pickerRow, { borderColor: selTime ? colors.primary : cardBorder, backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#f7f8fc', marginTop: 10 }]}
                            onPress={() => setShowClock(true)} activeOpacity={0.75}
                        >
                            <View style={[s.pickerIcon, { backgroundColor: selTime ? `${colors.primary}20` : `${textSec}14` }]}>
                                <Ionicons name="time-outline" size={20} color={selTime ? colors.primary : textSec} />
                            </View>
                            <View style={s.pickerMeta}>
                                <AppText style={[s.pickerCap, { color: textSec }]}>TIME</AppText>
                                <AppText style={[s.pickerVal, { color: selTime ? textPrimary : textSec }]}>
                                    {selTime ? formatDisplayTime(selTime) : 'Tap to select time'}
                                </AppText>
                            </View>
                            {selTime
                                ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                : <Ionicons name="chevron-forward" size={16} color={textSec} />}
                        </TouchableOpacity>

                        {/* Add Routine button — custom for guaranteed text visibility */}
                        <View style={{ marginTop: 16 }}>
                            <ActionButton
                                title="Add Routine"
                                icon="add-outline"
                                onPress={addRoutine}
                                variant={selDate && selTime ? 'primary' : 'disabled'}
                                primaryColor={colors.primary}
                            />
                        </View>
                    </View>

                    {/* Upcoming Routines list */}
                    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={s.listHeader}>
                            <View style={s.cardHeader}>
                                <Ionicons name="list" size={20} color={colors.primary} />
                                <AppText style={[s.cardTitle, { color: textPrimary }]}>Upcoming Routines</AppText>
                            </View>
                            {upcoming.length > 0 && (
                                <TouchableOpacity onPress={clearUpcoming} activeOpacity={0.7}>
                                    <AppText style={s.clearText}>Clear All</AppText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {upcoming.length === 0 ? (
                            <View style={s.empty}>
                                <Ionicons name="calendar-outline" size={44} color={textSec} style={{ opacity: 0.3 }} />
                                <AppText style={[s.emptyText, { color: textSec }]}>No upcoming routines</AppText>
                                <AppText style={[s.emptySub, { color: textSec }]}>Add a routine above to get started</AppText>
                            </View>
                        ) : (
                            <FlatList
                                data={upcoming}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                                renderItem={({ item, index }) => (
                                    <View style={[s.routineRow, index < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: divColor }]}>
                                        <TouchableOpacity onPress={() => toggleRoutine(item.id)} style={s.toggle} activeOpacity={0.7}>
                                            <View style={[s.checkbox, { borderColor: item.enabled ? colors.primary : cardBorder, backgroundColor: item.enabled ? colors.primary : 'transparent' }]}>
                                                {item.enabled && <Ionicons name="checkmark" size={14} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>

                                        <View style={[s.routineInfo, { opacity: item.enabled ? 1 : 0.45 }]}>
                                            <AppText style={[s.routineDay, { color: textPrimary }]}>{item.day}</AppText>
                                            <View style={s.routineTimeRow}>
                                                <Ionicons name="time-outline" size={13} color={textSec} />
                                                <AppText style={[s.routineTime, { color: textSec }]}>{item.time}</AppText>
                                                <View style={[s.countdownChip, { backgroundColor: `${colors.primary}18` }]}>
                                                    <AppText style={[s.chipText, { color: colors.primary }]}>
                                                        {countdown(item.scheduled_at)}
                                                    </AppText>
                                                </View>
                                            </View>
                                        </View>

                                        <TouchableOpacity onPress={() => deleteRoutine(item.id)} style={s.delBtn} activeOpacity={0.7}>
                                            <Ionicons name="trash-outline" size={19} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>

                    {/* Missed sessions */}
                    {missed.length > 0 && (
                        <View style={[s.card, { backgroundColor: cardBg, borderColor: '#EF4444' }]}>
                            <View style={s.listHeader}>
                                <View style={s.cardHeader}>
                                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                    <AppText style={[s.cardTitle, { color: '#EF4444' }]}>Missed Sessions</AppText>
                                </View>
                                <TouchableOpacity onPress={acknowledgeAll} activeOpacity={0.7}>
                                    <AppText style={[s.clearText, { color: '#EF4444' }]}>Dismiss All</AppText>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={missed}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                                renderItem={({ item, index }) => (
                                    <View style={[s.routineRow, index < missed.length - 1 && { borderBottomWidth: 1, borderBottomColor: divColor }]}>
                                        <View style={s.missedDot} />
                                        <View style={s.routineInfo}>
                                            <AppText style={[s.routineDay, { color: textPrimary }]}>{item.day}</AppText>
                                            <View style={s.routineTimeRow}>
                                                <Ionicons name="time-outline" size={13} color="#EF4444" />
                                                <AppText style={[s.routineTime, { color: textSec }]}>{item.time}</AppText>
                                                <View style={[s.countdownChip, { backgroundColor: '#EF444420' }]}>
                                                    <AppText style={[s.chipText, { color: '#EF4444' }]}>missed</AppText>
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => deleteRoutine(item.id)} style={s.delBtn} activeOpacity={0.7}>
                                            <Ionicons name="trash-outline" size={19} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    {/* History */}
                    {pastAcknowledged.length > 0 && (
                        <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={s.listHeader}>
                                <View style={s.cardHeader}>
                                    <Ionicons name="archive-outline" size={20} color={colors.primary} />
                                    <AppText style={[s.cardTitle, { color: textPrimary }]}>History</AppText>
                                </View>
                                <AppText style={[s.histCount, { color: textSec }]}>Last {pastAcknowledged.length}</AppText>
                            </View>
                            <FlatList
                                data={pastAcknowledged}
                                keyExtractor={(item, i) => `${item.id}-${i}`}
                                scrollEnabled={false}
                                renderItem={({ item, index }) => (
                                    <View style={[s.histRow, index < pastAcknowledged.length - 1 && { borderBottomWidth: 1, borderBottomColor: divColor }]}>
                                        <Ionicons
                                            name={item.missed && !item.acknowledged ? 'close-circle' : 'checkmark-circle'}
                                            size={20}
                                            color={item.missed && !item.acknowledged ? '#EF4444' : '#10B981'}
                                        />
                                        <View style={s.histInfo}>
                                            <AppText style={[s.histDay, { color: textPrimary }]}>{item.day}</AppText>
                                            <AppText style={[s.histTime, { color: textSec }]}>{item.time}</AppText>
                                        </View>
                                        <AppText style={[s.histStatus, { color: item.missed ? '#EF4444' : '#10B981' }]}>
                                            {item.missed ? 'Missed' : 'Done'}
                                        </AppText>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    {/* Tip */}
                    <View style={[s.tip, { backgroundColor: `${colors.primary}0e`, borderColor: `${colors.primary}28` }]}>
                        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                        <AppText style={[s.tipText, { color: textPrimary }]}>
                            Routines are time-based — the robot uses its sensors and cameras to adapt intelligently to your environment.
                        </AppText>
                    </View>

                    {/* Quick Links */}
                    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AppText style={[s.cardTitle, { color: textPrimary, marginBottom: 14 }]}>Quick Links</AppText>
                        <View style={s.quickRow}>
                            {[
                                { icon: 'grid-outline' as const, label: 'Dashboard', route: '/(tabs)/01_DashboardScreen', color: '#6366f1' },
                                { icon: 'game-controller-outline' as const, label: 'Control', route: '/(tabs)/02_ControlScreen', color: '#10B981' },
                                { icon: 'map-outline' as const, label: 'Map', route: '/(tabs)/03_MapScreen', color: '#14b8a6' },
                            ].map(item => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[s.quickTile, { backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`, borderColor: `${item.color}30` }]}
                                    onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); push(item.route); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[s.quickLbl, { color: textPrimary }]}>{item.label}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </View>
                <AppText style={[s.footer, { color: textSec }]}>Version 1.0.0 • Smart Cleaner Pro © 2026</AppText>
            </ScrollView>

            <CalendarPicker
                visible={showCal}
                onClose={() => setShowCal(false)}
                onConfirm={d => setSelDate(d)}
                initialDate={selDate ?? today}
                minimumDate={today}
                primaryColor={colors.primary}
                darkMode={darkMode}
            />
            <ClockPicker
                visible={showClock}
                onClose={() => setShowClock(false)}
                onConfirm={t => setSelTime(t)}
                initialTime={defaultClockTime}
                primaryColor={colors.primary}
                darkMode={darkMode}
            />
        </SafeAreaView>
    );
}

/* Styles */
const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 },
    scrollLarge: { alignItems: 'center' },
    wrapper: { width: '100%' },
    wrapperLarge: { maxWidth: 480 },

    header: { marginBottom: 24 },
    headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 5 },
    headerSub: { fontSize: 15, fontWeight: '400', letterSpacing: 0.1 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    statCard: { flex: 1, borderRadius: 18, padding: 14, borderWidth: 1, alignItems: 'center' },
    statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statVal: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
    statLbl: { fontSize: 12, fontWeight: '600' },

    nextCard: { borderRadius: 20, padding: 20, borderWidth: 1.5, marginBottom: 16 },
    nextHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    pulseWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    nextTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
    countdownPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    countdownText: { fontSize: 13, fontWeight: '700' },
    nextBody: { gap: 10, marginBottom: 10 },
    nextInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nextDay: { fontSize: 17, fontWeight: '600' },
    nextTime: { fontSize: 15, fontWeight: '500' },
    nextFooter: { fontSize: 12, textAlign: 'center', marginTop: 4 },

    noNextCard: { borderRadius: 20, padding: 20, borderWidth: 1, alignItems: 'center', gap: 8, marginBottom: 16 },
    noNextText: { fontSize: 15, fontWeight: '500' },

    syncBtn: { marginBottom: 16 },

    card: { borderRadius: 22, padding: 22, borderWidth: 1, marginBottom: 18 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    clearText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

    pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
    pickerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pickerMeta: { flex: 1, gap: 2 },
    pickerCap: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    pickerVal: { fontSize: 15, fontWeight: '500' },

    routineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    toggle: { padding: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    routineInfo: { flex: 1, gap: 5 },
    routineDay: { fontSize: 15, fontWeight: '600' },
    routineTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    routineTime: { fontSize: 13 },
    countdownChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    chipText: { fontSize: 11, fontWeight: '700' },
    delBtn: { padding: 8 },
    missedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginHorizontal: 7 },

    empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
    emptyText: { fontSize: 16, fontWeight: '500', marginTop: 6 },
    emptySub: { fontSize: 13, textAlign: 'center' },

    histCount: { fontSize: 13, fontWeight: '500' },
    histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    histInfo: { flex: 1 },
    histDay: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    histTime: { fontSize: 12 },
    histStatus: { fontSize: 12, fontWeight: '700' },

    tip: { borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 20 },
    tipText: { flex: 1, fontSize: 13, lineHeight: 20 },

    quickRow: { flexDirection: 'row', gap: 12 },
    quickTile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 18, alignItems: 'center', gap: 8 },
    quickLbl: { fontSize: 12, fontWeight: '600' },

    footer: { textAlign: 'center', marginTop: 28, fontSize: 12, opacity: 0.55, letterSpacing: 0.3 },
});