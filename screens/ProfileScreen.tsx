import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon, Screen } from '../components/Ui';
import { colors, spacing } from '../theme';
import GradientCard from '../components/GradientCard';
import { getWorkoutWithExercises } from '../lib/workouts';

type WorkoutWithExercises = Awaited<ReturnType<typeof getWorkoutWithExercises>>;
type WorkoutWithExercise = WorkoutWithExercises[number];

const userName = 'Aismantas';

export default function ProfileScreen() {
    const [workouts, setWorkouts] = useState<WorkoutWithExercises>([]);

    const loadProfile = useCallback(async () => {
        try {
            setWorkouts(await getWorkoutWithExercises());
        } catch (error) {
            console.error('Failed to load profile data', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [loadProfile])
    );

    const summary = useMemo(() => buildProfileSummary(workouts), [workouts]);

    return (
        <Screen style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <GradientCard style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>AT</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{userName}</Text>
                        <Text style={styles.profileSubtitle}>Local training profile</Text>
                        <View style={styles.statusBadge}>
                            <Icon.Ionicons name="pulse-outline" size={13} color={colors.bg} />
                            <Text style={styles.statusBadgeText}>{summary.statusLabel}</Text>
                        </View>
                    </View>
                </GradientCard>

                <SectionHeader title="Training Snapshot" subtitle="Your local training activity at a glance." />
                <View style={styles.statGrid}>
                    <MetricCard label="Total workouts" value={String(summary.totalWorkouts)} icon="barbell-outline" />
                    <MetricCard label="Finished" value={String(summary.finishedWorkouts)} icon="checkmark-done-outline" />
                    <MetricCard label="Training days" value={String(summary.trainingDays)} icon="calendar-outline" />
                    <MetricCard label="This month" value={String(summary.thisMonthWorkouts)} icon="today-outline" />
                </View>

                <SectionHeader title="Lifetime Performance" subtitle="Calculated from completed set entries only." />
                <View style={styles.statGrid}>
                    <MetricCard label="Completed sets" value={String(summary.completedSets)} icon="list-outline" />
                    <MetricCard label="Total volume" value={`${formatCompactNumber(summary.totalVolume)} kg`} icon="flash-outline" />
                    <MetricCard label="Best weight" value={summary.bestWeight ? `${formatCompactNumber(summary.bestWeight)} kg` : '0 kg'} icon="trending-up-outline" />
                    <MetricCard label="Favorite" value={summary.favoriteExercise} icon="star-outline" />
                </View>

                <SectionHeader title="Last Finished Workout" subtitle="Most recent completed session saved on this device." />
                {summary.lastFinishedWorkout ? (
                    <GradientCard style={styles.lastWorkoutCard}>
                        <View style={styles.lastWorkoutHeader}>
                            <View>
                                <Text style={styles.lastWorkoutName}>{summary.lastFinishedWorkout.name}</Text>
                                <Text style={styles.lastWorkoutDate}>
                                    {formatWorkoutDate(summary.lastFinishedWorkout.completedAt ?? summary.lastFinishedWorkout.date)}
                                </Text>
                            </View>
                            <View style={styles.finishedPill}>
                                <Text style={styles.finishedPillText}>Finished</Text>
                            </View>
                        </View>
                        <View style={styles.lastWorkoutMetaRow}>
                            <InfoPill
                                icon="checkmark-circle-outline"
                                label={`${summary.lastFinishedWorkoutCompletedSets} completed sets`}
                            />
                            {summary.lastFinishedWorkout.durationSeconds !== undefined ? (
                                <InfoPill
                                    icon="time-outline"
                                    label={formatDuration(summary.lastFinishedWorkout.durationSeconds)}
                                />
                            ) : null}
                        </View>
                    </GradientCard>
                ) : (
                    <View style={styles.emptyCard}>
                        <Icon.Ionicons name="flag-outline" size={22} color={colors.accent} />
                        <View style={styles.emptyTextWrap}>
                            <Text style={styles.emptyTitle}>No finished workouts yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Finished sessions will appear here after you complete a workout.
                            </Text>
                        </View>
                    </View>
                )}

                <SectionHeader title="App Setup" subtitle="This app is currently configured as a local-first tracker." />
                <View style={styles.setupCard}>
                    <SetupRow label="Storage" value="Local only" icon="phone-portrait-outline" />
                    <SetupRow label="Units" value="kg" icon="scale-outline" />
                    <SetupRow label="Sync" value="Off" icon="cloud-offline-outline" />
                    <SetupRow label="Profile" value="This device" icon="person-circle-outline" isLast />
                </View>
            </ScrollView>
        </Screen>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
    );
}

function MetricCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Icon.Ionicons>['name'];
}) {
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
                <Icon.Ionicons name={icon} size={17} color={colors.accent} />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
        </View>
    );
}

function InfoPill({
    icon,
    label,
}: {
    icon: React.ComponentProps<typeof Icon.Ionicons>['name'];
    label: string;
}) {
    return (
        <View style={styles.infoPill}>
            <Icon.Ionicons name={icon} size={15} color={colors.accent} />
            <Text style={styles.infoPillText}>{label}</Text>
        </View>
    );
}

function SetupRow({
    label,
    value,
    icon,
    isLast,
}: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Icon.Ionicons>['name'];
    isLast?: boolean;
}) {
    return (
        <View style={[styles.setupRow, isLast && styles.setupRowLast]}>
            <View style={styles.setupLabelWrap}>
                <View style={styles.setupIcon}>
                    <Icon.Ionicons name={icon} size={17} color={colors.accent} />
                </View>
                <Text style={styles.setupLabel}>{label}</Text>
            </View>
            <Text style={styles.setupValue}>{value}</Text>
        </View>
    );
}

function buildProfileSummary(workouts: WorkoutWithExercises) {
    const finishedWorkouts = workouts.filter((workout) => workout.status === 'finished');
    const trainingDays = new Set(workouts.map((workout) => workout.date)).size;
    const thisMonthWorkouts = workouts.filter((workout) => isInCurrentMonth(workout.date)).length;
    const exerciseCompletedSetCounts: Record<string, number> = {};
    const lastFinishedWorkout = getLatestFinishedWorkout(finishedWorkouts);

    let completedSets = 0;
    let totalVolume = 0;
    let bestWeight = 0;

    workouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
            const exerciseCompletedSets = (exercise.setEntries ?? []).filter((setEntry) => setEntry.completed);

            if (exerciseCompletedSets.length > 0) {
                const exerciseName = exercise.name.trim() || 'Unknown';
                exerciseCompletedSetCounts[exerciseName] =
                    (exerciseCompletedSetCounts[exerciseName] ?? 0) + exerciseCompletedSets.length;
            }

            exerciseCompletedSets.forEach((setEntry) => {
                completedSets += 1;

                const reps = parseNumericInput(setEntry.reps);
                const weight = parseNumericInput(setEntry.weight);

                if (weight !== null) {
                    bestWeight = Math.max(bestWeight, weight);
                }

                if (reps !== null && weight !== null) {
                    totalVolume += reps * weight;
                }
            });
        });
    });

    return {
        totalWorkouts: workouts.length,
        finishedWorkouts: finishedWorkouts.length,
        trainingDays,
        thisMonthWorkouts,
        completedSets,
        totalVolume,
        bestWeight,
        favoriteExercise: getFavoriteExercise(exerciseCompletedSetCounts),
        statusLabel: getStatusLabel(finishedWorkouts.length),
        lastFinishedWorkout,
        lastFinishedWorkoutCompletedSets: lastFinishedWorkout
            ? getCompletedSetCountForWorkout(lastFinishedWorkout)
            : 0,
    };
}

function parseNumericInput(value?: string) {
    if (!value) {
        return null;
    }

    const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);

    if (!match) {
        return null;
    }

    const parsed = Number(match[0]);

    return Number.isFinite(parsed) ? parsed : null;
}

function getStatusLabel(finishedWorkoutCount: number) {
    if (finishedWorkoutCount === 0) {
        return 'No sessions yet';
    }

    if (finishedWorkoutCount <= 3) {
        return 'Building momentum';
    }

    return 'Consistent';
}

function getFavoriteExercise(exerciseCompletedSetCounts: Record<string, number>) {
    const favorite = Object.entries(exerciseCompletedSetCounts).sort((a, b) => b[1] - a[1])[0];

    return favorite?.[0] ?? 'No data';
}

function getLatestFinishedWorkout(finishedWorkouts: WorkoutWithExercise[]) {
    return [...finishedWorkouts].sort((a, b) => getWorkoutTime(b) - getWorkoutTime(a))[0];
}

function getWorkoutTime(workout: WorkoutWithExercise) {
    const dateValue = workout.completedAt ?? workout.date;
    const timestamp = Date.parse(dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`);

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getCompletedSetCountForWorkout(workout: WorkoutWithExercise) {
    return workout.exercises.reduce(
        (total, exercise) =>
            total + (exercise.setEntries ?? []).filter((setEntry) => setEntry.completed).length,
        0
    );
}

function isInCurrentMonth(dateString: string) {
    const now = new Date();
    const target = new Date(`${dateString}T12:00:00`);

    return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
}

function formatWorkoutDate(dateString: string) {
    const parsed = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return dateString;
    }

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDuration(durationSeconds: number) {
    const minutes = Math.max(1, Math.round(durationSeconds / 60));

    return `${minutes} min`;
}

function formatCompactNumber(value: number) {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
    screen: {
        paddingHorizontal: spacing.lg,
    },
    content: {
        paddingBottom: spacing.xl + 72,
    },
    profileHeader: {
        marginTop: spacing.md,
        marginBottom: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: '#242424',
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#D9F99D',
    },
    avatarText: {
        color: colors.bg,
        fontSize: 24,
        fontWeight: '900',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    profileSubtitle: {
        color: colors.sub,
        fontSize: 14,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent,
        borderRadius: 999,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    statusBadgeText: {
        color: colors.bg,
        fontSize: 12,
        fontWeight: '800',
    },
    sectionHeader: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: '800',
    },
    sectionSubtitle: {
        color: colors.sub,
        fontSize: 13,
        lineHeight: 18,
        marginTop: spacing.xs,
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    metricCard: {
        width: '47.5%',
        minHeight: 126,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        justifyContent: 'space-between',
    },
    metricIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1F2A12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricValue: {
        color: colors.text,
        fontSize: 23,
        fontWeight: '800',
        marginTop: spacing.md,
    },
    metricLabel: {
        color: colors.sub,
        fontSize: 12,
        lineHeight: 16,
        marginTop: spacing.xs,
        textTransform: 'uppercase',
    },
    lastWorkoutCard: {
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: '#24331A',
    },
    lastWorkoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    lastWorkoutName: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    lastWorkoutDate: {
        color: colors.sub,
        fontSize: 13,
        marginTop: spacing.xs,
    },
    finishedPill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2E7D32',
        backgroundColor: '#16311C',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    finishedPillText: {
        color: '#86EFAC',
        fontSize: 12,
        fontWeight: '800',
    },
    lastWorkoutMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#141414',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    infoPillText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    emptyTextWrap: {
        flex: 1,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
    },
    emptySubtitle: {
        color: colors.sub,
        fontSize: 13,
        lineHeight: 18,
        marginTop: spacing.xs,
    },
    setupCard: {
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xl,
    },
    setupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    setupRowLast: {
        borderBottomWidth: 0,
    },
    setupLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    setupIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2A12',
    },
    setupLabel: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    setupValue: {
        color: colors.sub,
        fontSize: 14,
        fontWeight: '700',
    },
});
