import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';

const GradientCard: React.FC<{ style?: ViewStyle; children: React.ReactNode }> = ({ style, children }) => {
    return (
        <LinearGradient colors={['#1A1A1A', '#0E0E0E']} style={[styles.card, style]}>
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 6,
    },
});

export default GradientCard;