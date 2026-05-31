import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Title } from '../components/Ui';
import { colors, spacing } from '../theme';
import { getWorkoutWithExercises } from '../lib/workouts';
import { RootStackParamList } from '../navigation/types';
import { clearSelectedTodayWorkoutId, getSelectedTodayWorkoutId } from '../lib/selectedTodayWorkout';

LocaleConfig.locales.en = {
    monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    today: 'Today',
};
LocaleConfig.defaultLocale = 'en';

type WorkoutWithExercises = Awaited<ReturnType<typeof getWorkoutWithExercises>>[number];

export default function HomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const today = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
    const [selectedTodayWorkoutId, setSelectedTodayWorkoutId] = useState<string | null>(null);
    const [isStartingWorkout, setIsStartingWorkout] = useState(false);
    const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

    const loadData = useCallback(async () => {
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
            console.error('Failed to load home data', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const markedDates = useMemo(() => {
        const marked = workouts.reduce<Record<string, {
            marked?: boolean;
            dotColor?: string;
            selected?: boolean;
            selectedColor?: string;
            selectedTextColor?: string;
            customStyles?: {
                container?: object;
                text?: object;
            };
        }>>(
            (accumulator, workout) => {
                accumulator[workout.date] = {
                    ...(accumulator[workout.date] ?? {}),
                    marked: true,
                    dotColor: colors.accent,
                };

                return accumulator;
            },
            {}
        );

        marked[today] = {
            ...(marked[today] ?? {}),
            customStyles: {
                container: {
                    borderWidth: 1,
                    borderColor: colors.accent,
                    borderRadius: 999,
                },
                text: {
                    color: colors.text,
                    fontWeight: '700',
                },
            },
        };

        marked[selectedDate] = {
            ...(marked[selectedDate] ?? {}),
            selected: true,
            selectedColor: colors.accent,
            selectedTextColor: colors.bg,
            customStyles: {
                container: {
                    backgroundColor: colors.accent,
                    borderRadius: 999,
                },
                text: {
                    color: colors.bg,
                    fontWeight: '700',
                },
            },
        };

        return marked;
    }, [selectedDate, today, workouts]);

    const selectedDayWorkouts = workouts.filter((workout) => workout.date === selectedDate);
    const selectedTodayWorkout = workouts.find((workout) => workout.id === selectedTodayWorkoutId);
    const todayWorkout = selectedTodayWorkout ?? workouts.find((workout) => workout.date === today);
    const currentWeekCount = workouts.filter((workout) => isDateInCurrentWeek(workout.date)).length;
    const totalExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0);
    const recentWorkouts = workouts.slice(0, 3);
    const currentWeekDates = getWeekDates(today);

    const statCards = [
        { label: 'This Week', value: `${currentWeekCount} workouts` },
        { label: 'Saved Sessions', value: `${workouts.length} total` },
        { label: 'Exercises Logged', value: `${totalExercises} total` },
    ];

    const handleStartWorkout = async () => {
        setIsStartingWorkout(true);

        try {
            if (todayWorkout) {
                navigation.navigate('TodayWorkout', {
                    workoutId: todayWorkout.id,
                    title: todayWorkout.name,
                    date: todayWorkout.date,
                    exerciseCount: todayWorkout.exercises.length,
                });
                return;
            }

            navigation.navigate('WorkoutDetails', {
                isDraft: true,
                title: `Workout ${formatDisplayDate(today)}`,
                date: today,
            });
        } catch (error) {
            console.error('Failed to start workout', error);
            Alert.alert('Error', 'Failed to start a new workout.');
        } finally {
            setIsStartingWorkout(false);
        }
    };

    const handleCreateNewWorkout = async () => {
        setIsCreatingWorkout(true);

        try {
            navigation.navigate('WorkoutDetails', {
                isDraft: true,
                title: `Workout ${formatDisplayDate(today)}`,
                date: today,
            });
        } catch (error) {
            console.error('Failed to create workout', error);
            Alert.alert('Error', 'Failed to create a new workout.');
        } finally {
            setIsCreatingWorkout(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <LinearGradient colors={['#C7EA46', '#8CC63F']} style={styles.heroCard}>
                    <Text style={styles.heroEyebrow}>Today</Text>
                    <Title style={styles.heroTitle}>
                        {todayWorkout ? 'Today\'s workout is ready.' : 'No workout planned yet.'}
                    </Title>
                    <Text style={styles.heroSubtitle}>
                        {todayWorkout
                            ? selectedTodayWorkout
                                ? 'This selected workout is ready for today. Open it and start logging your session.'
                                : 'Open your active session and keep logging exercises, sets, reps, and weight.'
                            : 'Create today\'s session in one tap and start filling it out immediately.'}
                    </Text>

                    <View style={styles.todayFocusCard}>
                        <View style={styles.todayFocusHeader}>
                            <View style={styles.todayBadge}>
                                <Text style={styles.todayBadgeText}>Current focus</Text>
                            </View>
                            <Text style={styles.todayFocusDate}>{formatLongDate(today)}</Text>
                        </View>
                        {todayWorkout ? (
                            <>
                                <Text style={styles.todayWorkoutName}>{todayWorkout.name}</Text>
                                <Text style={styles.todayWorkoutMeta}>
                                    {selectedTodayWorkout
                                        ? `${todayWorkout.exercises.length} exercises selected for today`
                                        : `${todayWorkout.exercises.length} exercises logged so far`}
                                </Text>
                                <TouchableOpacity
                                    style={styles.inlineOpenButton}
                                    onPress={handleStartWorkout}
                                    disabled={isStartingWorkout}
                                >
                                    <Text style={styles.inlineOpenText}>
                                        {isStartingWorkout ? 'Opening...' : 'Open Today\'s Workout'}
                                    </Text>
                                    <Icon.Ionicons name="arrow-forward" size={16} color="#111111" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.todayWorkoutName}>No session created for today</Text>
                                <Text style={styles.todayWorkoutMeta}>
                                    Create one now so your next exercise entry has a clear destination.
                                </Text>
                            </>
                        )}
                    </View>

                    <View style={styles.heroActions}>
                        {!todayWorkout ? (
                            <TouchableOpacity style={styles.primaryAction} onPress={handleStartWorkout} disabled={isStartingWorkout}>
                                <Text style={styles.primaryActionText}>
                                    {isStartingWorkout ? 'Opening...' : 'Start Workout'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={[styles.secondaryAction, todayWorkout && styles.secondaryActionFullWidth]}
                            onPress={handleCreateNewWorkout}
                            disabled={isCreatingWorkout}
                        >
                            <Text style={styles.secondaryActionText}>
                                {isCreatingWorkout ? 'Creating...' : 'Create New Workout'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.header}>
                    <Title style={styles.greeting}>Dashboard</Title>
                    <Text style={styles.subtitle}>Your training overview, synced from local workout history.</Text>
                </View>

                <View style={styles.calendarCard}>
                    <TouchableOpacity style={styles.calendarHeader} onPress={() => setIsCalendarExpanded((value) => !value)}>
                        <Text style={styles.calendarTitle}>Calendar</Text>
                        <Icon.Ionicons
                            name={isCalendarExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                    {isCalendarExpanded ? (
                        <Calendar
                            markedDates={markedDates}
                            onDayPress={(day) => setSelectedDate(day.dateString)}
                            firstDay={1}
                            hideExtraDays
                            enableSwipeMonths
                            markingType="custom"
                            theme={{
                                backgroundColor: '#161616',
                                calendarBackground: '#161616',
                                monthTextColor: colors.text,
                                textSectionTitleColor: colors.sub,
                                dayTextColor: colors.text,
                                todayTextColor: colors.accent,
                                arrowColor: colors.accent,
                                textDisabledColor: '#555555',
                                selectedDayBackgroundColor: colors.accent,
                                selectedDayTextColor: colors.bg,
                            }}
                        />
                    ) : (
                        <View style={styles.weekStrip}>
                            {currentWeekDates.map((dateString) => {
                                const isSelected = selectedDate === dateString;
                                const isToday = today === dateString;
                                const hasWorkout = workouts.some((workout) => workout.date === dateString);

                                return (
                                    <TouchableOpacity
                                        key={dateString}
                                        style={[
                                            styles.weekDayButton,
                                            isSelected && styles.weekDayButtonSelected,
                                            isToday && !isSelected && styles.weekDayButtonToday,
                                        ]}
                                        onPress={() => setSelectedDate(dateString)}
                                    >
                                        <Text
                                            style={[
                                                styles.weekDayLabel,
                                                isSelected && styles.weekDayLabelSelected,
                                            ]}
                                        >
                                            {formatWeekdayShort(dateString)}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.weekDayNumber,
                                                isSelected && styles.weekDayLabelSelected,
                                            ]}
                                        >
                                            {formatDayNumber(dateString)}
                                        </Text>
                                        <View
                                            style={[
                                                styles.weekDayDot,
                                                hasWorkout && styles.weekDayDotActive,
                                                isSelected && styles.weekDayDotSelected,
                                            ]}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsRow}
                >
                    {statCards.map((item) => (
                        <LinearGradient key={item.label} colors={['#1A1A1A', '#0D0D0D']} style={styles.statCard}>
                            <Text style={styles.statLabel}>{item.label}</Text>
                            <Text style={styles.statValue}>{item.value}</Text>
                        </LinearGradient>
                    ))}
                </ScrollView>

                <View style={styles.section}>
                    <Title style={styles.sectionTitle}>Selected Day</Title>
                    {selectedDayWorkouts.length === 0 ? (
                        <Text style={styles.emptyText}>No workouts saved for {selectedDate}.</Text>
                    ) : (
                        selectedDayWorkouts.map((workout) => (
                            <TouchableOpacity
                                key={workout.id}
                                activeOpacity={0.85}
                                onPress={() =>
                                    navigation.navigate('WorkoutDetails', {
                                        workoutId: workout.id,
                                        title: workout.name,
                                    })
                                }
                            >
                                <LinearGradient colors={['#1A1A1A', '#0D0D0D']} style={styles.workoutCard}>
                                    <View>
                                        <Text style={styles.workoutName}>{workout.name}</Text>
                                        <Text style={styles.workoutMeta}>{workout.exercises.length} exercises</Text>
                                    </View>
                                    <Text style={styles.workoutDate}>{workout.date}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Title style={styles.sectionTitle}>Recent Workouts</Title>
                    {recentWorkouts.length === 0 ? (
                        <Text style={styles.emptyText}>Create a workout to populate your dashboard.</Text>
                    ) : (
                        recentWorkouts.map((workout) => (
                            <TouchableOpacity
                                key={workout.id}
                                activeOpacity={0.85}
                                onPress={() =>
                                    navigation.navigate('WorkoutDetails', {
                                        workoutId: workout.id,
                                        title: workout.name,
                                    })
                                }
                            >
                                <LinearGradient colors={['#1A1A1A', '#0D0D0D']} style={styles.workoutCard}>
                                    <View>
                                        <Text style={styles.workoutName}>{workout.name}</Text>
                                        <Text style={styles.workoutMeta}>
                                            {workout.exercises.length} exercises logged
                                        </Text>
                                    </View>
                                    <Text style={styles.workoutDate}>{formatDisplayDate(workout.date)}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function isDateInCurrentWeek(dateString: string) {
    const today = new Date();
    const currentDay = today.getDay() || 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const target = new Date(`${dateString}T12:00:00`);

    return target >= startOfWeek && target <= endOfWeek;
}

function formatDisplayDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function formatLongDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function getWeekDates(dateString: string) {
    const baseDate = new Date(`${dateString}T12:00:00`);
    const currentDay = baseDate.getDay() || 7;
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - currentDay + 1);

    return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + index);
        return day.toISOString().slice(0, 10);
    });
}

function formatWeekdayShort(dateString: string) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
    });
}

function formatDayNumber(dateString: string) {
    return new Date(`${dateString}T12:00:00`).getDate().toString();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    content: {
        paddingHorizontal: spacing.md,
        paddingBottom: 100,
    },
    heroCard: {
        borderRadius: 24,
        padding: spacing.xl,
        marginTop: spacing.md,
    },
    heroEyebrow: {
        color: '#243700',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    heroTitle: {
        color: '#111111',
        fontSize: 34,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        color: '#243700',
        fontSize: 15,
        lineHeight: 22,
    },
    todayFocusCard: {
        marginTop: spacing.lg,
        backgroundColor: 'rgba(17,17,17,0.14)',
        borderRadius: 20,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(17,17,17,0.12)',
    },
    todayFocusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    todayBadge: {
        backgroundColor: '#111111',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    todayBadgeText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    todayFocusDate: {
        color: '#243700',
        fontWeight: '700',
    },
    todayWorkoutName: {
        color: '#111111',
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    todayWorkoutMeta: {
        color: '#243700',
        marginTop: spacing.xs,
        fontSize: 15,
        lineHeight: 22,
    },
    inlineOpenButton: {
        marginTop: spacing.lg,
        backgroundColor: '#F5FFD1',
        borderRadius: 14,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineOpenText: {
        color: '#111111',
        fontWeight: '700',
    },
    heroActions: {
        flexDirection: 'row',
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    primaryAction: {
        flex: 1,
        backgroundColor: '#111111',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryActionText: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryAction: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(17,17,17,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(17,17,17,0.18)',
    },
    secondaryActionText: {
        color: '#111111',
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryActionFullWidth: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    greeting: {
        fontSize: 34,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        color: colors.sub,
        textAlign: 'center',
    },
    calendarCard: {
        borderRadius: 18,
        backgroundColor: '#161616',
        padding: spacing.md,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    calendarTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    weekStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    weekDayButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#262626',
    },
    weekDayButtonSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    weekDayButtonToday: {
        borderColor: colors.accent,
    },
    weekDayLabel: {
        color: colors.sub,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    weekDayNumber: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 4,
    },
    weekDayLabelSelected: {
        color: colors.bg,
    },
    weekDayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'transparent',
        marginTop: 6,
    },
    weekDayDotActive: {
        backgroundColor: colors.accent,
    },
    weekDayDotSelected: {
        backgroundColor: colors.bg,
    },
    statsRow: {
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    statCard: {
        width: 180,
        borderRadius: 16,
        padding: spacing.lg,
    },
    statLabel: {
        color: colors.sub,
        textTransform: 'uppercase',
        fontSize: 12,
        letterSpacing: 0.8,
    },
    statValue: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '700',
        marginTop: spacing.sm,
    },
    section: {
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: 22,
        marginBottom: spacing.sm,
    },
    emptyText: {
        color: colors.sub,
        marginTop: spacing.sm,
    },
    workoutCard: {
        borderRadius: 14,
        padding: spacing.md,
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workoutName: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '600',
    },
    workoutMeta: {
        color: colors.sub,
        marginTop: 4,
    },
    workoutDate: {
        color: colors.accent,
        fontWeight: '600',
    },
});
