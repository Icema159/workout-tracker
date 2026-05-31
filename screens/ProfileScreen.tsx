import React, { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Subtitle, Title } from '../components/Ui';
import { colors, spacing } from '../theme';
import GradientCard from '../components/GradientCard';
import { getWorkoutWithExercises } from '../lib/workouts';

type WorkoutWithExercises = Awaited<ReturnType<typeof getWorkoutWithExercises>>;

export default function ProfileScreen() {
    const [workouts, setWorkouts] = useState<WorkoutWithExercises>([]);
    const userName = 'Aismantas';

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

    const summary = useMemo(() => {
        const exercises = workouts.flatMap((workout) => workout.exercises);
        const trainingDays = new Set(workouts.map((workout) => workout.date));

        return {
            totalWorkouts: workouts.length,
            trainingDays: trainingDays.size,
            totalExercises: exercises.length,
            latestWorkout: workouts[0]?.date ?? 'No workouts yet',
        };
    }, [workouts]);

    return (
        <Screen style={styles.screen}>
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/100/111111/C7EA46?text=AT' }}
                    style={styles.avatar}
                />
                <View style={styles.headerText}>
                    <Title style={styles.title}>Welcome back, {userName}</Title>
                    <Subtitle style={styles.subtitle}>Your local training profile</Subtitle>
                </View>
            </View>

            <GradientCard style={styles.card}>
                <Text style={styles.metricLabel}>Total workouts</Text>
                <Text style={styles.metricValue}>{summary.totalWorkouts}</Text>
            </GradientCard>

            <GradientCard style={styles.card}>
                <Text style={styles.metricLabel}>Training days logged</Text>
                <Text style={styles.metricValue}>{summary.trainingDays}</Text>
            </GradientCard>

            <GradientCard style={styles.card}>
                <Text style={styles.metricLabel}>Exercises recorded</Text>
                <Text style={styles.metricValue}>{summary.totalExercises}</Text>
            </GradientCard>

            <GradientCard style={styles.card}>
                <Text style={styles.metricLabel}>Latest workout date</Text>
                <Text style={styles.metricValue}>{summary.latestWorkout}</Text>
            </GradientCard>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerText: {
        marginLeft: spacing.md,
        flex: 1,
    },
    title: {
        marginBottom: spacing.xs,
    },
    subtitle: {
        marginBottom: 0,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.accent,
    },
    card: {
        marginBottom: spacing.md,
    },
    metricLabel: {
        color: colors.sub,
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    metricValue: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '700',
        marginTop: spacing.sm,
    },
});
