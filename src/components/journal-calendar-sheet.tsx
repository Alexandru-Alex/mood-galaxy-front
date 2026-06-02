import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  loadedDates: Set<string>;
};

const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];
const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0 Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

export function JournalCalendarSheet({ visible, onClose, onDateSelect, loadedDates }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const sheetAnim = useRef(new RNAnimated.Value(400)).current;

  useEffect(() => {
    if (!visible) return;
    backdropAnim.setValue(0);
    sheetAnim.setValue(400);
    RNAnimated.parallel([
      RNAnimated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start();
  }, [visible]);

  const close = useCallback(() => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      RNAnimated.timing(sheetAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      backdropAnim.setValue(0);
      sheetAnim.setValue(400);
      onClose();
    });
  }, [backdropAnim, sheetAnim, onClose]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (dateStr: string) => {
    // Dismiss immediately (no animation) so the next action renders cleanly
    backdropAnim.setValue(0);
    sheetAnim.setValue(400);
    onClose();
    onDateSelect(dateStr);
  };

  const today = new Date().toISOString().slice(0, 10);
  const grid = getMonthGrid(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </RNAnimated.View>
      <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={Palette.brightLavender} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={12}>
            <Ionicons name="chevron-forward" size={20} color={Palette.brightLavender} />
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {DAY_NAMES.map((d, i) => (
            <Text key={`dn-${i}`} style={styles.dayName}>{d}</Text>
          ))}
          {grid.map((day, i) => {
            if (day === null) return <View key={`empty-${i}`} style={styles.cell} />;
            const mm = String(viewMonth + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateStr = `${viewYear}-${mm}-${dd}`;
            const hasEntry = loadedDates.has(dateStr);
            const isToday = dateStr === today;
            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.cell, isToday && styles.todayCell]}
                onPress={() => handleDayPress(dateStr)}
              >
                <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                {hasEntry && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </RNAnimated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#12102A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: Spacing.four,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.brightLavender,
    opacity: 0.4,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayName: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  cell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  todayCell: {
    backgroundColor: Palette.majorelleBlue + '33',
    borderRadius: 8,
  },
  dayNum: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  todayNum: {
    color: Palette.brightLavender,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.brightLavender,
    marginTop: 2,
  },
});
