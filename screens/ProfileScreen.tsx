// screens/ProfileScreen.tsx
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Screen, Title, Subtitle } from '../components/Ui';
import { colors, spacing } from '../theme';

export default function ProfileScreen() {
    const userName = 'Aismantas';
    const totalWorkouts = 12; // mock for now

    return (
        <Screen>
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                />
                <View style={{ marginLeft: spacing.md }}>
                    <Title>Welcome back, {userName} 👋</Title>
                    <Subtitle>Total workouts: {totalWorkouts}</Subtitle>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.card, // fallback if image fails to load
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
});