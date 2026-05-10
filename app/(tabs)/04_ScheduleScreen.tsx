// app/(tabs)/04_ScheduleScreen.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Loader from '../../src/components/Loader';
import AppText from '../../src/components/AppText';
import Button from '../../src/components/Button';
import { useThemeContext } from '@/src/context/ThemeContext';
import { supabase } from '@/src/services/supabase';
import { useAppNavigation } from '@/hooks/useAppNavigation';

type Entry = { id: string; day: string; time: string; enabled: boolean };

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatDisplayDate(d: Date): string {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDisplayTime(t: Date): string {
    return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────────────────────────────────────────
// CALENDAR PICKER
// ─────────────────────────────────────────────────────────────

const CAL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const CAL_WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate: Date;
    minimumDate: Date;
    primaryColor: string;
    darkMode: boolean;
}

function CalendarPicker({
    visible, onClose, onConfirm,
    initialDate, minimumDate, primaryColor, darkMode,
}: CalendarPickerProps) {
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [tempDate, setTempDate] = useState<Date>(initialDate);

    useEffect(() => {
        if (visible) {
            setTempDate(initialDate);
            setViewMonth(initialDate.getMonth());
            setViewYear(initialDate.getFullYear());
        }
    }, [visible]);

    const bg        = darkMode ? '#1c1c2e' : '#ffffff';
    const surface   = darkMode ? 'rgba(255,255,255,0.06)' : '#f5f6fa';
    const txPrimary = darkMode ? '#ffffff' : '#0f0f1a';
    const txSub     = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const divider   = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    const minDay = useMemo(() => {
        const d = new Date(minimumDate);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [minimumDate]);

    const todayStart = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const daysInMonth  = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
    const firstWeekday = (m: number, y: number) => new Date(y, m, 1).getDay();

    const isDisabled = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        d.setHours(0, 0, 0, 0);
        return d < minDay;
    };

    const isToday = (day: number) =>
        todayStart.getFullYear() === viewYear &&
        todayStart.getMonth()    === viewMonth &&
        todayStart.getDate()     === day;

    const isSelected = (day: number) =>
        tempDate.getFullYear() === viewYear &&
        tempDate.getMonth()    === viewMonth &&
        tempDate.getDate()     === day;

    const prevMonthDisabled = () => {
        const lastOfPrev = new Date(viewYear, viewMonth, 0);
        lastOfPrev.setHours(0, 0, 0, 0);
        return lastOfPrev < minDay;
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleDay = (day: number) => {
        if (isDisabled(day)) return;
        setTempDate(new Date(viewYear, viewMonth, day));
    };

    const total     = daysInMonth(viewMonth, viewYear);
    const startPad  = firstWeekday(viewMonth, viewYear);
    const cells: (number | null)[] = [
        ...Array(startPad).fill(null),
        ...Array.from({ length: total }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={calS.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={[calS.card, { backgroundColor: bg }]}>
                    {/* Month navigation */}
                    <View style={[calS.navRow, { borderBottomColor: divider }]}>
                        <TouchableOpacity
                            onPress={prevMonth}
                            disabled={prevMonthDisabled()}
                            style={[calS.navBtn, { opacity: prevMonthDisabled() ? 0.2 : 1 }]}
                        >
                            <Ionicons name="chevron-back" size={22} color={primaryColor} />
                        </TouchableOpacity>

                        <AppText style={[calS.monthLabel, { color: txPrimary }]}>
                            {CAL_MONTH_NAMES[viewMonth]} {viewYear}
                        </AppText>

                        <TouchableOpacity onPress={nextMonth} style={calS.navBtn}>
                            <Ionicons name="chevron-forward" size={22} color={primaryColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Week headers */}
                    <View style={calS.weekRow}>
                        {CAL_WEEK_LABELS.map((d, i) => (
                            <View key={i} style={calS.weekCell}>
                                <AppText style={[calS.weekText, { color: txSub }]}>{d}</AppText>
                            </View>
                        ))}
                    </View>

                    {/* Day grid */}
                    <View style={calS.grid}>
                        {cells.map((day, idx) => {
                            if (!day) return <View key={`empty-${idx}`} style={calS.dayCell} />;

                            const disabled = isDisabled(day);
                            const selected = isSelected(day);
                            const today    = isToday(day);

                            return (
                                <TouchableOpacity
                                    key={`day-${day}`}
                                    style={calS.dayCell}
                                    onPress={() => handleDay(day)}
                                    disabled={disabled}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        calS.dayCircle,
                                        selected && { backgroundColor: primaryColor },
                                        !selected && today && { borderWidth: 2, borderColor: primaryColor },
                                    ]}>
                                        <AppText style={[
                                            calS.dayText,
                                            { color: disabled
                                                ? (darkMode ? 'rgba(255,255,255,0.18)' : '#d0d0d8')
                                                : selected
                                                    ? '#ffffff'
                                                    : today
                                                        ? primaryColor
                                                        : txPrimary
                                            },
                                            (selected || today) && { fontWeight: '700' },
                                        ]}>
                                            {day}
                                        </AppText>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected date preview */}
                    <View style={[calS.preview, { backgroundColor: surface }]}>
                        <Ionicons name="calendar-outline" size={14} color={primaryColor} />
                        <AppText style={[calS.previewText, { color: txPrimary }]}>
                            {formatDisplayDate(tempDate)}
                        </AppText>
                    </View>

                    {/* Buttons */}
                    <View style={[calS.footer, { borderTopColor: divider }]}>
                        <TouchableOpacity onPress={onClose} style={calS.footerBtn}>
                            <AppText style={[calS.cancelText, { color: txSub }]}>CANCEL</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { onConfirm(tempDate); onClose(); }}
                            style={[calS.footerBtn, calS.okBtnWrap, { backgroundColor: primaryColor }]}
                        >
                            <AppText style={calS.okText}>OK</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const calS = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 24,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabel: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    weekRow: {
        flexDirection: 'row',
        paddingTop: 14,
        paddingBottom: 6,
        paddingHorizontal: 8,
    },
    weekCell: {
        flex: 1,
        alignItems: 'center',
    },
    weekText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.6,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    dayCell: {
        width: `${100 / 7}%` as any,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
    },
    dayCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    previewText: {
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    footerBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    okBtnWrap: {
        minWidth: 72,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    okText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
        color: '#ffffff',
    },
});

// ─────────────────────────────────────────────────────────────
// CLOCK PICKER  (custom analog clock)
// ─────────────────────────────────────────────────────────────

const CLOCK_SIZE   = 260;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const NUM_RADIUS   = 96;

function getClockPos(index: number, total: number, radius: number) {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
        x: CLOCK_CENTER + radius * Math.cos(angle),
        y: CLOCK_CENTER + radius * Math.sin(angle),
    };
}

const HOUR_RING  = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MIN_MARKS  = [
    { label: '00', value: 0 },
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '45', value: 45 },
];

interface ClockPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (time: Date) => void;
    initialTime: Date;
    minimumTime?: Date | null;
    primaryColor: string;
    darkMode: boolean;
}

function ClockPicker({
    visible, onClose, onConfirm,
    initialTime, minimumTime, primaryColor, darkMode,
}: ClockPickerProps) {
    const parse = (t: Date) => ({
        h:  t.getHours() % 12 || 12,
        m:  Math.round(t.getMinutes() / 15) * 15 % 60,
        per: (t.getHours() >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
    });

    const [mode,   setMode]   = useState<'hour' | 'minute'>('hour');
    const [hour,   setHour]   = useState(() => parse(initialTime).h);
    const [minute, setMinute] = useState(() => parse(initialTime).m);
    const [period, setPeriod] = useState<'AM' | 'PM'>(() => parse(initialTime).per);

    useEffect(() => {
        if (visible) {
            const { h, m, per } = parse(initialTime);
            setMode('hour');
            setHour(h);
            setMinute(m);
            setPeriod(per);
        }
    }, [visible]);

    const bg      = darkMode ? '#1c1c2e' : '#ffffff';
    const clockBg = darkMode ? 'rgba(255,255,255,0.07)' : '#f0f3fa';
    const txPri   = darkMode ? '#ffffff' : '#0f0f1a';
    const txSub   = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const divider = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const segBg   = darkMode ? 'rgba(255,255,255,0.1)' : '#eef0f6';

    const to24 = (h: number, p: 'AM' | 'PM') => {
        if (p === 'AM') return h === 12 ? 0  : h;
        return                h === 12 ? 12 : h + 12;
    };

    const selectHour = (h: number) => {
        setHour(h);
        setTimeout(() => setMode('minute'), 160);
    };

    const handleConfirm = () => {
        const result = new Date();
        result.setHours(to24(hour, period), minute, 0, 0);
        onConfirm(result);
        onClose();
    };

    /* Clock hand — drawn as a View centered at the midpoint of the line,
       rotated by atan2(dy, dx). Since the View's transform origin is its
       own center, placing it at the midpoint makes it rotate correctly.  */
    const renderHand = (endX: number, endY: number) => {
        const dx  = endX - CLOCK_CENTER;
        const dy  = endY - CLOCK_CENTER;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
        const cx  = (CLOCK_CENTER + endX) / 2;
        const cy  = (CLOCK_CENTER + endY) / 2;

        return (
            <>
                {/* Shaft */}
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: len,
                        height: 3,
                        backgroundColor: primaryColor,
                        borderRadius: 2,
                        left: cx - len / 2,
                        top: cy - 1.5,
                        transform: [{ rotate: `${ang}deg` }],
                    }}
                />
                {/* Center pin */}
                <View style={[ckS.centerPin, { backgroundColor: primaryColor }]} />
            </>
        );
    };

    // Endpoint for the hand
    const hourIdx  = HOUR_RING.indexOf(hour);           // 0-11
    const handHour = getClockPos(hourIdx, 12, NUM_RADIUS - 4);
    const handMin  = getClockPos(minute / 15, 4, NUM_RADIUS - 4);
    const handEnd  = mode === 'hour' ? handHour : handMin;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={ckS.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={[ckS.card, { backgroundColor: bg }]}>
                    {/* Digital readout */}
                    <View style={ckS.digitalRow}>
                        {/* HH : MM */}
                        <View style={ckS.segRow}>
                            <TouchableOpacity
                                onPress={() => setMode('hour')}
                                style={[ckS.seg, { backgroundColor: mode === 'hour' ? primaryColor : segBg }]}
                            >
                                <AppText style={[ckS.segText, { color: mode === 'hour' ? '#fff' : txPri }]}>
                                    {String(hour).padStart(2, '0')}
                                </AppText>
                            </TouchableOpacity>

                            <AppText style={[ckS.colon, { color: txSub }]}>:</AppText>

                            <TouchableOpacity
                                onPress={() => setMode('minute')}
                                style={[ckS.seg, { backgroundColor: mode === 'minute' ? primaryColor : segBg }]}
                            >
                                <AppText style={[ckS.segText, { color: mode === 'minute' ? '#fff' : txPri }]}>
                                    {String(minute).padStart(2, '0')}
                                </AppText>
                            </TouchableOpacity>
                        </View>

                        {/* AM / PM */}
                        <View style={[ckS.periodWrap, { borderColor: divider }]}>
                            {(['AM', 'PM'] as const).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPeriod(p)}
                                    style={[ckS.periodBtn, period === p && { backgroundColor: primaryColor }]}
                                >
                                    <AppText style={[ckS.periodText, { color: period === p ? '#fff' : txSub }]}>
                                        {p}
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Mode hint */}
                    <AppText style={[ckS.modeHint, { color: txSub }]}>
                        {mode === 'hour' ? 'Select hour' : 'Select minutes'}
                    </AppText>

                    {/* Analog clock face */}
                    <View style={[ckS.clockFace, { backgroundColor: clockBg }]}>
                        {renderHand(handEnd.x, handEnd.y)}

                        {/* Hour numbers */}
                        {mode === 'hour' && HOUR_RING.map((h, i) => {
                            const pos = getClockPos(i, 12, NUM_RADIUS);
                            const sel = h === hour;
                            return (
                                <TouchableOpacity
                                    key={h}
                                    onPress={() => selectHour(h)}
                                    style={[
                                        ckS.numBtn,
                                        { left: pos.x - 20, top: pos.y - 20 },
                                        sel && { backgroundColor: primaryColor },
                                    ]}
                                    activeOpacity={0.75}
                                >
                                    <AppText style={[ckS.numText, {
                                        color: sel ? '#fff' : txPri,
                                        fontWeight: sel ? '700' : '500',
                                    }]}>
                                        {h}
                                    </AppText>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Minute numbers + dot markers */}
                        {mode === 'minute' && (
                            <>
                                {/* Dot ticks at every 5-min position that isn't a labeled minute */}
                                {Array.from({ length: 12 }).map((_, i) => {
                                    if ([0, 3, 6, 9].includes(i)) return null;
                                    const pos = getClockPos(i, 12, NUM_RADIUS);
                                    return (
                                        <View
                                            key={`tick-${i}`}
                                            pointerEvents="none"
                                            style={{
                                                position: 'absolute',
                                                width: 5,
                                                height: 5,
                                                borderRadius: 3,
                                                backgroundColor: darkMode
                                                    ? 'rgba(255,255,255,0.28)'
                                                    : 'rgba(0,0,0,0.22)',
                                                left: pos.x - 2.5,
                                                top:  pos.y - 2.5,
                                            }}
                                        />
                                    );
                                })}

                                {MIN_MARKS.map((mk, i) => {
                                    const pos = getClockPos(i, 4, NUM_RADIUS);
                                    const sel = mk.value === minute;
                                    return (
                                        <TouchableOpacity
                                            key={mk.value}
                                            onPress={() => setMinute(mk.value)}
                                            style={[
                                                ckS.numBtn,
                                                { left: pos.x - 20, top: pos.y - 20 },
                                                sel && { backgroundColor: primaryColor },
                                            ]}
                                            activeOpacity={0.75}
                                        >
                                            <AppText style={[ckS.numText, {
                                                color: sel ? '#fff' : txPri,
                                                fontWeight: sel ? '700' : '500',
                                            }]}>
                                                {mk.label}
                                            </AppText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}
                    </View>

                    {/* Buttons */}
                    <View style={[ckS.footer, { borderTopColor: divider }]}>
                        <TouchableOpacity onPress={onClose} style={ckS.footerBtn}>
                            <AppText style={[ckS.cancelText, { color: txSub }]}>CANCEL</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[ckS.footerBtn, ckS.okBtnWrap, { backgroundColor: primaryColor }]}
                        >
                            <AppText style={ckS.okText}>OK</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const ckS = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 24,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
    },
    digitalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingTop: 24,
        paddingBottom: 6,
        paddingHorizontal: 24,
    },
    segRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seg: {
        width: 66,
        height: 56,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segText: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -1,
    },
    colon: {
        fontSize: 34,
        fontWeight: '700',
        marginBottom: 4,
    },
    periodWrap: {
        borderRadius: 10,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    periodBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
    },
    periodText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modeHint: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
        marginTop: 4,
        marginBottom: 14,
    },
    clockFace: {
        width: CLOCK_SIZE,
        height: CLOCK_SIZE,
        borderRadius: CLOCK_SIZE / 2,
        alignSelf: 'center',
        position: 'relative',
        marginBottom: 20,
    },
    centerPin: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        left: CLOCK_CENTER - 5,
        top:  CLOCK_CENTER - 5,
        zIndex: 10,
    },
    numBtn: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numText: {
        fontSize: 15,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    footerBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    okBtnWrap: {
        minWidth: 72,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    okText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
        color: '#ffffff',
    },
});

// ─────────────────────────────────────────────────────────────
// SCHEDULE SCREEN
// ─────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { push, back, replace } = useAppNavigation();
    const { colors, darkMode } = useThemeContext();

    const [schedule, setSchedule] = useState<Entry[]>([]);
    const [history,  setHistory]  = useState<Entry[]>([]);
    const [busy,     setBusy]     = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Picker visibility
    const [showCalendar, setShowCalendar] = useState(false);
    const [showClock,    setShowClock]    = useState(false);

    // Confirmed selections (null = not yet picked)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);

    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    // Minimum date = today at midnight
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Minimum time = current time + 1 hour if selectedDate is today, else null
    const minTime = useMemo(() => {
        if (!selectedDate) return null;
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        if (sel.getTime() !== today.getTime()) return null;
        const mt = new Date();
        mt.setHours(mt.getHours() + 1, 0, 0, 0);
        return mt;
    }, [selectedDate, today]);

    // Default initial time for clock (next clean 15-min slot from now + 1h)
    const defaultClockTime = useMemo(() => {
        const t = selectedTime ?? (() => {
            const base = new Date();
            base.setHours(base.getHours() + 1, 0, 0, 0);
            return base;
        })();
        return t;
    }, [selectedTime]);

    // Design tokens
    const cardBg      = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
    const cardBorder  = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const textPrimary = darkMode ? '#ffffff' : colors.text;
    const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
    const dividerColor  = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    // ── Supabase operations ──────────────────────────────────

    const fetchSchedule = useCallback(async () => {
        setBusy(true);
        setLoadingMessage('Syncing schedule from robot...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('schedules')
                .select('id, day, time, enabled')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setSchedule(data || []);
        } catch (err: any) {
            console.error('[ScheduleScreen] Sync failed:', err);
            Alert.alert('Sync Error', 'Unable to fetch schedule from robot.');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    const addSchedule = useCallback(async () => {
        if (!selectedDate || !selectedTime) {
            Alert.alert('Missing Information', 'Please select both a date and time.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBusy(true);
        setLoadingMessage('Adding routine to robot...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');

            const dayStr  = formatDisplayDate(selectedDate);
            const timeStr = formatDisplayTime(selectedTime);

            const { data: inserted, error } = await supabase
                .from('schedules')
                .insert({ user_id: user.id, day: dayStr, time: timeStr, enabled: true })
                .select('id, day, time, enabled')
                .single();

            if (error) throw error;

            setSchedule(prev => [...prev, inserted]);
            setSelectedDate(null);
            setSelectedTime(null);

            Alert.alert('Success', 'Routine added! Robot will adapt using sensors & cameras.');
        } catch (err: any) {
            console.error('[ScheduleScreen] Add failed:', err);
            Alert.alert('Error', err.message || 'Failed to add routine.');
        } finally {
            setBusy(false);
        }
    }, [selectedDate, selectedTime]);

    const toggleRoutine = useCallback(async (id: string) => {
        Haptics.selectionAsync();
        const item = schedule.find(s => s.id === id);
        if (!item) return;

        const newEnabled = !item.enabled;
        setSchedule(schedule.map(s => s.id === id ? { ...s, enabled: newEnabled } : s));

        try {
            const { error } = await supabase.from('schedules').update({ enabled: newEnabled }).eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            console.error('[ScheduleScreen] Toggle failed:', err);
            setSchedule(schedule);
            Alert.alert('Error', 'Failed to update routine.');
        }
    }, [schedule]);

    const deleteRoutine = useCallback(async (id: string) => {
        const itemToDelete = schedule.find(item => item.id === id);
        if (!itemToDelete) return;

        Alert.alert('Delete Routine', 'Remove this scheduled time?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setBusy(true);
                    setLoadingMessage('Deleting routine...');
                    try {
                        const { error } = await supabase.from('schedules').delete().eq('id', id);
                        if (error) throw error;
                        setHistory(prev => [...prev, { ...itemToDelete, enabled: false }]);
                        setSchedule(prev => prev.filter(item => item.id !== id));
                        Alert.alert('Success', 'Routine deleted successfully');
                    } catch (err: any) {
                        console.error('[ScheduleScreen] Delete failed:', err);
                        Alert.alert('Error', 'Failed to delete routine.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }, [schedule]);

    const clearAllSchedules = useCallback(async () => {
        if (schedule.length === 0) return;
        Alert.alert('Reset All', 'Clear every scheduled routine?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All', style: 'destructive',
                onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setBusy(true);
                    setLoadingMessage('Clearing all routines...');
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user?.id) throw new Error('Not authenticated');
                        const { error } = await supabase.from('schedules').delete().eq('user_id', user.id);
                        if (error) throw error;
                        setHistory(prev => [...prev, ...schedule.map(s => ({ ...s, enabled: false }))]);
                        setSchedule([]);
                        Alert.alert('Success', 'All routines cleared successfully');
                    } catch (err: any) {
                        console.error('[ScheduleScreen] Clear all failed:', err);
                        Alert.alert('Error', 'Failed to clear routines.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }, [schedule]);

    const nextRoutine = useMemo(() => {
        const enabled = schedule.filter(s => s.enabled);
        return enabled.length > 0 ? enabled[0] : null;
    }, [schedule]);

    const stats = useMemo(() => ({
        total:   schedule.length,
        active:  schedule.filter(s => s.enabled).length,
        history: history.length,
    }), [schedule, history]);

    const readyToAdd = !!selectedDate && !!selectedTime;

    if (busy) return <Loader message={loadingMessage} />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.wrapper, isLargeScreen && styles.largeWrapper]}>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <AppText style={[styles.headerTitle, { color: textPrimary }]}>Cleaning Schedule</AppText>
                        <AppText style={[styles.headerSubtitle, { color: textSecondary }]}>Time-based adaptive routines</AppText>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsGrid}>
                        {[
                            { icon: 'calendar' as const,          color: colors.primary, value: stats.total,   label: 'Total'   },
                            { icon: 'checkmark-circle' as const,  color: '#10B981',      value: stats.active,  label: 'Active'  },
                            { icon: 'time' as const,              color: '#8B5CF6',      value: stats.history, label: 'History' },
                        ].map(s => (
                            <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <View style={[styles.statIconContainer, { backgroundColor: `${s.color}20` }]}>
                                    <Ionicons name={s.icon} size={24} color={s.color} />
                                </View>
                                <AppText style={[styles.statValue, { color: s.color }]}>{s.value}</AppText>
                                <AppText style={[styles.statLabel, { color: textSecondary }]}>{s.label}</AppText>
                            </View>
                        ))}
                    </View>

                    {/* Next routine banner */}
                    {nextRoutine && (
                        <View style={[styles.nextRoutineCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                            <View style={styles.nextRoutineHeader}>
                                <View style={[styles.pulseIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="flash" size={20} color="#fff" />
                                </View>
                                <AppText style={[styles.nextRoutineTitle, { color: colors.primary }]}>Next Routine</AppText>
                            </View>
                            <View style={styles.nextRoutineContent}>
                                <View style={styles.nextRoutineInfo}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                    <AppText style={[styles.nextRoutineDay, { color: textPrimary }]}>{nextRoutine.day}</AppText>
                                </View>
                                <View style={styles.nextRoutineInfo}>
                                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                                    <AppText style={[styles.nextRoutineTime, { color: textPrimary }]}>{nextRoutine.time}</AppText>
                                </View>
                            </View>
                            <AppText style={[styles.nextRoutineNote, { color: textSecondary }]}>
                                Robot adapts to environment using sensors & cameras
                            </AppText>
                        </View>
                    )}

                    {/* Sync */}
                    <Button title="Sync from Robot" icon="sync-outline" onPress={fetchSchedule} variant="outline" style={styles.syncButton} />

                    {/* ── Add New Routine ── */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="add-circle" size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>Add New Routine</AppText>
                            </View>
                        </View>

                        <View style={styles.pickerGroup}>
                            {/* Date row */}
                            <TouchableOpacity
                                style={[
                                    styles.pickerRow,
                                    { borderColor: selectedDate ? colors.primary : cardBorder,
                                      backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#f7f8fc' }
                                ]}
                                onPress={() => setShowCalendar(true)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pickerIconWrap, { backgroundColor: selectedDate ? `${colors.primary}20` : `${textSecondary}12` }]}>
                                    <Ionicons name="calendar-outline" size={20} color={selectedDate ? colors.primary : textSecondary} />
                                </View>
                                <View style={styles.pickerMeta}>
                                    <AppText style={[styles.pickerCaption, { color: textSecondary }]}>Date</AppText>
                                    <AppText style={[styles.pickerVal, { color: selectedDate ? textPrimary : textSecondary }]}>
                                        {selectedDate ? formatDisplayDate(selectedDate) : 'Tap to select date'}
                                    </AppText>
                                </View>
                                {selectedDate
                                    ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                    : <Ionicons name="chevron-forward"  size={16} color={textSecondary} />
                                }
                            </TouchableOpacity>

                            {/* Time row */}
                            <TouchableOpacity
                                style={[
                                    styles.pickerRow,
                                    { borderColor: selectedTime ? colors.primary : cardBorder,
                                      backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#f7f8fc' }
                                ]}
                                onPress={() => setShowClock(true)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pickerIconWrap, { backgroundColor: selectedTime ? `${colors.primary}20` : `${textSecondary}12` }]}>
                                    <Ionicons name="time-outline" size={20} color={selectedTime ? colors.primary : textSecondary} />
                                </View>
                                <View style={styles.pickerMeta}>
                                    <AppText style={[styles.pickerCaption, { color: textSecondary }]}>Time</AppText>
                                    <AppText style={[styles.pickerVal, { color: selectedTime ? textPrimary : textSecondary }]}>
                                        {selectedTime ? formatDisplayTime(selectedTime) : 'Tap to select time'}
                                    </AppText>
                                </View>
                                {selectedTime
                                    ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                    : <Ionicons name="chevron-forward"  size={16} color={textSecondary} />
                                }
                            </TouchableOpacity>
                        </View>

                        <Button
                            title="Add Routine"
                            icon="add-outline"
                            onPress={addSchedule}
                            disabled={!readyToAdd}
                            variant={readyToAdd ? 'primary' : 'disabled'}
                        />
                    </View>

                    {/* Active list */}
                    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="list" size={20} color={colors.primary} />
                                <AppText style={[styles.sectionTitle, { color: textPrimary }]}>Active Routines</AppText>
                            </View>
                            {schedule.length > 0 && (
                                <TouchableOpacity onPress={clearAllSchedules} activeOpacity={0.7}>
                                    <AppText style={[styles.clearAllText, { color: '#EF4444' }]}>Clear All</AppText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {schedule.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color={textSecondary} style={{ opacity: 0.3 }} />
                                <AppText style={[styles.emptyText, { color: textSecondary }]}>No routines yet</AppText>
                                <AppText style={[styles.emptySubtext, { color: textSecondary }]}>
                                    Add a time-based routine — robot adapts automatically
                                </AppText>
                            </View>
                        ) : (
                            <FlatList
                                data={schedule}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                                renderItem={({ item, index }) => (
                                    <View style={[
                                        styles.routineItem,
                                        index < schedule.length - 1 && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                                    ]}>
                                        <TouchableOpacity onPress={() => toggleRoutine(item.id)} style={styles.routineToggle} activeOpacity={0.7}>
                                            <View style={[styles.checkbox, {
                                                borderColor: item.enabled ? colors.primary : cardBorder,
                                                backgroundColor: item.enabled ? colors.primary : 'transparent',
                                            }]}>
                                                {item.enabled && <Ionicons name="checkmark" size={16} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>

                                        <View style={[styles.routineContent, { opacity: item.enabled ? 1 : 0.5 }]}>
                                            <AppText style={[styles.routineDay, { color: textPrimary }]}>{item.day}</AppText>
                                            <View style={styles.routineTimeContainer}>
                                                <Ionicons name="time-outline" size={14} color={textSecondary} />
                                                <AppText style={[styles.routineTime, { color: textSecondary }]}>{item.time}</AppText>
                                            </View>
                                        </View>

                                        <TouchableOpacity onPress={() => deleteRoutine(item.id)} style={styles.deleteButton} activeOpacity={0.7}>
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>

                    {/* History */}
                    {history.length > 0 && (
                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleContainer}>
                                    <Ionicons name="archive" size={20} color={colors.primary} />
                                    <AppText style={[styles.sectionTitle, { color: textPrimary }]}>History</AppText>
                                </View>
                                <AppText style={[styles.historyCount, { color: textSecondary }]}>{history.length} entries</AppText>
                            </View>
                            <FlatList
                                data={history.slice(-5).reverse()}
                                keyExtractor={(item, idx) => `${item.id}-${idx}`}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <View style={styles.historyItem}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        <View style={styles.historyContent}>
                                            <AppText style={[styles.historyDay, { color: textPrimary }]}>{item.day}</AppText>
                                            <AppText style={[styles.historyTime, { color: textSecondary }]}>{item.time}</AppText>
                                        </View>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    {/* Tip */}
                    <View style={[styles.tipBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                        <Ionicons name="bulb" size={20} color={colors.primary} />
                        <AppText style={[styles.tipText, { color: textPrimary }]}>
                            Routines are time-based — robot uses sensors & cameras to intelligently adapt to any environment.
                        </AppText>
                    </View>

                    {/* Quick links */}
                    <View style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.actionsHeader}>
                            <AppText style={[styles.actionsTitle, { color: textPrimary }]}>Quick Links</AppText>
                        </View>
                        <View style={styles.actionsGrid}>
                            {[
                                { icon: 'grid-outline' as const,            label: 'Dashboard', route: '/(tabs)/01_DashboardScreen', color: '#6366f1' },
                                { icon: 'game-controller-outline' as const,  label: 'Control',   route: '/(tabs)/02_ControlScreen',   color: '#10B981' },
                                { icon: 'map-outline' as const,              label: 'Map',       route: '/(tabs)/03_MapScreen',       color: '#14b8a6' },
                            ].map(item => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[styles.actionTile, {
                                        backgroundColor: `${item.color}${darkMode ? '1a' : '12'}`,
                                        borderColor: `${item.color}30`,
                                    }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        push(item.route as any);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={24} color={item.color} />
                                    <AppText style={[styles.actionLabel, { color: textPrimary }]}>{item.label}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <AppText style={[styles.footer, { color: textSecondary }]}>
                    Version 1.0.0 • Smart Cleaner Pro © 2026
                </AppText>
            </ScrollView>

            {/* ── Custom pickers ── */}
            <CalendarPicker
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
                onConfirm={date => setSelectedDate(date)}
                initialDate={selectedDate ?? today}
                minimumDate={today}
                primaryColor={colors.primary}
                darkMode={darkMode}
            />

            <ClockPicker
                visible={showClock}
                onClose={() => setShowClock(false)}
                onConfirm={time => setSelectedTime(time)}
                initialTime={defaultClockTime}
                minimumTime={minTime}
                primaryColor={colors.primary}
                darkMode={darkMode}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────
// SCHEDULE SCREEN STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 80,
    },
    scrollContentLarge: { alignItems: 'center' },

    wrapper:      { width: '100%' },
    largeWrapper: { maxWidth: 480 },

    headerSection: { marginBottom: 32 },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.1,
    },

    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    statLabel: { fontSize: 12, fontWeight: '600' },

    nextRoutineCard: { borderRadius: 24, padding: 24, borderWidth: 1, marginBottom: 20 },
    nextRoutineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    pulseIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    nextRoutineTitle: { fontSize: 16, fontWeight: '700' },
    nextRoutineContent: { gap: 12 },
    nextRoutineInfo:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nextRoutineDay:   { fontSize: 18, fontWeight: '600' },
    nextRoutineTime:  { fontSize: 16, fontWeight: '500' },
    nextRoutineNote:  { marginTop: 12, fontSize: 13, textAlign: 'center' },

    syncButton: { marginBottom: 20 },

    sectionCard: { borderRadius: 24, padding: 24, borderWidth: 1, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    clearAllText: { fontSize: 14, fontWeight: '600' },

    // Picker rows
    pickerGroup: { gap: 12, marginBottom: 16 },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    pickerIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerMeta: { flex: 1, gap: 2 },
    pickerCaption: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7 },
    pickerVal:     { fontSize: 15, fontWeight: '500' },

    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText:    { fontSize: 16, fontWeight: '500', marginTop: 8 },
    emptySubtext: { fontSize: 14, textAlign: 'center' },

    routineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
    routineToggle: { padding: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    routineContent: { flex: 1, gap: 4 },
    routineDay: { fontSize: 16, fontWeight: '600' },
    routineTimeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    routineTime: { fontSize: 14 },
    deleteButton: { padding: 8 },

    historyCount: { fontSize: 14, fontWeight: '500' },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    historyContent: { flex: 1 },
    historyDay:  { fontSize: 15, fontWeight: '500', marginBottom: 2 },
    historyTime: { fontSize: 13 },

    tipBox: { borderRadius: 12, padding: 16, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 24 },
    tipText: { flex: 1, fontSize: 14, lineHeight: 20 },

    actionsCard:   { borderRadius: 24, padding: 24, borderWidth: 1, marginBottom: 20 },
    actionsHeader: { marginBottom: 16 },
    actionsTitle:  { fontSize: 18, fontWeight: '700' },
    actionsGrid:   { flexDirection: 'row', gap: 12 },
    actionTile: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    actionLabel: { fontSize: 13, fontWeight: '600' },

    footer: { textAlign: 'center', marginTop: 32, fontSize: 12.5, opacity: 0.65, letterSpacing: 0.3 },
});
