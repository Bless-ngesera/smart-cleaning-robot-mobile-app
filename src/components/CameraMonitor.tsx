// src/components/CameraMonitor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '@/src/services/supabase';
import AppText from './AppText';
import { useThemeContext } from '@/src/context/ThemeContext';

interface CameraData {
  camera_status?: string | null;
  camera_fps?: number | null;
  frames_captured?: number | null;
  dirt_detected?: boolean | null;
  dirt_confidence?: number | null;
  camera_brightness?: number | null;
  last_updated?: string | null;
}

interface Props {
  robotId: string | null;
}

function statusDotColor(status: string | null | undefined): string {
  switch (status) {
    case 'READY':      return '#22c55e';
    case 'CAPTURING':  return '#3b82f6';
    case 'PROCESSING': return '#f59e0b';
    case 'FAILED':     return '#ef4444';
    default:           return '#94a3b8';
  }
}

function confidenceBarColor(pct: number): string {
  if (pct > 70) return '#ef4444';
  if (pct > 40) return '#f59e0b';
  return '#22c55e';
}

export default function CameraMonitor({ robotId }: Props) {
  const { colors, darkMode } = useThemeContext();
  const [data, setData] = useState<CameraData | null>(null);
  const [isStale, setIsStale] = useState(false);

  const cardBg       = darkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const cardBorder   = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const textPrimary  = darkMode ? '#ffffff' : colors.text;
  const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.60)';
  const dividerColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const trackColor   = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const markStale = (lastUpdated?: string | null) => {
    if (!lastUpdated) { setIsStale(false); return; }
    setIsStale(Date.now() - new Date(lastUpdated).getTime() > 10000);
  };

  const fetchData = useCallback(async () => {
    if (!robotId) return;
    const { data: row } = await supabase
      .from('robot_status')
      .select('camera_status, camera_fps, frames_captured, dirt_detected, dirt_confidence, camera_brightness, last_updated')
      .eq('robot_id', robotId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) { setData(row); markStale(row.last_updated); }
  }, [robotId]);

  useEffect(() => {
    if (!robotId) return;
    fetchData();

    const channel = supabase
      .channel(`camera-monitor-${robotId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'robot_status',
        filter: `robot_id=eq.${robotId}`,
      }, (payload) => {
        const row = payload.new as CameraData;
        setData(row);
        markStale(row.last_updated);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [robotId, fetchData]);

  // Derived display states
  const noRobot      = !robotId;
  const noData       = !!robotId && data === null;
  const camOffline   = data !== null && (!data.camera_status || data.camera_status === 'OFFLINE');
  const camFailed    = data?.camera_status === 'FAILED';
  const showData     = !noRobot && !noData && !camOffline;
  const confidence   = data?.dirt_confidence ?? 0;
  const dotColor     = statusDotColor(data?.camera_status);

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>

      {/* Header */}
      <View style={styles.header}>
        <AppText style={styles.headerIcon}>📷</AppText>
        <AppText style={[styles.title, { color: textPrimary }]}>Camera Monitor</AppText>
        {isStale && showData && (
          <View style={styles.staleBadge}>
            <AppText style={styles.staleText}>Stale</AppText>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* Offline / no-robot */}
      {(noRobot || camOffline) && (
        <AppText style={[styles.centeredMsg, { color: textSecondary }]}>Camera Offline</AppText>
      )}

      {/* Loading / initializing */}
      {noData && (
        <AppText style={[styles.centeredMsg, { color: textSecondary }]}>Initializing...</AppText>
      )}

      {/* Main data */}
      {showData && (
        <>
          {/* Status */}
          <View style={styles.row}>
            <AppText style={[styles.label, { color: textSecondary }]}>Status</AppText>
            <View style={styles.statusRight}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <AppText style={[styles.value, { color: textPrimary }]}>
                {data?.camera_status ?? '—'}
              </AppText>
            </View>
          </View>

          {camFailed && (
            <View style={styles.errorBox}>
              <AppText style={styles.errorText}>
                Camera error — check hardware connection
              </AppText>
            </View>
          )}

          {/* FPS */}
          <View style={styles.row}>
            <AppText style={[styles.label, { color: textSecondary }]}>FPS</AppText>
            <AppText style={[styles.value, { color: textPrimary }]}>
              {data?.camera_fps != null ? data.camera_fps.toFixed(1) : '—'}
            </AppText>
          </View>

          {/* Frames */}
          <View style={styles.row}>
            <AppText style={[styles.label, { color: textSecondary }]}>Frames Captured</AppText>
            <AppText style={[styles.value, { color: textPrimary }]}>
              {data?.frames_captured ?? '—'}
            </AppText>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Dirt detection */}
          <View style={styles.row}>
            <AppText style={styles.rowIcon}>🧹</AppText>
            <AppText style={[styles.label, { color: textSecondary, marginLeft: 6 }]}>
              Dirt Detected
            </AppText>
            <AppText style={[styles.value, { color: data?.dirt_detected ? '#ef4444' : '#22c55e' }]}>
              {data?.dirt_detected ? 'YES' : 'NO'}
            </AppText>
          </View>

          {/* Confidence */}
          <View style={styles.confidenceBlock}>
            <View style={styles.row}>
              <AppText style={[styles.label, { color: textSecondary }]}>Confidence</AppText>
              <AppText style={[styles.value, { color: textPrimary }]}>{confidence}%</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${confidence}%` as any,
                    backgroundColor: confidenceBarColor(confidence),
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Brightness */}
          <View style={[styles.row, styles.lastRow]}>
            <AppText style={[styles.label, { color: textSecondary }]}>Brightness</AppText>
            <AppText style={[styles.value, { color: textPrimary }]}>
              {data?.camera_brightness ?? '—'} / 255
            </AppText>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { fontSize: 20 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginLeft: 10, flex: 1 },
  staleBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  staleText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16 },
  centeredMsg: { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  lastRow: { marginBottom: 0 },
  rowIcon: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '500', flex: 1 },
  value: { fontSize: 14, fontWeight: '600' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  confidenceBlock: { marginBottom: 0 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
