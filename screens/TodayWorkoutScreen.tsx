import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Icon, Title } from '../components/Ui';
import GradientCard from '../components/GradientCard';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Exercise, getExercises, getTotalSetCount, normalizeExercise } from '../lib/workouts';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayWorkout'>;

export default function TodayWorkoutScreen({ route, navigation }: Props) {
    const { workoutId, title, date, exerciseCount = 0 } = route.params;
    const [exercises, setExercises] = useState<Exercise[]>([]);

    const loadExercises = useCallback(async () => {
        try {
            const storedExercises = await getExercises(workoutId);
            setExercises(storedExercises.map(normalizeExercise));
        } catch (error) {
            console.error('Error loading today workout preview', error);
        }
    }, [workoutId]);

    useFocusEffect(
        useCallback(() => {
            loadExercises();
        }, [loadExercises])
    );

    const normalizedExercises = useMemo(
        () => exercises.map(normalizeExercise),
        [exercises]
    );

    const resolvedExerciseCount = normalizedExercises.length || exerciseCount;
    const totalSets = getTotalSetCount(normalizedExercises);

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
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() =>
                                    navigation.navigate('WorkoutDetails', {
                                        workoutId,
                                        title,
                                        date,
                                    })
                                }
                            >
                                <Text style={styles.editButtonText}>Edit Workout</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.eyebrow}>Today Workout</Text>
                        <Title style={styles.title}>{title}</Title>
                        <Text style={styles.subtitle}>
                            Review the session before you begin. If something needs to change, jump back into the builder and update the exercise plan.
                        </Text>

                        <GradientCard style={styles.heroCard}>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Text style={styles.metaLabel}>Date</Text>
                                    <Text style={styles.metaValue}>{date}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Text style={styles.metaLabel}>Exercises</Text>
                                    <Text style={styles.metaValue}>{resolvedExerciseCount}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Text style={styles.metaLabel}>Sets</Text>
                                    <Text style={styles.metaValue}>{totalSets}</Text>
                                </View>
                            </View>
                            <Text style={styles.heroText}>
                                Start the workout when you are ready to track set-by-set progress, weight, reps, and completed sets.
                            </Text>
                        </GradientCard>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>Exercise preview</Text>
                            <Text style={styles.sectionHint}>Tap edit if you want to reorder or change the plan.</Text>
                        </View>

                        {normalizedExercises.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>No exercises planned yet</Text>
                                <Text style={styles.emptyText}>
                                    Add exercises in the create workout screen before starting the session.
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}
                renderItem={({ item, index }) => (
                    <View style={styles.exerciseCard}>
                        <View style={styles.exerciseHeader}>
                            <View style={styles.exerciseIndex}>
                                <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                            </View>
                            <View style={styles.exerciseInfo}>
                                <Text style={styles.exerciseName}>{item.name}</Text>
                                <Text style={styles.exerciseMeta}>
                                    {item.setEntries.length} sets
                                    {item.reps ? ` • ${item.reps} reps` : ''}
                                    {item.weight ? ` • ${item.weight} kg` : ''}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.setPreviewRow}>
                            {item.setEntries.map((setEntry, setIndex) => (
                                <View key={setEntry.id} style={styles.setPreviewPill}>
                                    <Text style={styles.setPreviewText}>
                                        S{setIndex + 1}
                                        {setEntry.reps ? ` ${setEntry.reps}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                ListFooterComponent={(
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() =>
                            navigation.navigate('ActiveWorkout', {
                                workoutId,
                                title,
                                date,
                            })
                        }
                    >
                        <Text style={styles.startButtonText}>Start Workout</Text>
                    </TouchableOpacity>
                )}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 48,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
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
    editButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        backgroundColor: '#171717',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    editButtonText: {
        color: colors.text,
        fontWeight: '700',
    },
    eyebrow: {
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    title: {
        textAlign: 'center',
        fontSize: 32,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        color: colors.sub,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    heroCard: {
        paddingVertical: spacing.xl,
        marginBottom: spacing.xl,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    metaItem: {
        flex: 1,
        alignItems: 'center',
    },
    metaLabel: {
        color: colors.sub,
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 0.8,
    },
    metaValue: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '700',
        marginTop: spacing.xs,
    },
    heroText: {
        color: colors.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionHeader: {
        marginBottom: spacing.md,
    },
    sectionLabel: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    sectionHint: {
        color: colors.sub,
        lineHeight: 20,
    },
    emptyCard: {
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#222222',
        borderRadius: 18,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 17,
        marginBottom: spacing.xs,
    },
    emptyText: {
        color: colors.sub,
        lineHeight: 20,
    },
    exerciseCard: {
        backgroundColor: '#131313',
        borderWidth: 1,
        borderColor: '#222222',
        borderRadius: 18,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    exerciseIndex: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    exerciseIndexText: {
        color: colors.bg,
        fontWeight: '800',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    exerciseMeta: {
        color: colors.sub,
    },
    setPreviewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    setPreviewPill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        backgroundColor: '#171717',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    setPreviewText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    startButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.accent,
        borderRadius: 18,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        color: colors.bg,
        fontSize: 17,
        fontWeight: '800',
    },
});
