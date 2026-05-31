import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, G } from 'react-native-svg';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { colors } from '../theme';
import { getWorkoutWithExercises } from '../lib/workouts';

type WorkoutWithExercises = Awaited<ReturnType<typeof getWorkoutWithExercises>>;

const MONTHLY_TARGET = 12;
const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'] as const;
const RANGE_OPTIONS = ['1W', '1M', '3M', '6M', '1Y'] as const;

type MuscleGroup = typeof MUSCLE_GROUPS[number];
type RangeOption = typeof RANGE_OPTIONS[number];
type TrendDirection = 'up' | 'down' | 'stable';
type VolumeChartPoint = {
    key: string;
    label: string;
    value: number;
};
type VolumeChart = {
    labels: string[];
    datasets: Array<{
        data: number[];
        color: (opacity?: number) => string;
        strokeWidth: number;
    }>;
    points: VolumeChartPoint[];
    trendDirection: TrendDirection;
};

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
    Chest: colors.accent,
    Back: '#38BDF8',
    Legs: '#F59E0B',
    Shoulders: '#A78BFA',
    Arms: '#F472B6',
};

const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: colors.card,
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => `rgba(132, 204, 22, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    strokeWidth: 3,
    decimalPlaces: 0,
    fillShadowGradient: colors.accent,
    fillShadowGradientOpacity: 0.22,
    propsForBackgroundLines: {
        stroke: '#262626',
        strokeDasharray: '',
    },
    propsForDots: {
        r: '3',
        strokeWidth: '2',
        stroke: '#111111',
    },
};

export default function StatsScreen() {
    const { width } = useWindowDimensions();
    const [workouts, setWorkouts] = useState<WorkoutWithExercises>([]);
    const [selectedRange, setSelectedRange] = useState<RangeOption>('1M');
    const chartWidth = Math.max(width - 72, 280);

    const loadStats = useCallback(async () => {
        try {
            setWorkouts(await getWorkoutWithExercises());
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    const stats = useMemo(() => {
        const workoutsThisMonth = workouts.filter((workout) => isInCurrentMonth(workout.date)).length;
        const currentMonthVolume = getVolumeForMonth(workouts, 0);
        const lastMonthVolume = getVolumeForMonth(workouts, -1);
        const allExercises = workouts.flatMap((workout) => workout.exercises);
        const totalVolume = workouts.reduce(
            (total, workout) => total + getWorkoutVolume(workout.exercises),
            0
        );
        const favoriteExercise = getFavoriteExercise(allExercises);
        const muscleDistribution = getMuscleDistribution(allExercises);
        const volumeChart = buildVolumeChart(workouts, selectedRange);
        const volumeChangePercent = lastMonthVolume > 0
            ? ((currentMonthVolume - lastMonthVolume) / lastMonthVolume) * 100
            : null;

        return {
            workoutsThisMonth,
            totalWorkouts: workouts.length,
            avgExercises: workouts.length ? (allExercises.length / workouts.length).toFixed(1) : '0.0',
            favoriteExercise,
            totalVolume,
            volumeChangePercent,
            volumeChart,
            muscleDistribution,
            progress: MONTHLY_TARGET ? Math.min(workoutsThisMonth / MONTHLY_TARGET, 1) : 0,
        };
    }, [selectedRange, workouts]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Progress</Text>

                <View style={styles.timelineSelector}>
                    {RANGE_OPTIONS.map((option) => {
                        const isSelected = selectedRange === option;

                        return (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.timelineOption,
                                    isSelected && styles.timelineOptionActive,
                                ]}
                                onPress={() => setSelectedRange(option)}
                            >
                                <Text
                                    style={[
                                        styles.timelineOptionText,
                                        isSelected && styles.timelineOptionTextActive,
                                    ]}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Card style={styles.volumeCard}>
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={styles.cardEyebrow}>Workout Volume</Text>
                            <Text style={styles.volumeValue}>{formatCompactNumber(stats.totalVolume)} kg</Text>
                        </View>
                        <View style={styles.volumeIcon}>
                            <Ionicons name="trending-up" size={24} color={colors.bg} />
                        </View>
                    </View>
                    <Text style={styles.volumeSubtitle}>
                        {formatVolumeChange(stats.volumeChangePercent)}
                    </Text>
                    <View style={styles.trendRow}>
                        <Ionicons
                            name={getTrendIcon(stats.volumeChart.trendDirection)}
                            size={16}
                            color={getTrendColor(stats.volumeChart.trendDirection)}
                        />
                        <Text style={[styles.trendText, { color: getTrendColor(stats.volumeChart.trendDirection) }]}>
                            {formatTrendLabel(stats.volumeChart.trendDirection)}
                        </Text>
                    </View>
                    <LineChart
                        data={stats.volumeChart}
                        width={chartWidth}
                        height={220}
                        bezier
                        withDots
                        withShadow
                        withInnerLines={false}
                        withOuterLines={false}
                        withVerticalLines={false}
                        withHorizontalLines
                        fromZero
                        segments={4}
                        chartConfig={chartConfig}
                        style={styles.lineChart}
                        getDotColor={(_, index) =>
                            index === stats.volumeChart.datasets[0].data.length - 1 ? '#FFFFFF' : colors.accent
                        }
                        getDotProps={(_, index) => ({
                            r: index === stats.volumeChart.datasets[0].data.length - 1 ? '5' : '3',
                            strokeWidth: index === stats.volumeChart.datasets[0].data.length - 1 ? '3' : '2',
                            stroke: index === stats.volumeChart.datasets[0].data.length - 1 ? colors.accent : '#111111',
                        })}
                        formatYLabel={(value) => `${formatCompactNumber(Number(value))}kg`}
                    />
                    <Text style={styles.chartHint}>{getRangeHint(selectedRange)}</Text>
                </Card>

                <Card style={styles.muscleCard}>
                    <Text style={styles.sectionTitle}>Muscle Distribution</Text>
                    <Text style={styles.sectionSubtitle}>Based on exercise names in your workout history.</Text>
                    <MuscleDonutChart distribution={stats.muscleDistribution} />
                </Card>

                <View style={styles.metricGrid}>
                    <MetricCard
                        icon="barbell"
                        label="Total Workouts"
                        value={String(stats.totalWorkouts)}
                    />
                    <MetricCard
                        icon="list"
                        label="Avg Exercises"
                        value={stats.avgExercises}
                    />
                    <MetricCard
                        icon="flash"
                        label="Total Volume"
                        value={`${formatCompactNumber(stats.totalVolume)} kg`}
                    />
                    <MetricCard
                        icon="flame"
                        label="Favorite"
                        value={truncateText(stats.favoriteExercise, 14)}
                    />
                </View>

                <Card style={styles.motivationCard}>
                    <View style={styles.motivationRow}>
                        <Ionicons name="flame" size={20} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.motivationText}>
                            You completed {stats.workoutsThisMonth} / {MONTHLY_TARGET} workouts this month
                        </Text>
                    </View>
                    <ProgressBar
                        progress={stats.progress}
                        target={MONTHLY_TARGET}
                        label={`Target progress: ${stats.workoutsThisMonth}/${MONTHLY_TARGET}`}
                    />
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

function MuscleDonutChart({ distribution }: { distribution: Record<MuscleGroup, number> }) {
    const radius = 42;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const gapLength = 3;
    const total = getMuscleTotal(distribution);
    let offset = 0;

    return (
        <View style={styles.muscleChartRow}>
            <View style={styles.donutWrap}>
                <Svg width={116} height={116} viewBox="0 0 116 116">
                    <G rotation="-90" origin="58, 58">
                        <Circle
                            cx="58"
                            cy="58"
                            r={radius}
                            stroke="#2A2A2A"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {MUSCLE_GROUPS.map((group) => {
                            const value = distribution[group];

                            if (value <= 0 || total === 0) {
                                return null;
                            }

                            const segmentLength = Math.max((value / total) * circumference - gapLength, 0);
                            const dashOffset = -offset;
                            offset += (value / total) * circumference;

                            return (
                                <Circle
                                    key={group}
                                    cx="58"
                                    cy="58"
                                    r={radius}
                                    stroke={MUSCLE_COLORS[group]}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="butt"
                                    fill="transparent"
                                />
                            );
                        })}
                    </G>
                </Svg>
            </View>

            <View style={styles.muscleLegend}>
                {MUSCLE_GROUPS.map((group) => (
                    <View key={group} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: MUSCLE_COLORS[group] }]} />
                        <Text style={styles.legendLabel}>{group}</Text>
                        <Text style={styles.legendPercent}>{getMusclePercentage(distribution, group)}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function MetricCard({
    icon,
    label,
    value,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
}) {
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
                <Ionicons name={icon} size={18} color={colors.accent} />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function getMuscleTotal(distribution: Record<MuscleGroup, number>) {
    return Object.values(distribution).reduce((total, count) => total + count, 0);
}

function getMusclePercentage(distribution: Record<MuscleGroup, number>, group: MuscleGroup) {
    const total = getMuscleTotal(distribution);

    if (total === 0) {
        return 0;
    }

    return Math.round((distribution[group] / total) * 100);
}

function isInCurrentMonth(dateString: string) {
    const now = new Date();
    const target = new Date(`${dateString}T12:00:00`);

    return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
}

function getVolumeForMonth(workouts: WorkoutWithExercises, monthOffset: number) {
    const targetMonth = new Date();
    targetMonth.setMonth(targetMonth.getMonth() + monthOffset);

    return workouts
        .filter((workout) => isInMonth(workout.date, targetMonth))
        .reduce((total, workout) => total + getWorkoutVolume(workout.exercises), 0);
}

function buildVolumeChart(workouts: WorkoutWithExercises, selectedRange: RangeOption): VolumeChart {
    const dayCount = getRangeDayCount(selectedRange);
    const dates = buildDateRange(dayCount);
    const volumeByDate = dates.reduce<Record<string, number>>((accumulator, date) => {
        accumulator[toDateKey(date)] = 0;
        return accumulator;
    }, {});

    workouts.forEach((workout) => {
        const workoutKey = normalizeDateKey(workout.date);

        if (workoutKey in volumeByDate) {
            volumeByDate[workoutKey] += getWorkoutVolume(workout.exercises);
        }
    });

    const points = dates.map((date, index) => {
        const key = toDateKey(date);

        return {
            key,
            label: getChartLabel(date, index, selectedRange),
            value: volumeByDate[key] ?? 0,
        };
    });
    const data = points.map((point) => point.value);

    return {
        labels: points.map((point) => point.label),
        datasets: [
            {
                data,
                color: (opacity = 1) => `rgba(132, 204, 22, ${opacity})`,
                strokeWidth: 3,
            },
        ],
        points,
        trendDirection: getTrendDirection(data),
    };
}

function getRangeDayCount(range: RangeOption) {
    switch (range) {
        case '1W':
            return 7;
        case '1M':
            return 30;
        case '3M':
            return 90;
        case '6M':
            return 180;
        case '1Y':
            return 365;
    }
}

function buildDateRange(dayCount: number) {
    return Array.from({ length: dayCount }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (dayCount - 1 - index));
        return date;
    });
}

function getChartLabel(date: Date, index: number, range: RangeOption) {
    if (range === '1W') {
        return formatDateLabel(date);
    }

    if (range === '1M') {
        return index % 5 === 0 ? formatDateLabel(date) : '';
    }

    if (range === '3M') {
        return index % 10 === 0 ? formatDateLabel(date) : '';
    }

    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);

    return date.getMonth() !== previous.getMonth() || index === 0 ? formatMonthLabel(date) : '';
}

function getTrendDirection(data: number[]): TrendDirection {
    const first = data[0] ?? 0;
    const last = data[data.length - 1] ?? 0;

    if (last > first) {
        return 'up';
    }

    if (last < first) {
        return 'down';
    }

    return 'stable';
}

function isInMonth(dateString: string, month: Date) {
    const target = parseWorkoutDate(dateString);

    return target.getFullYear() === month.getFullYear() && target.getMonth() === month.getMonth();
}

function parseWorkoutDate(dateString: string) {
    return new Date(`${dateString}T12:00:00`);
}

function normalizeDateKey(dateString: string) {
    const date = parseWorkoutDate(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString.slice(0, 10);
    }

    return toDateKey(date);
}

function toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function formatMonthLabel(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short' });
}

function getRangeHint(range: RangeOption) {
    switch (range) {
        case '1W':
            return 'Daily completed volume over the last 7 days';
        case '1M':
            return 'Daily completed volume over the last 30 days';
        case '3M':
            return 'Daily completed volume over the last 90 days';
        case '6M':
            return 'Daily completed volume over the last 180 days';
        case '1Y':
            return 'Daily completed volume over the last 365 days';
    }
}

function getWorkoutVolume(workoutExercises: WorkoutWithExercises[number]['exercises']) {
    return workoutExercises.reduce((exerciseTotal, exercise) => {
        const setVolume = (exercise.setEntries ?? []).reduce((setTotal, setEntry) => {
            if (!setEntry.completed) {
                return setTotal;
            }

            return setTotal + parseWeight(setEntry.weight) * parseReps(setEntry.reps);
        }, 0);

        return exerciseTotal + setVolume;
    }, 0);
}

function parseWeight(value?: string) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}

function parseReps(value?: string) {
    if (!value) {
        return 0;
    }

    const rangeMatch = value.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);

    if (rangeMatch) {
        const low = Number(rangeMatch[1]);
        const high = Number(rangeMatch[2]);

        return Number.isFinite(low) && Number.isFinite(high) ? (low + high) / 2 : 0;
    }

    const firstNumberMatch = value.match(/\d+(?:\.\d+)?/);

    if (!firstNumberMatch) {
        return 0;
    }

    const parsed = Number(firstNumberMatch[0]);

    return Number.isFinite(parsed) ? parsed : 0;
}

function getFavoriteExercise(exercises: Array<{ name: string }>) {
    if (exercises.length === 0) {
        return 'No data';
    }

    const counts = exercises.reduce<Record<string, number>>((accumulator, exercise) => {
        const key = exercise.name.trim() || 'Unknown';
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getMuscleDistribution(exercises: Array<{ name: string }>) {
    return exercises.reduce<Record<MuscleGroup, number>>(
        (distribution, exercise) => {
            const group = getMuscleGroup(exercise.name);

            if (group) {
                distribution[group] += 1;
            }

            return distribution;
        },
        {
            Chest: 0,
            Back: 0,
            Legs: 0,
            Shoulders: 0,
            Arms: 0,
        }
    );
}

function getMuscleGroup(exerciseName: string): MuscleGroup | null {
    const name = exerciseName.toLowerCase();

    if (matchesAny(name, ['bench', 'press', 'fly'])) {
        return 'Chest';
    }

    if (matchesAny(name, ['row', 'pull', 'lat'])) {
        return 'Back';
    }

    if (matchesAny(name, ['squat', 'leg', 'lunge', 'calf'])) {
        return 'Legs';
    }

    if (matchesAny(name, ['shoulder', 'lateral', 'overhead'])) {
        return 'Shoulders';
    }

    if (matchesAny(name, ['curl', 'tricep', 'extension', 'dip'])) {
        return 'Arms';
    }

    return null;
}

function matchesAny(value: string, terms: string[]) {
    return terms.some((term) => value.includes(term));
}

function formatCompactNumber(value: number) {
    if (value >= 1000000) {
        return `${trimTrailingZero(value / 1000000)}m`;
    }

    if (value >= 1000) {
        return `${trimTrailingZero(value / 1000)}k`;
    }

    return String(Math.round(value));
}

function trimTrailingZero(value: number) {
    return value.toFixed(1).replace(/\.0$/, '');
}

function formatVolumeChange(changePercent: number | null) {
    if (changePercent === null) {
        return 'Complete sets to compare against last month.';
    }

    const rounded = Math.round(changePercent);
    const sign = rounded > 0 ? '+' : '';

    return `${sign}${rounded}% vs last month`;
}

function formatTrendLabel(direction: TrendDirection) {
    switch (direction) {
        case 'up':
            return 'Trending up';
        case 'down':
            return 'Trending down';
        default:
            return 'Stable trend';
    }
}

function getTrendIcon(direction: TrendDirection): React.ComponentProps<typeof Ionicons>['name'] {
    switch (direction) {
        case 'up':
            return 'trending-up';
        case 'down':
            return 'trending-down';
        default:
            return 'remove';
    }
}

function getTrendColor(direction: TrendDirection) {
    switch (direction) {
        case 'up':
            return colors.accent;
        case 'down':
            return '#F87171';
        default:
            return colors.sub;
    }
}

function truncateText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(maxLength - 3, 0))}...`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.accent,
        marginBottom: 16,
        textAlign: 'center',
    },
    timelineSelector: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        marginBottom: 16,
    },
    timelineOption: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    timelineOptionActive: {
        backgroundColor: colors.accent,
    },
    timelineOptionText: {
        color: colors.sub,
        fontWeight: '700',
    },
    timelineOptionTextActive: {
        color: colors.bg,
    },
    volumeCard: {
        padding: 20,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardEyebrow: {
        color: colors.sub,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    volumeValue: {
        color: colors.text,
        fontSize: 40,
        fontWeight: '800',
    },
    volumeSubtitle: {
        color: colors.sub,
        marginTop: 6,
        marginBottom: 10,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
    },
    trendText: {
        fontSize: 13,
        fontWeight: '800',
    },
    volumeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lineChart: {
        marginLeft: -18,
        borderRadius: 16,
    },
    chartHint: {
        color: colors.sub,
        textAlign: 'center',
        marginTop: 10,
    },
    muscleCard: {
        paddingVertical: 22,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
    },
    sectionSubtitle: {
        color: colors.sub,
        lineHeight: 20,
        marginBottom: 18,
    },
    muscleChartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    donutWrap: {
        width: 116,
        height: 116,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscleLegend: {
        flex: 1,
        gap: 10,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        marginRight: 8,
    },
    legendLabel: {
        flex: 1,
        color: colors.text,
        fontWeight: '700',
    },
    legendPercent: {
        color: colors.sub,
        fontWeight: '800',
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        width: '48%',
        minHeight: 132,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        justifyContent: 'space-between',
    },
    metricIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#1E2A12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricValue: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginTop: 16,
    },
    metricLabel: {
        color: colors.sub,
        fontSize: 13,
        marginTop: 4,
    },
    motivationCard: {
        backgroundColor: '#151F0E',
        paddingVertical: 24,
    },
    motivationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    motivationText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.accent,
        flex: 1,
    },
});
