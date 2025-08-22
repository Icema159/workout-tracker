// components/ProgressBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = {
    progress: number; // 0 - 1
    target?: number;  // pvz. 12 workouts per month
    label?: string;   // pvz. "Workouts this month: 5/12"
};

export function ProgressBar({ progress, target, label }: Props) {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            {target && <Text style={styles.target}>Target: {target}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
    },
    label: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 4,
    },
    barBackground: {
        height: 12,
        backgroundColor: colors.sub, // blankesnė spalva
        borderRadius: 6,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 6,
    },
    target: {
        color: colors.sub,
        fontSize: 12,
        marginTop: 4,
    },
});