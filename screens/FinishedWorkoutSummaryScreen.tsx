import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import WorkoutImageBanner from '../components/WorkoutImageBanner';
import { Icon, Screen } from '../components/Ui';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Exercise, getExercises, getWorkouts, normalizeExercise, Workout } from '../lib/workouts';

type Props = NativeStackScreenProps<RootStackParamList, 'FinishedWorkoutSummary'>;
type NormalizedExercise = ReturnType<typeof normalizeExercise>;

type CompletedSetSummary = {
    exerciseName: string;
    reps: string;
    weight: string;
    numericReps: number | null;
    numericWeight: number | null;
};

type ExerciseBreakdown = {
    exerciseId: string;
    name: string;
    completedSets: number;
    volume: number;
    maxWeight: number | null;
};

type FinishedSummary = {
    completedSets: number;
    completedExercises: number;
    totalVolume: number;
    maxWeight: number | null;
    bestSet: CompletedSetSummary | null;
    exerciseBreakdown: ExerciseBreakdown[];
};

export default function FinishedWorkoutSummaryScreen({ route, navigation }: Props) {
    const { workoutId } = route.params;
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSummary = useCallback(async () => {
        setIsLoading(true);

        try {
            const [storedWorkouts, storedExercises] = await Promise.all([
                getWorkouts(),
                getExercises(workoutId),
            ]);

            setWorkout(storedWorkouts.find((item) => item.id === workoutId) ?? null);
            setExercises(storedExercises.map(normalizeExercise));
        } catch (error) {
            console.error('Failed to load finished workout summary', error);
        } finally {
            setIsLoading(false);
        }
    }, [workoutId]);

    useFocusEffect(
        useCallback(() => {
            loadSummary();
        }, [loadSummary])
    );

    const normalizedExercises = useMemo(
        () => exercises.map(normalizeExercise),
        [exercises]
    );
    const summary = useMemo(
        () => calculateFinishedSummary(normalizedExercises),
        [normalizedExercises]
    );

    const handleDone = () => {
        navigation.reset({
            index: 0,
            routes: [
                {
                    name: 'Tabs',
                    params: {
                        screen: 'Home',
                    },
                },
            ],
        });
    };

    if (isLoading) {
        return (
            <Screen style={styles.centeredScreen}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loadingText}>Loading summary...</Text>
            </Screen>
        );
    }

    if (!workout) {
        return (
            <Screen style={styles.centeredScreen}>
                <Text style={styles.errorTitle}>Workout not found</Text>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            </Screen>
        );
    }

    return (
        <Screen style={styles.container}>
            <FlatList
                data={summary.exerciseBreakdown}
                keyExtractor={(item) => item.exerciseId}
                contentContainerStyle={styles.content}
                ListHeaderComponent={(
                    <View>
                        <WorkoutImageBanner
                            title={workout.name}
                            subtitle="Workout complete"
                            height={150}
                            style={styles.banner}
                        />

                        <View style={styles.headerRow}>
                            <View style={styles.headerText}>
                                <Text style={styles.eyebrow}>Finished summary</Text>
                                <Text style={styles.title}>{workout.name}</Text>
                                <Text style={styles.metaText}>
                                    {formatCompletedDate(workout.completedAt)}
                                    {workout.durationSeconds !== undefined ? ` • ${formatDuration(workout.durationSeconds)}` : ''}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.iconDoneButton} onPress={handleDone}>
                                <Icon.Ionicons name="checkmark" size={22} color={colors.bg} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsGrid}>
                            <SummaryStat label="Volume" value={`${formatNumber(summary.totalVolume)} kg`} />
                            <SummaryStat label="Exercises" value={String(summary.completedExercises)} />
                            <SummaryStat label="Sets" value={String(summary.completedSets)} />
                            <SummaryStat
                                label="Max kg"
                                value={summary.maxWeight === null ? '-' : formatNumber(summary.maxWeight)}
                            />
                        </View>

                        <View style={styles.bestSetCard}>
                            <Text style={styles.cardLabel}>Best set</Text>
                            {summary.bestSet ? (
                                <>
                                    <Text style={styles.bestSetTitle}>{summary.bestSet.exerciseName}</Text>
                                    <Text style={styles.bestSetMeta}>
                                        {formatSetValue(summary.bestSet.weight, 'kg')} • {formatSetValue(summary.bestSet.reps, 'reps')}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.mutedText}>No completed weighted set available.</Text>
                            )}
                        </View>

                        {summary.completedSets === 0 ? (
                            <View style={styles.emptyCompletedCard}>
                                <Text style={styles.emptyCompletedTitle}>No completed sets were tracked.</Text>
                                <Text style={styles.emptyCompletedText}>
                                    You finished this workout, but no sets were marked as completed.
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.sectionTitle}>Exercise breakdown</Text>
                        )}
                    </View>
                )}
                renderItem={({ item }) => (
                    <View style={styles.exerciseCard}>
                        <View style={styles.exerciseCardHeader}>
                            <Text style={styles.exerciseName}>{item.name}</Text>
                            <View style={styles.setBadge}>
                                <Text style={styles.setBadgeText}>{item.completedSets} sets</Text>
                            </View>
                        </View>
                        <View style={styles.exerciseStatsRow}>
                            <View>
                                <Text style={styles.exerciseStatLabel}>Volume</Text>
                                <Text style={styles.exerciseStatValue}>{formatNumber(item.volume)} kg</Text>
                            </View>
                            <View>
                                <Text style={styles.exerciseStatLabel}>Max weight</Text>
                                <Text style={styles.exerciseStatValue}>
                                    {item.maxWeight === null ? '-' : `${formatNumber(item.maxWeight)} kg`}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                ListFooterComponent={(
                    <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                )}
            />
        </Screen>
    );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>{label}</Text>
            <Text style={styles.summaryStatValue}>{value}</Text>
        </View>
    );
}

function calculateFinishedSummary(exercises: NormalizedExercise[]): FinishedSummary {
    let completedSets = 0;
    let totalVolume = 0;
    let maxWeight: number | null = null;
    let bestSet: CompletedSetSummary | null = null;

    const exerciseBreakdown: ExerciseBreakdown[] = [];

    exercises.forEach((exercise) => {
        const completedEntries = exercise.setEntries.filter((setEntry) => setEntry.completed);

        if (completedEntries.length === 0) {
            return;
        }

        let exerciseVolume = 0;
        let exerciseMaxWeight: number | null = null;

        completedEntries.forEach((setEntry) => {
            completedSets += 1;

            const numericReps = parseFirstNumber(setEntry.reps);
            const numericWeight = parseFirstNumber(setEntry.weight);

            if (numericReps !== null && numericWeight !== null) {
                const setVolume = numericReps * numericWeight;
                exerciseVolume += setVolume;
                totalVolume += setVolume;
            }

            if (numericWeight !== null) {
                exerciseMaxWeight = exerciseMaxWeight === null
                    ? numericWeight
                    : Math.max(exerciseMaxWeight, numericWeight);
                maxWeight = maxWeight === null ? numericWeight : Math.max(maxWeight, numericWeight);

                const candidate: CompletedSetSummary = {
                    exerciseName: exercise.name,
                    reps: setEntry.reps,
                    weight: setEntry.weight,
                    numericReps,
                    numericWeight,
                };

                if (isBetterSet(candidate, bestSet)) {
                    bestSet = candidate;
                }
            }
        });

        exerciseBreakdown.push({
            exerciseId: exercise.id,
            name: exercise.name,
            completedSets: completedEntries.length,
            volume: exerciseVolume,
            maxWeight: exerciseMaxWeight,
        });
    });

    return {
        completedSets,
        completedExercises: exerciseBreakdown.length,
        totalVolume,
        maxWeight,
        bestSet,
        exerciseBreakdown,
    };
}

function isBetterSet(candidate: CompletedSetSummary, current: CompletedSetSummary | null) {
    if (!current) {
        return true;
    }

    if ((candidate.numericWeight ?? 0) !== (current.numericWeight ?? 0)) {
        return (candidate.numericWeight ?? 0) > (current.numericWeight ?? 0);
    }

    return (candidate.numericReps ?? 0) > (current.numericReps ?? 0);
}

function parseFirstNumber(value?: string) {
    if (!value) {
        return null;
    }

    const match = value.match(/\d+(?:\.\d+)?/);

    if (!match) {
        return null;
    }

    const parsed = Number(match[0]);

    return Number.isFinite(parsed) ? parsed : null;
}

function formatCompletedDate(completedAt?: string) {
    if (!completedAt) {
        return 'Completed date unavailable';
    }

    const date = new Date(completedAt);

    if (Number.isNaN(date.getTime())) {
        return 'Completed date unavailable';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDuration(durationSeconds: number) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    if (minutes <= 0) {
        return `${seconds}s`;
    }

    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function formatSetValue(value: string, unit: string) {
    return value.trim() ? `${value} ${unit}` : `${unit} not set`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    centeredScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    loadingText: {
        color: colors.sub,
        marginTop: spacing.md,
    },
    errorTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: spacing.lg,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 48,
    },
    banner: {
        marginBottom: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    headerText: {
        flex: 1,
    },
    eyebrow: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    title: {
        color: colors.text,
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 36,
    },
    metaText: {
        color: colors.sub,
        marginTop: spacing.xs,
    },
    iconDoneButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    summaryStatCard: {
        flexGrow: 1,
        flexBasis: '47%',
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#242424',
        borderRadius: 16,
        padding: spacing.md,
    },
    summaryStatLabel: {
        color: colors.sub,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    summaryStatValue: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
        marginTop: spacing.xs,
    },
    bestSetCard: {
        backgroundColor: '#162109',
        borderWidth: 1,
        borderColor: '#2E4A0E',
        borderRadius: 18,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    cardLabel: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    bestSetTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
    },
    bestSetMeta: {
        color: colors.sub,
        marginTop: spacing.xs,
        fontWeight: '700',
    },
    mutedText: {
        color: colors.sub,
        lineHeight: 20,
    },
    emptyCompletedCard: {
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#242424',
        borderRadius: 18,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    emptyCompletedTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: spacing.xs,
    },
    emptyCompletedText: {
        color: colors.sub,
        lineHeight: 20,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: spacing.md,
    },
    exerciseCard: {
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#242424',
        borderRadius: 18,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    exerciseCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    exerciseName: {
        flex: 1,
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    setBadge: {
        borderRadius: 999,
        backgroundColor: '#1D2B0F',
        borderWidth: 1,
        borderColor: '#395C13',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    setBadgeText: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    exerciseStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    exerciseStatLabel: {
        color: colors.sub,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    exerciseStatValue: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    doneButton: {
        backgroundColor: colors.accent,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: spacing.md,
    },
    doneButtonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: '900',
    },
});
