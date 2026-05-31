import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Icon, Input, Screen } from '../components/Ui';
import { colors, spacing } from '../theme';
import ExerciseForm from '../components/ExerciseForm';
import GradientCard from '../components/GradientCard';
import WorkoutImageBanner from '../components/WorkoutImageBanner';
import { RootStackParamList } from '../navigation/types';
import {
    createExercisesFromTemplate,
    createSetEntries,
    Exercise,
    getExercises,
    getTotalSetCount,
    getWorkouts,
    normalizeExercise,
    saveExercises,
    upsertWorkout,
    WORKOUT_TEMPLATES,
    WorkoutTemplateKey,
} from '../lib/workouts';
import { getWorkoutImageSource } from '../lib/workoutImages';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetails'>;
type NormalizedExercise = ReturnType<typeof normalizeExercise>;

const EXERCISE_PRESETS = ['Bench Press', 'Squat', 'Deadlift', 'Pull Ups', 'Shoulder Press'];

export default function WorkoutDetailsScreen({ route, navigation }: Props) {
    const isDraft = Boolean(route.params?.isDraft) || !route.params?.workoutId;
    const initialDate = route.params?.date ?? new Date().toISOString().slice(0, 10);

    const [workoutId, setWorkoutId] = useState(route.params?.workoutId);
    const [workoutName, setWorkoutName] = useState(route.params?.title ?? 'New Workout');
    const [workoutDate, setWorkoutDate] = useState(initialDate);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplateKey | null>(null);

    useEffect(() => {
        setWorkoutId(route.params?.workoutId);
        setWorkoutName(route.params?.title ?? 'New Workout');
        setWorkoutDate(route.params?.date ?? new Date().toISOString().slice(0, 10));
    }, [route.params?.date, route.params?.title, route.params?.workoutId]);

    const loadWorkoutData = useCallback(async () => {
        if (!route.params?.workoutId) {
            setExercises([]);
            return;
        }

        try {
            const storedExercises = await getExercises(route.params.workoutId);
            const workouts = await getWorkouts();
            const workout = workouts.find((item) => item.id === route.params?.workoutId);

            setExercises(storedExercises.map(normalizeExercise));

            if (workout) {
                setWorkoutName(workout.name);
                setWorkoutDate(workout.date);
            }
        } catch (error) {
            console.error('Error loading workout details', error);
        }
    }, [route.params?.workoutId]);

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
        const totalSets = getTotalSetCount(normalizedExercises);
        const topWeight = normalizedExercises.reduce(
            (max, exercise) => Math.max(max, ...exercise.setEntries.map((setEntry) => Number(setEntry.weight) || 0)),
            0
        );

        return {
            exerciseCount: normalizedExercises.length,
            totalSets,
            topWeight,
        };
    }, [normalizedExercises]);

    const updateExercises = async (updated: Exercise[]) => {
        setExercises(updated.map(normalizeExercise));

        if (workoutId) {
            await saveExercises(workoutId, updated.map(normalizeExercise));
        }
    };

    const handleAddExercise = async (exercise: Omit<Exercise, 'id'>) => {
        const normalizedExercise = normalizeExercise({
            ...exercise,
            id: editingExercise?.id || Date.now().toString(),
            weight: exercise.weight ?? '',
            setEntries: createSetEntries(exercise.sets, exercise.reps, exercise.weight ?? ''),
        });

        const updated = editingExercise?.id
            ? normalizedExercises.map((item) =>
                item.id === editingExercise.id ? normalizedExercise : item
            )
            : [...normalizedExercises, normalizedExercise];

        setEditingExercise(null);
        await updateExercises(updated);
    };

    const handleDeleteExercise = (exerciseId: string) => {
        Alert.alert('Delete exercise', 'Remove this exercise from the workout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = normalizedExercises.filter((item) => item.id !== exerciseId);
                    if (editingExercise?.id === exerciseId) {
                        setEditingExercise(null);
                    }
                    await updateExercises(updated);
                },
            },
        ]);
    };

    const applyTemplate = (templateKey: WorkoutTemplateKey) => {
        const template = WORKOUT_TEMPLATES.find((item) => item.key === templateKey);

        if (!template) {
            return;
        }

        const nextExercises = createExercisesFromTemplate(templateKey);

        const replaceExercises = () => {
            setSelectedTemplate(templateKey);
            setWorkoutName(template.workoutName);
            setExercises(nextExercises.map(normalizeExercise));
            setEditingExercise(null);
        };

        if (normalizedExercises.length > 0) {
            Alert.alert(
                'Replace current draft?',
                'Applying a template will replace the current exercise list in this draft workout.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Apply Template', style: 'destructive', onPress: replaceExercises },
                ]
            );
            return;
        }

        replaceExercises();
    };

    const handleSaveWorkout = async () => {
        const trimmedName = workoutName.trim();

        if (!trimmedName) {
            Alert.alert('Missing name', 'Enter a workout name before saving.');
            return;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(workoutDate.trim())) {
            Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
            return;
        }

        setIsSavingWorkout(true);

        try {
            const id = workoutId ?? Date.now().toString();
            const existingWorkout = workoutId
                ? (await getWorkouts()).find((item) => item.id === workoutId)
                : undefined;

            await upsertWorkout({
                ...existingWorkout,
                id,
                name: trimmedName,
                date: workoutDate.trim(),
                status: existingWorkout?.status ?? 'planned',
            });
            await saveExercises(id, normalizedExercises);

            setWorkoutId(id);
            navigation.reset({
                index: 0,
                routes: [
                    {
                        name: 'Tabs',
                        params: {
                            screen: 'Workouts',
                            params: {
                                screen: 'WorkoutsList',
                            },
                        },
                    },
                ],
            });
        } catch (error) {
            console.error('Failed to save workout', error);
            Alert.alert('Error', 'Failed to save workout.');
        } finally {
            setIsSavingWorkout(false);
        }
    };

    const headingText = workoutId && !isDraft ? 'Edit workout' : 'Create workout';

    const renderExerciseItem = ({ item, drag, isActive }: RenderItemParams<NormalizedExercise>) => (
        <TouchableOpacity
            activeOpacity={0.9}
            disabled={isActive}
            onLongPress={drag}
            onPress={() => setEditingExercise(item)}
            style={[
                styles.exerciseCard,
                !!editingExercise?.id && editingExercise.id === item.id && styles.exerciseCardActive,
                isActive && styles.exerciseCardDragging,
            ]}
        >
            <View style={styles.exerciseHeader}>
                <View style={styles.exerciseLeft}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={styles.exerciseMeta}>
                        {item.setEntries.length} sets planned
                    </Text>
                </View>
                <View style={styles.exerciseHeaderActions}>
                    <TouchableOpacity
                        onLongPress={drag}
                        style={styles.dragHandle}
                        disabled={isActive}
                    >
                        <Icon.Ionicons name="reorder-three-outline" size={24} color={colors.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDeleteExercise(item.id)}
                        style={styles.deleteButton}
                    >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {item.setEntries.map((setEntry, index) => (
                <View key={setEntry.id} style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Set {index + 1}</Text>
                    <Text style={styles.previewValue}>
                        {setEntry.weight ? `${setEntry.weight} kg` : 'Weight not set'} • {setEntry.reps} reps
                    </Text>
                </View>
            ))}
        </TouchableOpacity>
    );

    return (
        <Screen style={styles.container}>
            <DraggableFlatList<NormalizedExercise>
                data={normalizedExercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                activationDistance={12}
                onDragEnd={({ data }) => updateExercises(data)}
                ListHeaderComponent={(
                    <View>
                        <View style={styles.topBar}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Icon.Ionicons name="chevron-back" size={22} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveWorkoutButton, isSavingWorkout && styles.saveWorkoutButtonDisabled]}
                                onPress={handleSaveWorkout}
                                disabled={isSavingWorkout}
                            >
                                <Text style={styles.saveWorkoutButtonText}>
                                    {isSavingWorkout ? 'Saving...' : 'Save Workout'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.eyebrow}>{headingText}</Text>
                        <Input
                            value={workoutName}
                            onChangeText={setWorkoutName}
                            placeholder="Workout name"
                            style={styles.workoutNameInput}
                        />
                        <Input
                            value={workoutDate}
                            onChangeText={setWorkoutDate}
                            placeholder="YYYY-MM-DD"
                            autoCapitalize="none"
                            style={styles.workoutDateInput}
                        />
                        <Text style={styles.subtitle}>
                            Build the session first, save it, then open today&apos;s workout and start the in-progress flow.
                        </Text>

                        <WorkoutImageBanner
                            title={workoutName}
                            subtitle={workoutDate}
                            height={132}
                            style={styles.heroPreview}
                        />

                        {isDraft ? (
                            <View style={styles.templateSection}>
                                <Text style={styles.sectionLabel}>Choose a template</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.templateList}
                                >
                                    {WORKOUT_TEMPLATES.map((template) => {
                                        const templateName = template.workoutName;
                                        const isSelected = selectedTemplate === template.key;

                                        return (
                                            <TouchableOpacity
                                                key={template.key}
                                                activeOpacity={0.86}
                                                style={[
                                                    styles.templateCard,
                                                    isSelected && styles.templateCardSelected,
                                                ]}
                                                onPress={() => applyTemplate(template.key)}
                                            >
                                                <ImageBackground
                                                    source={getWorkoutImageSource(templateName)}
                                                    style={styles.templateImage}
                                                    imageStyle={styles.templateImageStyle}
                                                >
                                                    <View style={styles.templateOverlay} />
                                                    <View style={styles.templateCardContent}>
                                                        <Text style={styles.templateCardTitle} numberOfLines={1}>
                                                            {templateName}
                                                        </Text>
                                                        <Text style={styles.templateCardSubtitle}>
                                                            {template.exercises.length} exercises
                                                        </Text>
                                                    </View>
                                                    {isSelected ? (
                                                        <View style={styles.templateCheck}>
                                                            <Icon.Ionicons name="checkmark" size={14} color={colors.bg} />
                                                        </View>
                                                    ) : null}
                                                </ImageBackground>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                <Text style={styles.templateHint}>
                                    {selectedTemplate
                                        ? 'Template applied. You can still edit the workout name and exercise list before saving.'
                                        : 'Pick a workout day to auto-fill common gym exercises for that split.'}
                                </Text>
                            </View>
                        ) : null}

                        <GradientCard style={styles.summaryCard}>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Exercises</Text>
                                <Text style={styles.summaryValue}>{summary.exerciseCount}</Text>
                            </View>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Planned Sets</Text>
                                <Text style={styles.summaryValue}>{summary.totalSets}</Text>
                            </View>
                            <View style={styles.summaryStat}>
                                <Text style={styles.summaryLabel}>Top Weight</Text>
                                <Text style={styles.summaryValue}>{summary.topWeight || 0}</Text>
                            </View>
                        </GradientCard>

                        <Text style={styles.sectionLabel}>Quick add</Text>
                        <View style={styles.presetRow}>
                            {EXERCISE_PRESETS.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={styles.presetChip}
                                    onPress={() =>
                                        setEditingExercise({
                                            id: editingExercise?.id ?? '',
                                            name: preset,
                                            sets: editingExercise?.sets ?? '',
                                            reps: editingExercise?.reps ?? '',
                                            weight: editingExercise?.weight ?? '',
                                            setEntries: editingExercise?.setEntries ?? [],
                                        })
                                    }
                                >
                                    <Text style={styles.presetChipText}>{preset}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {editingExercise ? (
                            <View style={styles.editingBanner}>
                                <Text style={styles.editingText}>Editing {editingExercise.name}</Text>
                                <TouchableOpacity onPress={() => setEditingExercise(null)}>
                                    <Text style={styles.editingCancel}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <ExerciseForm
                            onSubmit={handleAddExercise}
                            initialValues={editingExercise ?? { name: '', sets: '', reps: '', weight: '' }}
                            renderSubmitButton={(onPress) => (
                                <TouchableOpacity style={styles.saveButton} onPress={onPress}>
                                    <Text style={styles.saveButtonText}>
                                        {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <Text style={styles.sectionLabel}>Planned exercises</Text>
                        {normalizedExercises.length === 0 ? (
                            <Text style={styles.emptyText}>
                                No exercises yet. Start with a template or add your own below.
                            </Text>
                        ) : null}
                    </View>
                )}
                renderItem={renderExerciseItem}
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
    saveWorkoutButton: {
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    saveWorkoutButtonDisabled: {
        opacity: 0.7,
    },
    saveWorkoutButtonText: {
        color: colors.bg,
        fontWeight: '700',
    },
    eyebrow: {
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    workoutNameInput: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    workoutDateInput: {
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.sub,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    heroPreview: {
        marginBottom: spacing.lg,
    },
    templateSection: {
        marginBottom: spacing.lg,
    },
    templateList: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
        paddingBottom: spacing.sm,
    },
    templateCard: {
        width: 182,
        height: 106,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        overflow: 'hidden',
        backgroundColor: '#151515',
    },
    templateCardSelected: {
        borderColor: colors.accent,
        borderWidth: 2,
    },
    templateImage: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    templateImageStyle: {
        borderRadius: 14,
    },
    templateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    templateCardContent: {
        padding: spacing.md,
        paddingRight: 42,
    },
    templateCardTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '800',
    },
    templateCardSubtitle: {
        color: '#E5E7EB',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    templateCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templateHint: {
        color: colors.sub,
        lineHeight: 20,
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
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
    sectionLabel: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    presetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    presetChip: {
        backgroundColor: '#1A1A1A',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#2C2C2C',
    },
    presetChipText: {
        color: colors.text,
        fontWeight: '600',
    },
    editingBanner: {
        backgroundColor: '#162109',
        borderWidth: 1,
        borderColor: '#2E4A0E',
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    editingText: {
        color: colors.accent,
        fontWeight: '700',
    },
    editingCancel: {
        color: colors.text,
        fontWeight: '600',
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
    exerciseCardActive: {
        borderColor: colors.accent,
    },
    exerciseCardDragging: {
        borderColor: colors.accent,
        opacity: 0.92,
        transform: [{ scale: 1.01 }],
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    exerciseHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dragHandle: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseLeft: {
        flex: 1,
        paddingRight: spacing.md,
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
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#222222',
    },
    previewLabel: {
        color: colors.sub,
        fontWeight: '700',
    },
    previewValue: {
        color: colors.text,
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    saveButton: {
        backgroundColor: colors.accent,
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    saveButtonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: '700',
    },
});
