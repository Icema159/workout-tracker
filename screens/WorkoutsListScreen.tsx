import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, GestureResponderEvent, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientCard from '../components/GradientCard';
import { Icon } from '../components/Ui';
import { RootStackParamList, WorkoutsStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
    deleteWorkout,
    getCompletedSetCount,
    getTotalSetCount,
    getWorkoutWithExercises,
    WorkoutStatus,
} from '../lib/workouts';
import { getWorkoutImageSource } from '../lib/workoutImages';
import {
    clearSelectedTodayWorkoutId,
    getSelectedTodayWorkoutId,
    saveSelectedTodayWorkoutId,
} from '../lib/selectedTodayWorkout';

type Props = CompositeScreenProps<
    NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsList'>,
    NativeStackScreenProps<RootStackParamList>
>;

type WorkoutListItem = Awaited<ReturnType<typeof getWorkoutWithExercises>>[number];
type WorkoutsSection = 'plans' | 'history';

export default function WorkoutsListScreen({ navigation }: Props) {
    const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
    const [selectedTodayWorkoutId, setSelectedTodayWorkoutId] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<WorkoutsSection>('plans');
    const insets = useSafeAreaInsets();

    const loadWorkouts = useCallback(async () => {
        try {
            const [storedWorkouts, storedSelectedWorkoutId] = await Promise.all([
                getWorkoutWithExercises(),
                getSelectedTodayWorkoutId(),
            ]);

            const selectedWorkout = storedWorkouts.find((workout) => workout.id === storedSelectedWorkoutId);
            setWorkouts(storedWorkouts);

            if (selectedWorkout && selectedWorkout.status !== 'finished') {
                setSelectedTodayWorkoutId(storedSelectedWorkoutId);
            } else {
                setSelectedTodayWorkoutId(null);

                if (storedSelectedWorkoutId) {
                    await clearSelectedTodayWorkoutId();
                }
            }
        } catch (error) {
            console.error('Error loading workouts', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadWorkouts();
        }, [loadWorkouts])
    );

    const visibleWorkouts = useMemo(
        () =>
            selectedSection === 'plans'
                ? workouts.filter((workout) => workout.status !== 'finished')
                : workouts.filter((workout) => workout.status === 'finished'),
        [selectedSection, workouts]
    );
    const isHistory = selectedSection === 'history';

    const handleSelectTodayWorkout = async (workoutId: string) => {
        setSelectedTodayWorkoutId(workoutId);

        try {
            await saveSelectedTodayWorkoutId(workoutId);
        } catch (error) {
            console.error('Error saving selected today workout', error);
        }
    };

    const handleOpenWorkout = (event: GestureResponderEvent, item: WorkoutListItem) => {
        event.stopPropagation();
        navigation.navigate('WorkoutDetails', {
            workoutId: item.id,
            title: item.name,
            date: item.date,
        });
    };

    const handleViewSummary = (event: GestureResponderEvent, workoutId: string) => {
        event.stopPropagation();
        navigation.navigate('FinishedWorkoutSummary', {
            workoutId,
        });
    };

    const handleDeleteWorkout = (workoutId: string) => {
        Alert.alert('Delete workout', 'This will also remove all exercises in the session.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteWorkout(workoutId);
                    if (selectedTodayWorkoutId === workoutId) {
                        setSelectedTodayWorkoutId(null);
                        await clearSelectedTodayWorkoutId();
                    }
                    loadWorkouts();
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.title}>Workouts</Text>
                <Text style={styles.subtitle}>Choose a plan for today or review completed sessions.</Text>
            </View>

            <View style={styles.segmentedControl}>
                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        selectedSection === 'plans' && styles.segmentButtonActive,
                    ]}
                    onPress={() => setSelectedSection('plans')}
                >
                    <Text
                        style={[
                            styles.segmentButtonText,
                            selectedSection === 'plans' && styles.segmentButtonTextActive,
                        ]}
                    >
                        Plans
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        selectedSection === 'history' && styles.segmentButtonActive,
                    ]}
                    onPress={() => setSelectedSection('history')}
                >
                    <Text
                        style={[
                            styles.segmentButtonText,
                            selectedSection === 'history' && styles.segmentButtonTextActive,
                        ]}
                    >
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {visibleWorkouts.length === 0 ? (
                    <GradientCard style={styles.emptyCard}>
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>
                                {isHistory ? 'No workout history yet' : 'No workout plans yet'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {isHistory
                                    ? 'Finished workouts will appear here after you complete them.'
                                    : 'Create a workout plan to use in your training.'}
                            </Text>
                        </View>
                    </GradientCard>
                ) : (
                    <FlatList
                        data={visibleWorkouts}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => {
                            const completedSets = getCompletedSetCount(item.exercises);
                            const totalSets = getTotalSetCount(item.exercises);
                            const workoutImageSource = getWorkoutImageSource(item.name);
                            const isSelectedToday = !isHistory && item.id === selectedTodayWorkoutId;
                            const summaryParts = [
                                `${item.exercises.length} exercises`,
                                `${completedSets}/${totalSets} sets`,
                            ];

                            if (item.durationSeconds) {
                                summaryParts.push(formatDuration(item.durationSeconds));
                            }

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.workoutCard,
                                        item.status === 'finished' && styles.workoutCardFinished,
                                        item.status === 'in_progress' && styles.workoutCardInProgress,
                                        isSelectedToday && styles.workoutCardSelected,
                                    ]}
                                    onPress={() =>
                                        isHistory
                                            ? navigation.navigate('FinishedWorkoutSummary', { workoutId: item.id })
                                            : handleSelectTodayWorkout(item.id)
                                    }
                                >
                                    <Image
                                        source={workoutImageSource}
                                        style={styles.workoutImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.workoutHeader}>
                                        <View style={styles.workoutHeaderLeft}>
                                            <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                                                <Text style={[styles.statusBadgeText, getStatusTextStyle(item.status)]}>
                                                    {getStatusLabel(item.status)}
                                                </Text>
                                            </View>
                                            {isSelectedToday ? (
                                                <View style={styles.todayBadge}>
                                                    <Icon.Ionicons name="today-outline" size={13} color={colors.bg} />
                                                    <Text style={styles.todayBadgeText}>Today</Text>
                                                </View>
                                            ) : null}
                                            <Text style={styles.workoutName}>{item.name}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.deleteIconButton}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                handleDeleteWorkout(item.id);
                                            }}
                                        >
                                            <Icon.Ionicons name="trash-outline" size={18} color="#F87171" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.workoutDate}>{formatFriendlyDate(item.date)}</Text>
                                    <Text style={styles.summaryText}>{summaryParts.join(' • ')}</Text>

                                    <View style={styles.cardFooter}>
                                        <Text style={styles.footerHint}>
                                            {isSelectedToday
                                                ? 'Selected for today\'s session'
                                                : isHistory
                                                    ? 'Completed workout'
                                                    : item.status === 'in_progress'
                                                        ? 'Workout is currently active'
                                                        : 'Tap card to use today'}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.openPill}
                                            onPress={(event) =>
                                                isHistory
                                                    ? handleViewSummary(event, item.id)
                                                    : handleOpenWorkout(event, item)
                                            }
                                        >
                                            <Text style={styles.openPillText}>
                                                {isHistory
                                                    ? 'View Summary'
                                                    : item.status === 'in_progress'
                                                        ? 'Continue'
                                                        : 'Open'}
                                            </Text>
                                            <Icon.Ionicons name="chevron-forward" size={16} color={colors.bg} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            {!isHistory ? (
                <TouchableOpacity
                    style={[styles.floatingButton, { bottom: Math.max(insets.bottom, 20) }]}
                    onPress={() =>
                        navigation.navigate('WorkoutDetails', {
                            isDraft: true,
                            title: 'New Workout',
                            date: new Date().toISOString().slice(0, 10),
                        })
                    }
                >
                    <Icon.Ionicons name="add" size={20} color={colors.bg} />
                    <Text style={styles.floatingButtonText}>Add Workout</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

function getStatusLabel(status: WorkoutStatus) {
    switch (status) {
        case 'finished':
            return 'Finished';
        case 'in_progress':
            return 'In Progress';
        default:
            return 'Planned';
    }
}

function getStatusBadgeStyle(status: WorkoutStatus) {
    switch (status) {
        case 'finished':
            return { backgroundColor: '#16311C', borderColor: '#2E7D32' };
        case 'in_progress':
            return { backgroundColor: '#2A220E', borderColor: '#D4A017' };
        default:
            return { backgroundColor: '#181818', borderColor: '#2A2A2A' };
    }
}

function getStatusTextStyle(status: WorkoutStatus) {
    switch (status) {
        case 'finished':
            return { color: '#86EFAC' };
        case 'in_progress':
            return { color: '#FCD34D' };
        default:
            return { color: colors.text };
    }
}

function formatFriendlyDate(date: string) {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return date;
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.accent,
    },
    subtitle: {
        marginTop: spacing.xs,
        color: colors.sub,
        textAlign: 'center',
    },
    segmentedControl: {
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        backgroundColor: '#111111',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#242424',
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentButtonActive: {
        backgroundColor: colors.accent,
    },
    segmentButtonText: {
        color: colors.sub,
        fontSize: 14,
        fontWeight: '800',
    },
    segmentButtonTextActive: {
        color: colors.bg,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: 100,
    },
    listContent: {
        paddingBottom: spacing.sm,
    },
    emptyCard: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtitle: {
        color: colors.sub,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    workoutCard: {
        backgroundColor: '#121212',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#232323',
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    workoutImage: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        marginBottom: spacing.md,
        backgroundColor: '#1A1A1A',
    },
    workoutCardFinished: {
        borderColor: '#244B2A',
        backgroundColor: '#111B14',
    },
    workoutCardInProgress: {
        borderColor: '#D4A017',
        backgroundColor: '#1B1810',
    },
    workoutCardSelected: {
        borderColor: colors.accent,
        borderWidth: 2,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    workoutHeaderLeft: {
        flex: 1,
        paddingRight: spacing.md,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: spacing.sm,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    todayBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    todayBadgeText: {
        color: colors.bg,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    workoutName: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    deleteIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    workoutDate: {
        color: colors.sub,
        marginBottom: spacing.xs,
    },
    summaryText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerHint: {
        flex: 1,
        color: colors.sub,
        paddingRight: spacing.md,
    },
    openPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    openPillText: {
        color: colors.bg,
        fontWeight: '800',
    },
    floatingButton: {
        position: 'absolute',
        alignSelf: 'center',
        backgroundColor: colors.accent,
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        elevation: 6,
    },
    floatingButtonText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
});
