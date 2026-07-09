import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    Dimensions,
    LayoutChangeEvent,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
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
type NormalizedExercise = ReturnType<typeof normalizeExercise>;
type SetEditorTarget = {
    exerciseId: string;
    setId: string;
    exerciseName: string;
    setIndex: number;
    reps: string;
    weight: string;
};
type SetEditorField = 'weight' | 'reps';

const REST_DURATION_SECONDS = 90;
const SET_EDITOR_MAX_HEIGHT = Dimensions.get('window').height * 0.55;
const ACTIVE_WORKOUT_KEEP_AWAKE_TAG = 'active-workout-screen';
const REST_NOTIFICATION_CHANNEL_ID = 'rest-timer';

export default function ActiveWorkoutScreen({ route, navigation }: Props) {
    const { workoutId } = route.params;
    const scrollViewRef = useRef<ScrollView>(null);
    const exerciseLayoutY = useRef<Record<string, number>>({});
    const setLayoutY = useRef<Record<string, number>>({});
    const restNotificationIdRef = useRef<string | null>(null);
    const restNotificationRequestRef = useRef(0);
    const [workoutName, setWorkoutName] = useState(route.params.title);
    const [workoutDate, setWorkoutDate] = useState(
        route.params.date ?? new Date().toISOString().slice(0, 10)
    );
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);
    const [workoutStartedAt] = useState(() => Date.now());
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
    const [pausedRestSeconds, setPausedRestSeconds] = useState<number | null>(null);
    const [isRestTimerVisible, setIsRestTimerVisible] = useState(false);
    const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
    const [setEditorTarget, setSetEditorTarget] = useState<SetEditorTarget | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                setNowMs(Date.now());
            }
        });

        return () => subscription.remove();
    }, []);

    const elapsedSeconds = useMemo(
        () => getElapsedSeconds(workoutStartedAt, nowMs),
        [nowMs, workoutStartedAt]
    );

    const restSeconds = useMemo(() => {
        if (!isRestTimerVisible) {
            return REST_DURATION_SECONDS;
        }

        if (isRestTimerRunning && restEndsAt) {
            return getRemainingRestSeconds(restEndsAt, nowMs);
        }

        if (pausedRestSeconds !== null) {
            return pausedRestSeconds;
        }

        return restEndsAt ? getRemainingRestSeconds(restEndsAt, nowMs) : REST_DURATION_SECONDS;
    }, [isRestTimerRunning, isRestTimerVisible, nowMs, pausedRestSeconds, restEndsAt]);

    useEffect(() => {
        if (isRestTimerRunning && restEndsAt && nowMs >= restEndsAt) {
            setIsRestTimerRunning(false);
            setPausedRestSeconds(null);
        }
    }, [isRestTimerRunning, nowMs, restEndsAt]);

    const cancelRestNotification = useCallback(async () => {
        restNotificationRequestRef.current += 1;

        const notificationId = restNotificationIdRef.current;
        restNotificationIdRef.current = null;

        if (!notificationId) {
            return;
        }

        try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
            console.warn('Failed to cancel rest notification', error);
        }
    }, []);

    const ensureRestNotificationPermissions = useCallback(async () => {
        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync(REST_NOTIFICATION_CHANNEL_ID, {
                    name: 'Rest timer',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: 'default',
                });
            }

            const existingPermissions = await Notifications.getPermissionsAsync();
            let finalStatus = existingPermissions.status;

            if (finalStatus !== 'granted') {
                const requestedPermissions = await Notifications.requestPermissionsAsync();
                finalStatus = requestedPermissions.status;
            }

            return finalStatus === 'granted';
        } catch (error) {
            console.warn('Failed to request notification permissions', error);
            return false;
        }
    }, []);

    const scheduleRestNotification = useCallback(async (endsAt: number) => {
        await cancelRestNotification();

        const requestId = restNotificationRequestRef.current + 1;
        restNotificationRequestRef.current = requestId;

        const hasPermission = await ensureRestNotificationPermissions();

        if (!hasPermission || restNotificationRequestRef.current !== requestId) {
            return;
        }

        const secondsUntilRestComplete = getRemainingRestSeconds(endsAt);

        if (secondsUntilRestComplete <= 0) {
            return;
        }

        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Rest complete',
                    body: 'Time for your next set.',
                    sound: 'default',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilRestComplete,
                    channelId: REST_NOTIFICATION_CHANNEL_ID,
                },
            });

            if (restNotificationRequestRef.current === requestId) {
                restNotificationIdRef.current = notificationId;
            } else {
                await Notifications.cancelScheduledNotificationAsync(notificationId);
            }
        } catch (error) {
            console.warn('Failed to schedule rest notification', error);
        }
    }, [cancelRestNotification, ensureRestNotificationPermissions]);

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
            void activateKeepAwakeAsync(ACTIVE_WORKOUT_KEEP_AWAKE_TAG).catch((error) => {
                console.warn('Failed to activate keep awake', error);
            });
            loadWorkoutData();

            return () => {
                void deactivateKeepAwake(ACTIVE_WORKOUT_KEEP_AWAKE_TAG).catch((error) => {
                    console.warn('Failed to deactivate keep awake', error);
                });
                void cancelRestNotification();
            };
        }, [cancelRestNotification, loadWorkoutData])
    );

    useEffect(() => {
        return () => {
            void cancelRestNotification();
        };
    }, [cancelRestNotification]);

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

    const startRestTimer = () => {
        const now = Date.now();
        const nextRestEndsAt = now + REST_DURATION_SECONDS * 1000;

        setNowMs(now);
        setRestEndsAt(nextRestEndsAt);
        setPausedRestSeconds(null);
        setIsRestTimerVisible(true);
        setIsRestTimerRunning(true);
        void scheduleRestNotification(nextRestEndsAt);
    };

    const pauseRestTimer = () => {
        const remainingSeconds = restEndsAt
            ? getRemainingRestSeconds(restEndsAt, Date.now())
            : restSeconds;

        setNowMs(Date.now());
        setPausedRestSeconds(remainingSeconds);
        setRestEndsAt(null);
        setIsRestTimerRunning(false);
        void cancelRestNotification();
    };

    const resumeRestTimer = () => {
        if (pausedRestSeconds === null || pausedRestSeconds <= 0) {
            return;
        }

        const now = Date.now();
        const nextRestEndsAt = now + pausedRestSeconds * 1000;

        setNowMs(now);
        setRestEndsAt(nextRestEndsAt);
        setPausedRestSeconds(null);
        setIsRestTimerVisible(true);
        setIsRestTimerRunning(true);
        void scheduleRestNotification(nextRestEndsAt);
    };

    const resetRestTimer = () => {
        const now = Date.now();
        const nextRestEndsAt = now + REST_DURATION_SECONDS * 1000;

        setNowMs(now);
        setRestEndsAt(nextRestEndsAt);
        setPausedRestSeconds(null);
        setIsRestTimerVisible(true);
        setIsRestTimerRunning(true);
        void scheduleRestNotification(nextRestEndsAt);
    };

    const skipRestTimer = () => {
        setNowMs(Date.now());
        setRestEndsAt(null);
        setPausedRestSeconds(null);
        setIsRestTimerRunning(false);
        setIsRestTimerVisible(false);
        void cancelRestNotification();
    };

    const getSetRowKey = (exerciseId: string, setIndex: number) => `${exerciseId}-${setIndex}`;

    const handleToggleSetCompletion = async (exerciseId: string, setEntry: SetEntry) => {
        const nextCompleted = !setEntry.completed;

        await updateSetEntry(exerciseId, setEntry.id, {
            completed: nextCompleted,
        });

        if (nextCompleted) {
            startRestTimer();
        }
    };

    const scrollSelectedSetIntoView = (exerciseId: string, setIndex: number) => {
        const exerciseY = exerciseLayoutY.current[exerciseId];
        const setY = setLayoutY.current[getSetRowKey(exerciseId, setIndex)];

        if (exerciseY === undefined || setY === undefined) {
            return;
        }

        const targetOffset = Math.max(0, exerciseY + setY - 220);

        scrollViewRef.current?.scrollTo({
            y: targetOffset,
            animated: true,
        });
    };

    const openSetEditor = (
        exerciseId: string,
        exerciseName: string,
        setEntry: SetEntry,
        setIndex: number
    ) => {
        scrollSelectedSetIntoView(exerciseId, setIndex);

        setTimeout(() => {
            setSetEditorTarget({
                exerciseId,
                setId: setEntry.id,
                exerciseName,
                setIndex,
                reps: setEntry.reps,
                weight: setEntry.weight,
            });
        }, 120);
    };

    const handleSaveSetEditor = async (reps: string, weight: string) => {
        if (!setEditorTarget) {
            return;
        }

        await updateSetEntry(setEditorTarget.exerciseId, setEditorTarget.setId, {
            reps,
            weight,
        });
        setSetEditorTarget(null);
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
        const currentDurationSeconds = getElapsedSeconds(workoutStartedAt);

        Alert.alert(
            'Finish workout?',
            `${summary.completedSets}/${summary.totalSets} sets completed in ${formatElapsed(currentDurationSeconds)}.`,
            [
                { text: 'Keep Training', style: 'cancel' },
                {
                    text: 'Finish Workout',
                    onPress: async () => {
                        setIsSavingWorkout(true);

                        try {
                            await cancelRestNotification();
                            await saveExercises(workoutId, normalizedExercises);
                            const existingWorkout = (await getWorkouts()).find((item) => item.id === workoutId);

                            if (existingWorkout) {
                                const finishedDurationSeconds = getElapsedSeconds(workoutStartedAt);

                                await upsertWorkout({
                                    ...existingWorkout,
                                    status: 'finished',
                                    completedAt: new Date().toISOString(),
                                    durationSeconds: finishedDurationSeconds,
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
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.content}
            >
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

                        {isRestTimerVisible ? (
                            <GradientCard style={
                                restSeconds === 0 ? styles.restTimerCardComplete : styles.restTimerCard
                            }>
                                <View style={styles.restTimerHeader}>
                                    <View>
                                        <Text style={styles.restTimerLabel}>
                                            {restSeconds === 0 ? 'Rest complete' : 'Rest timer'}
                                        </Text>
                                        <Text style={styles.restTimerSubtext}>
                                            {restSeconds === 0
                                                ? 'Ready for the next set.'
                                                : 'Next set starts when you are ready.'}
                                        </Text>
                                    </View>
                                    <Text style={[
                                        styles.restTimerTime,
                                        restSeconds === 0 && styles.restTimerTimeComplete,
                                    ]}>
                                        {formatRestTime(restSeconds)}
                                    </Text>
                                </View>
                                <View style={styles.restTimerControls}>
                                    <TouchableOpacity
                                        style={[
                                            styles.restTimerButton,
                                            !isRestTimerRunning && styles.restTimerButtonDisabled,
                                        ]}
                                        onPress={pauseRestTimer}
                                        disabled={!isRestTimerRunning}
                                    >
                                        <Text style={styles.restTimerButtonText}>Pause</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.restTimerButton,
                                            (isRestTimerRunning || restSeconds === 0) && styles.restTimerButtonDisabled,
                                        ]}
                                        onPress={resumeRestTimer}
                                        disabled={isRestTimerRunning || restSeconds === 0}
                                    >
                                        <Text style={styles.restTimerButtonText}>Resume</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.restTimerButton}
                                        onPress={resetRestTimer}
                                    >
                                        <Text style={styles.restTimerButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.restTimerButton, styles.restTimerSkipButton]}
                                        onPress={skipRestTimer}
                                    >
                                        <Text style={styles.restTimerSkipText}>Skip</Text>
                                    </TouchableOpacity>
                                </View>
                            </GradientCard>
                        ) : null}

                        <Text style={styles.sectionLabel}>Session exercises</Text>
                        {normalizedExercises.length === 0 ? (
                            <Text style={styles.emptyText}>
                                This workout has no exercises yet. Build it first in the create workout flow.
                            </Text>
                        ) : null}
                    </View>
                {normalizedExercises.map((item) => {
                    const completedSets = item.setEntries.filter((setEntry) => setEntry.completed).length;
                    const allCompleted = completedSets === item.setEntries.length && item.setEntries.length > 0;

                    return (
                        <View
                            key={item.id}
                            style={[styles.exerciseCard, allCompleted && styles.exerciseCardCompleted]}
                            onLayout={(event: LayoutChangeEvent) => {
                                exerciseLayoutY.current[item.id] = event.nativeEvent.layout.y;
                            }}
                        >
                            <View style={styles.exerciseHeader}>
                                <View style={styles.exerciseLeft}>
                                    <Text style={styles.exerciseName}>{item.name}</Text>
                                    <Text style={styles.exerciseMeta}>
                                        {completedSets}/{item.setEntries.length} sets completed
                                    </Text>
                                </View>
                            </View>

                            {item.setEntries.map((setEntry, index) => (
                                <TouchableOpacity
                                    key={setEntry.id}
                                    activeOpacity={0.88}
                                    style={styles.setRow}
                                    onPress={() => openSetEditor(item.id, item.name, setEntry, index)}
                                    onLayout={(event: LayoutChangeEvent) => {
                                        setLayoutY.current[getSetRowKey(item.id, index)] = event.nativeEvent.layout.y;
                                    }}
                                >
                                    <View style={styles.setIndexPill}>
                                        <Text style={styles.setIndexText}>Set {index + 1}</Text>
                                    </View>
                                    <View style={styles.setFields}>
                                        <View style={styles.setField}>
                                            <Text style={styles.setFieldLabel}>kg</Text>
                                            <TouchableOpacity
                                                style={styles.setValueChip}
                                                onPress={(event) => {
                                                    event.stopPropagation();
                                                    openSetEditor(item.id, item.name, setEntry, index);
                                                }}
                                            >
                                                <Text style={styles.setValueText} numberOfLines={1}>
                                                    {setEntry.weight ? `${setEntry.weight} kg` : '0 kg'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.setField}>
                                            <Text style={styles.setFieldLabel}>reps</Text>
                                            <TouchableOpacity
                                                style={styles.setValueChip}
                                                onPress={(event) => {
                                                    event.stopPropagation();
                                                    openSetEditor(item.id, item.name, setEntry, index);
                                                }}
                                            >
                                                <Text style={styles.setValueText} numberOfLines={1}>
                                                    {setEntry.reps || '0 reps'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.setActionButtons}>
                                        <TouchableOpacity
                                            style={[
                                                styles.checkButton,
                                                setEntry.completed && styles.checkButtonCompleted,
                                            ]}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                handleToggleSetCompletion(item.id, setEntry);
                                            }}
                                        >
                                            <Icon.Ionicons
                                                name={setEntry.completed ? 'checkmark' : 'ellipse-outline'}
                                                size={18}
                                                color={setEntry.completed ? colors.bg : colors.text}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteSetButton}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                deleteSetFromExercise(item.id, setEntry.id);
                                            }}
                                        >
                                            <Icon.Ionicons name="trash-outline" size={18} color="#F87171" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
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
                })}
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
            </ScrollView>
            <SetEditorModal
                visible={!!setEditorTarget}
                exerciseName={setEditorTarget?.exerciseName ?? ''}
                setIndex={setEditorTarget?.setIndex ?? 0}
                reps={setEditorTarget?.reps ?? ''}
                weight={setEditorTarget?.weight ?? ''}
                onCancel={() => setSetEditorTarget(null)}
                onSave={handleSaveSetEditor}
            />
        </Screen>
    );
}

function SetEditorModal({
    visible,
    exerciseName,
    setIndex,
    reps,
    weight,
    onCancel,
    onSave,
}: {
    visible: boolean;
    exerciseName: string;
    setIndex: number;
    reps: string;
    weight: string;
    onCancel: () => void;
    onSave: (reps: string, weight: string) => void;
}) {
    const [draftReps, setDraftReps] = useState('');
    const [draftWeight, setDraftWeight] = useState('');
    const [activeField, setActiveField] = useState<SetEditorField>('weight');
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            translateY.setValue(0);
            setDraftReps(reps);
            setDraftWeight(weight);
            setActiveField('weight');
        }
    }, [reps, translateY, visible, weight]);

    const snapModalBack = useCallback(() => {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 3,
        }).start();
    }, [translateY]);

    const closeFromDrag = useCallback(() => {
        Animated.timing(translateY, {
            toValue: 320,
            duration: 160,
            useNativeDriver: true,
        }).start(() => {
            onCancel();
            translateY.setValue(0);
        });
    }, [onCancel, translateY]);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onStartShouldSetPanResponderCapture: () => false,
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onMoveShouldSetPanResponderCapture: (_, gesture) =>
                    gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onPanResponderGrant: () => {
                    translateY.stopAnimation();
                },
                onPanResponderMove: (_, gesture) => {
                    translateY.setValue(Math.max(0, gesture.dy));
                },
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dy > 90 || gesture.vy > 0.8) {
                        closeFromDrag();
                        return;
                    }

                    snapModalBack();
                },
                onPanResponderTerminate: snapModalBack,
            }),
        [closeFromDrag, snapModalBack, translateY]
    );

    const updateReps = (step: number) => {
        setActiveField('reps');
        setDraftReps((current) => formatSetEditorNumber(Math.max(0, (parseFirstNumber(current) ?? 0) + step)));
    };

    const updateWeight = (step: number) => {
        setActiveField('weight');
        setDraftWeight((current) => formatSetEditorNumber(Math.max(0, (parseFirstNumber(current) ?? 0) + step)));
    };

    const clearActiveField = () => {
        if (activeField === 'weight') {
            setDraftWeight('');
        } else {
            setDraftReps('');
        }
    };

    const handleKeyPress = (key: string) => {
        if (key === 'backspace') {
            if (activeField === 'reps') {
                setDraftReps((current) => current.slice(0, -1));
            } else {
                setDraftWeight((current) => current.slice(0, -1));
            }

            return;
        }

        if (key === '.' && activeField !== 'weight') {
            return;
        }

        if (activeField === 'reps') {
            setDraftReps((current) => appendKeyToNumericText(current, key, 'reps'));
        } else {
            setDraftWeight((current) => appendKeyToNumericText(current, key, 'weight'));
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <Animated.View style={[styles.setEditorSheet, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetDragArea} {...panResponder.panHandlers}>
                        <View style={styles.sheetHandle} />
                    </View>
                    <View style={styles.setEditorHeader} {...panResponder.panHandlers}>
                        <View style={styles.setEditorTitleWrap}>
                            <Text style={styles.setEditorTitle} numberOfLines={1}>
                                {exerciseName} · Set {setIndex + 1}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={onCancel}>
                            <Icon.Ionicons name="close" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.editorValuesRow}>
                        <EditableValueCard
                            label="Weight"
                            value={draftWeight || '0'}
                            unit="kg"
                            isActive={activeField === 'weight'}
                            onPress={() => setActiveField('weight')}
                            onDecrease={() => updateWeight(-2.5)}
                            onIncrease={() => updateWeight(2.5)}
                        />
                        <EditableValueCard
                            label="Reps"
                            value={draftReps || '0'}
                            unit="reps"
                            isActive={activeField === 'reps'}
                            onPress={() => setActiveField('reps')}
                            onDecrease={() => updateReps(-1)}
                            onIncrease={() => updateReps(1)}
                        />
                    </View>

                    <NumericKeypad activeField={activeField} onPressKey={handleKeyPress} />

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.clearButton} onPress={clearActiveField}>
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveSetButton}
                            onPress={() => onSave(formatRepsForSave(draftReps), formatWeightForSave(draftWeight))}
                        >
                            <Text style={styles.saveSetButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

function EditableValueCard({
    label,
    value,
    unit,
    isActive,
    onPress,
    onDecrease,
    onIncrease,
}: {
    label: string;
    value: string;
    unit: string;
    isActive: boolean;
    onPress: () => void;
    onDecrease: () => void;
    onIncrease: () => void;
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.editableValueCard, isActive && styles.editableValueCardActive]}
            onPress={onPress}
        >
            <View style={styles.editableValueHeader}>
                <Text style={styles.stepperLabel}>{label}</Text>
                <View style={[
                    styles.activeDot,
                    isActive && styles.activeDotSelected,
                ]} />
            </View>
            <View style={styles.editableValueBody}>
                <TouchableOpacity style={styles.valueAdjustButton} onPress={onDecrease}>
                    <Icon.Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.editableValueWrap}>
                    <Text style={styles.editableValueText} numberOfLines={1}>{value}</Text>
                    <Text style={styles.stepperUnit}>{unit}</Text>
                </View>
                <TouchableOpacity style={[styles.valueAdjustButton, styles.valueAdjustButtonActive]} onPress={onIncrease}>
                    <Icon.Ionicons name="add" size={18} color={colors.bg} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

function NumericKeypad({
    activeField,
    onPressKey,
}: {
    activeField: SetEditorField;
    onPressKey: (key: string) => void;
}) {
    const keypadRows = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', 'backspace'],
    ];

    return (
        <View style={styles.keypadWrap}>
            {keypadRows.map((row) => (
                <View key={row.join('-')} style={styles.keypadRow}>
                    {row.map((key) => {
                        const isDecimalDisabled = key === '.' && activeField === 'reps';

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.keypadButton,
                                    isDecimalDisabled && styles.keypadButtonDisabled,
                                ]}
                                onPress={() => onPressKey(key)}
                                disabled={isDecimalDisabled}
                            >
                                {key === 'backspace' ? (
                                    <Icon.Ionicons name="backspace-outline" size={20} color={colors.text} />
                                ) : (
                                    <Text style={styles.keypadButtonText}>{key}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
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

function getElapsedSeconds(startedAt: number, now = Date.now()) {
    return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function getRemainingRestSeconds(restEndsAt: number, now = Date.now()) {
    return Math.max(0, Math.ceil((restEndsAt - now) / 1000));
}

function formatRestTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseFirstNumber(value?: string) {
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

function appendKeyToNumericText(value: string, key: string, field: SetEditorField) {
    if (key === '.') {
        if (field !== 'weight' || value.includes('.')) {
            return value;
        }

        return isDirectNumericInput(value) && value.length > 0 ? `${value}.` : '0.';
    }

    if (!/^\d$/.test(key)) {
        return value;
    }

    const shouldReplace = !isDirectNumericInput(value);
    const nextValue = shouldReplace ? key : `${value}${key}`;

    if (field === 'reps') {
        return stripLeadingZeros(nextValue);
    }

    return normalizeWeightDraft(nextValue);
}

function isDirectNumericInput(value: string) {
    if (value === '') {
        return true;
    }

    return /^\d*\.?\d*$/.test(value);
}

function stripLeadingZeros(value: string) {
    const stripped = value.replace(/^0+(?=\d)/, '');

    return stripped || '0';
}

function normalizeWeightDraft(value: string) {
    if (value.includes('.')) {
        const [integerPart, decimalPart = ''] = value.split('.');
        const normalizedInteger = stripLeadingZeros(integerPart || '0');
        return `${normalizedInteger}.${decimalPart}`;
    }

    return stripLeadingZeros(value);
}

function formatRepsForSave(value: string) {
    const parsed = parseFirstNumber(value);

    if (parsed === null) {
        return '';
    }

    return String(Math.max(0, Math.floor(parsed)));
}

function formatWeightForSave(value: string) {
    const parsed = parseFirstNumber(value);

    if (parsed === null) {
        return '';
    }

    return formatSetEditorNumber(Math.max(0, parsed));
}

function roundToSingleDecimal(value: number) {
    return Math.round(value * 10) / 10;
}

function formatSetEditorNumber(value: number) {
    const rounded = roundToSingleDecimal(value);

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
    restTimerCard: {
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#2F3D18',
    },
    restTimerCardComplete: {
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    restTimerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.md,
    },
    restTimerLabel: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    restTimerSubtext: {
        color: colors.sub,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    restTimerTime: {
        color: colors.text,
        fontSize: 30,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    restTimerTimeComplete: {
        color: colors.accent,
    },
    restTimerControls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    restTimerButton: {
        minWidth: 72,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        backgroundColor: '#171717',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    restTimerButtonDisabled: {
        opacity: 0.42,
    },
    restTimerButtonText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
    },
    restTimerSkipButton: {
        borderColor: '#3A1A1A',
        backgroundColor: '#1A1010',
    },
    restTimerSkipText: {
        color: '#FCA5A5',
        fontSize: 12,
        fontWeight: '800',
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
    setValueChip: {
        backgroundColor: '#101010',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 46,
        justifyContent: 'center',
    },
    setValueText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    setEditorSheet: {
        maxHeight: SET_EDITOR_MAX_HEIGHT,
        backgroundColor: '#0D0D0D',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#242424',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    sheetDragArea: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 999,
        backgroundColor: '#343434',
    },
    setEditorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    setEditorTitleWrap: {
        flex: 1,
    },
    setEditorTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#171717',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editorValuesRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    editableValueCard: {
        flex: 1,
        minHeight: 92,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: spacing.xs,
    },
    editableValueCardActive: {
        borderColor: colors.accent,
        backgroundColor: '#141D0B',
    },
    editableValueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    stepperLabel: {
        color: colors.sub,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333333',
    },
    activeDotSelected: {
        backgroundColor: colors.accent,
    },
    editableValueBody: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    valueAdjustButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#181818',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueAdjustButtonActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    editableValueWrap: {
        flex: 1,
        minHeight: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editableValueText: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    stepperUnit: {
        color: colors.sub,
        fontSize: 11,
        fontWeight: '800',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    keypadWrap: {
        gap: 7,
        marginBottom: spacing.sm,
    },
    keypadRow: {
        flexDirection: 'row',
        gap: 7,
    },
    keypadButton: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    keypadButtonDisabled: {
        opacity: 0.28,
    },
    keypadButtonText: {
        color: colors.text,
        fontSize: 21,
        fontWeight: '900',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    clearButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        backgroundColor: '#171717',
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButtonText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
    },
    saveSetButton: {
        flex: 1,
        borderRadius: 14,
        backgroundColor: colors.accent,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveSetButtonText: {
        color: colors.bg,
        fontSize: 15,
        fontWeight: '900',
    },
});
