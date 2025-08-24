// screens/StatsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { Ionicons } from '@expo/vector-icons';
import CircularProgress from 'react-native-circular-progress-indicator';
import GradientCard from '../components/GradientCard';

export default function StatsScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* Title */}
                <Text style={styles.title}>Stats</Text>

                {/* Weekly Progress */}
                <Card>
                    <Text style={styles.cardTitle}>Weekly Progress</Text>
                    <View style={{ alignItems: 'center', marginVertical: 12 }}>
                        <CircularProgress
                            value={5}
                            maxValue={12}
                            radius={60}
                            activeStrokeWidth={12}
                            inActiveStrokeWidth={12}
                            activeStrokeColor={colors.accent}
                            inActiveStrokeColor="#333"
                            showProgressValue={false} // išjungiam default tekstą
                            title={`${Math.round((5 / 12) * 100)}%`}
                            titleColor="#fff"
                            titleStyle={{ fontSize: 18, fontWeight: 'bold' }}
                        />
                        <Text style={{ color: colors.sub, marginTop: 8 }}>
                            Workouts this month: 5/12
                        </Text>
                    </View>
                </Card>

                {/* Workouts Overview */}
                <Card style={styles.largeCard}>
                    <Text style={styles.cardTitle}>Workouts Overview</Text>
                    <View style={styles.row}>
                        <View style={styles.statBox}>
                            <Ionicons name="barbell" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>15</Text>
                            <Text style={styles.statLabel}>Workouts</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="calendar" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>Aug 18</Text>
                            <Text style={styles.statLabel}>Last</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="time" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>55m</Text>
                            <Text style={styles.statLabel}>Avg</Text>
                        </View>
                    </View>
                </Card>

                {/* Exercises Stats */}
                <Card style={styles.largeCard}>
                    <Text style={styles.cardTitle}>Exercises Stats</Text>
                    <View style={styles.row}>
                        <View style={styles.statBox}>
                            <Ionicons name="list" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>42</Text>
                            <Text style={styles.statLabel}>Exercises</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="flame" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>Bench</Text>
                            <Text style={styles.statLabel}>Most Used</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="repeat" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>230/1800</Text>
                            <Text style={styles.statLabel}>Sets/Reps</Text>
                        </View>
                    </View>
                </Card>

                {/* Personal Records */}
                <Card style={styles.largeCard}>
                    <Text style={styles.cardTitle}>Personal Records</Text>
                    <View style={styles.row}>
                        <View style={styles.statBox}>
                            <Ionicons name="trophy" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>28</Text>
                            <Text style={styles.statLabel}>Most Sets</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="barbell" size={28} color={colors.accent} />
                            <Text style={styles.statNumber}>120</Text>
                            <Text style={styles.statLabel}>Most Reps</Text>
                        </View>
                    </View>
                </Card>

                {/* Motivation */}
                <Card style={{ ...styles.motivationCard, ...styles.largeCard }}>
                    <View style={styles.motivationRow}>
                        <Ionicons name="flame" size={20} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.motivationText}>You already did 5 workouts this month!</Text>
                    </View>
                    <ProgressBar progress={0.4} target={12} label="Target: 12 workouts" />
                </Card>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
        padding: 16,
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
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statLabel: {
        color: colors.sub,
        fontSize: 14,
    },
    highlightCard: {
        backgroundColor: '#222',
    },
    highlightTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.accent,
        marginBottom: 8,
    },
    highlightItem: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 4,
    },
    motivationCard: {
        backgroundColor: '#1e2a1e',
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
        marginBottom: 8,
    },
    largeCard: {
        paddingVertical: 24,
    },
});