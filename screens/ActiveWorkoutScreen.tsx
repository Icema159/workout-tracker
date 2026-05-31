import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Icon, Screen } from '../components/Ui';
import GradientCard from '../components/GradientCard';
import WorkoutImageBanner from '../components/WorkoutImageBanner';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
    Exercise,
    getCompletedSetCount,
    getExercises,
    getTotalSetCount,
    getWorkouts,
    normalizeExercise,
    saveExercises,
    SetEntry,
    upsertWorkout,
} from '../lib/workouts';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveWorkout'>;

export default function ActiveWorkoutScreen({ route, navigation }: Props) {
    const { workoutId } = route.params;
    const [workoutName, setWorkoutName] = useState(route.params.title);
    const [workoutDate, setWorkoutDate] = useState(
        route.params.date ?? new Date().toISOString().slice(0, 10)
    );
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedSeconds((seconds) => seconds + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const loadWorkoutData = useCallback(async () => {
        try {
            const storedExercises = await getExercises(workoutId);
            const workouts = await getWorkouts();
            const workout = workouts.find((item) => item.id === workoutId);

            setExercises(storedExercises.map(normalizeExercise));

            if (workout) {
                setWorkoutName(workout.name);
                setWorkoutDate(workout.date);

                if (workout.status !== 'finished') {
                    await upsertWorkout({
                        ...workout,
                        status: 'in_progress',
                    });
                }
            }
        } catch (error) {
            console.error('Error loading active workout', error);
        }
    }, [workoutId]);

    useFocusEffect(
        useCallback(() => {
            loadWorkoutData();
        }, [loadWorkoutData])
    );

    const normalizedExercises = useMemo(
        () => exercises.map(normalizeExercise),
        [exercises]
    );

    const summary = useMemo(() => {
        const completedSets = getCompletedSetCount(normalizedExercises);
        const totalSets = getTotalSetCount(normalizedExercises);
        const topWeight = normalizedExercises.reduce(
            (max, exercise) =>
                Math.max(
                    max,
                    ...exercise.setEntries.map((setEntry) => Number(setEntry.weight) || 0)
                ),
            0
        );

        return {
            exerciseCount: normalizedExercises.length,
            completedSets,
            totalSets,
            topWeight,
            progress: totalSets ? completedSets / totalSets : 0,
        };
    }, [normalizedExercises]);

    const updateExercises = async (updated: Exercise[]) => {
        const normalized = updated.map(normalizeExercise);
        setExercises(normalized);
        await saveExercises(workoutId, normalized);
    };

    const updateSetEntry = async (
        exerciseId: string,
        setId: string,
        patch: Partial<SetEntry>
    ) => {
        const updated = normalizedExercises.map((exercise) =>
            exercise.id === exerciseId
                ? {
                    ...exercise,
                    setEntries: exercise.setEntries.map((setEntry) =>
                        setEntry.id === setId ? { ...setEntry, ...patch } : setEntry
                    ),
                }
                : exercise
        );

        await updateExercises(updated);
    };

    const addSetToExercise = async (exerciseId: string) => {
        const updated = normalizedExercises.map((exercise) => {
            if (exercise.id !== exerciseId) {
                return exercise;
            }

            const lastSet = exercise.setEntries[exercise.setEntries.length - 1];

            return normalizeExercise({
                ...exercise,
                setEntries: [
                    ...exercise.setEntries,
                    {
                        id: `${exerciseId}_${Date.now()}`,
                        reps: lastSet?.reps ?? exercise.reps,
                        weight: lastSet?.weight ?? exercise.weight ?? '',
                        completed: false,
                    },
                ],
            });
        });

        await updateExercises(updated);
    };

    const deleteSetFromExercise = (exerciseId: string, setId: string) => {
        const exercise = normalizedExercises.find((item) => item.id === exerciseId);

        if (!exercise) {
            return;
        }

        if (exercise.setEntries.length <= 1) {
            Alert.alert('Cannot delete set', 'Each exercise needs at least one set.');
            return;
        }

        Alert.alert('Delete set', 'Remove this set from the active workout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = normalizedExercises.map((item) =>
                        item.id === exerciseId
                            ? normalizeExercise({
                                ...item,
                                setEntries: item.setEntries.filter((setEntry) => setEntry.id !== setId),
                            })
                            : item
                    );

                    await updateExercises(updated);
                },
            },
        ]);
    };

    const handleFinishWorkout = async () => {
        Alert.alert(
            'Finish workout?',
            `${summary.completedSets}/${summary.totalSets} sets completed in ${formatElapsed(elapsedSeconds)}.`,
            [
                { text: 'Keep Training', style: 'cancel' },
                {
                    text: 'Finish Workout',
                    onPress: async () => {
                        setIsSavingWorkout(true);

                        try {
                            await saveExercises(workoutId, normalizedExercises);
                            const existingWorkout = (await getWorkouts()).find((item) => item.id === workoutId);

                            if (existingWorkout) {
                                await upsertWorkout({
                                    ...existingWorkout,
                                    status: 'finished',
                                    completedAt: new Date().toISOString(),
                                    durationSeconds: elapsedSeconds,
                                });
                            }

                            navigation.reset({
                                index: 0,
                                routes: [
                                    {
                                        name: 'FinishedWorkoutSummary',
                                        params: {
                                            workoutId,
                                        },
                                    },
                                ],
                            });
                        } catch (error) {
                            console.error('Failed to finish workout', error);
                            Alert.alert('Error', 'Failed to finish workout.');
                        } finally {
                            setIsSavingWorkout(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Screen style={styles.container}>
            <FlatList
                data={normalizedExercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                ListHeaderComponent={(
                    <View>
                        <View style={styles.topBar}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Icon.Ionicons name="chevron-back" size={22} color={colors.text} />
                            </TouchableOpacity>
                            <View style={styles.timerPill}>
                                <Icon.Ionicons name="time-outline" size={16} color={colors.accent} />
                                <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
                            </View>
                        </View>

                        <WorkoutImageBanner
                            title={workoutName}
                            subtitle={`In progress • ${workoutDate}`}
                            height={148}
                            style={styles.sessionBanner}
                        />
                        <Text style={styles.subtitle}>
                            Track the session set by set. Mark each finished set as you move through the workout.
                        </Text>

                        <GradientCard style={styles.summaryCard}>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Exercises</Text>
                                <Text style={styles.summaryValue}>{summary.exerciseCount}</Text>
                            </View>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Completed</Text>
                                <Text style={styles.summaryValue}>
                                    {summary.completedSets}/{summary.totalSets}
                                </Text>
                            </View>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Top Weight</Text>
                                <Text style={styles.summaryValue}>{summary.topWeight || 0}</Text>
                            </View>
                        </GradientCard>

                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.round(summary.progress * 100)}%` },
                                ]}
                            />
                        </View>

                        <Text style={styles.sectionLabel}>Session exercises</Text>
                        {normalizedExercises.length === 0 ? (
                            <Text style={styles.emptyText}>
                                This workout has no exercises yet. Build it first in the create workout flow.
                            </Text>
                        ) : null}
                    </View>
                )}
                renderItem={({ item }) => {
                    const completedSets = item.setEntries.filter((setEntry) => setEntry.completed).length;
                    const allCompleted = completedSets === item.setEntries.length && item.setEntries.length > 0;

                    return (
                        <View style={[styles.exerciseCard, allCompleted && styles.exerciseCardCompleted]}>
                            <View style={styles.exerciseHeader}>
                                <View style={styles.exerciseLeft}>
                                    <Text style={styles.exerciseName}>{item.name}</Text>
                                    <Text style={styles.exerciseMeta}>
                                        {completedSets}/{item.setEntries.length} sets completed
                                    </Text>
                                </View>
                            </View>

                            {item.setEntries.map((setEntry, index) => (
                                <View key={setEntry.id} style={styles.setRow}>
                                    <View style={styles.setIndexPill}>
                                        <Text style={styles.setIndexText}>Set {index + 1}</Text>
                                    </View>
                                    <View style={styles.setFields}>
                                        <View style={styles.setField}>
                                            <Text style={styles.setFieldLabel}>kg</Text>
                                            <TextInput
                                                value={setEntry.weight}
                                                onChangeText={(value) => updateSetEntry(item.id, setEntry.id, { weight: value })}
                                                placeholder="0"
                                                placeholderTextColor="#777"
                                                keyboardType="numeric"
                                                style={styles.setInput}
                                            />
                                        </View>
                                        <View style={styles.setField}>
                                            <Text style={styles.setFieldLabel}>reps</Text>
                                            <TextInput
                                                value={setEntry.reps}
                                                onChangeText={(value) => updateSetEntry(item.id, setEntry.id, { reps: value })}
                                                placeholder="0"
                                                placeholderTextColor="#777"
                                                keyboardType="numeric"
                                                style={styles.setInput}
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.setActionButtons}>
                                        <TouchableOpacity
                                            style={[
                                                styles.checkButton,
                                                setEntry.completed && styles.checkButtonCompleted,
                                            ]}
                                            onPress={() =>
                                                updateSetEntry(item.id, setEntry.id, {
                                                    completed: !setEntry.completed,
                                                })
                                            }
                                        >
                                            <Icon.Ionicons
                                                name={setEntry.completed ? 'checkmark' : 'ellipse-outline'}
                                                size={18}
                                                color={setEntry.completed ? colors.bg : colors.text}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteSetButton}
                                            onPress={() => deleteSetFromExercise(item.id, setEntry.id)}
                                        >
                                            <Icon.Ionicons name="trash-outline" size={18} color="#F87171" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.exerciseActions}>
                                <TouchableOpacity
                                    style={styles.smallActionButton}
                                    onPress={() => addSetToExercise(item.id)}
                                >
                                    <Text style={styles.smallActionText}>Add Set</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
                ListFooterComponent={(
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.finishButton, isSavingWorkout && styles.finishButtonDisabled]}
                            onPress={handleFinishWorkout}
                            disabled={isSavingWorkout}
                        >
                            <Text style={styles.finishButtonText}>
                                {isSavingWorkout ? 'Finishing...' : 'Finish Workout'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </Screen>
    );
}

function formatElapsed(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 120,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#171717',
        borderWidth: 1,
        borderColor: '#262626',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#171717',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#262626',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    timerText: {
        color: colors.text,
        fontWeight: '700',
    },
    sessionBanner: {
        marginBottom: spacing.lg,
    },
    subtitle: {
        color: colors.sub,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 21,
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    summaryStat: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: colors.sub,
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 0.8,
    },
    summaryValue: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '700',
        marginTop: spacing.xs,
    },
    progressBarTrack: {
        height: 10,
        borderRadius: 999,
        backgroundColor: '#252525',
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
    },
    sectionLabel: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    emptyText: {
        color: colors.sub,
        marginBottom: spacing.md,
    },
    exerciseCard: {
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#222222',
        borderRadius: 18,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    exerciseCardCompleted: {
        borderColor: colors.accent,
        backgroundColor: '#162109',
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    exerciseLeft: {
        flex: 1,
    },
    exerciseName: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
    },
    exerciseMeta: {
        color: colors.sub,
        marginTop: 4,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    setIndexPill: {
        minWidth: 58,
        borderRadius: 999,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        paddingHorizontal: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    setIndexText: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 12,
    },
    setFields: {
        flex: 1,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    setField: {
        flex: 1,
    },
    setFieldLabel: {
        color: colors.sub,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.7,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    setInput: {
        backgroundColor: '#101010',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        borderRadius: 14,
        color: colors.text,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    setActionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: 18,
    },
    checkButton: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        backgroundColor: '#101010',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkButtonCompleted: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    deleteSetButton: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#3A1A1A',
        backgroundColor: '#1A1010',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
    },
    smallActionButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#181818',
    },
    smallActionText: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 13,
    },
    footer: {
        marginTop: spacing.md,
    },
    finishButton: {
        backgroundColor: colors.accent,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    finishButtonDisabled: {
        opacity: 0.6,
    },
    finishButtonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: '800',
    },
});
