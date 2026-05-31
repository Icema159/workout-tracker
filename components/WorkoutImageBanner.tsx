import React from 'react';
import {
    ImageBackground,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { colors, spacing } from '../theme';
import { getWorkoutImageSource } from '../lib/workoutImages';

type WorkoutImageBannerProps = {
    title: string;
    subtitle?: string;
    height?: number;
    style?: StyleProp<ViewStyle>;
};

export default function WorkoutImageBanner({
    title,
    subtitle,
    height = 136,
    style,
}: WorkoutImageBannerProps) {
    const resolvedTitle = title.trim() || 'New Workout';

    return (
        <ImageBackground
            source={getWorkoutImageSource(resolvedTitle)}
            style={[styles.banner, { height }, style]}
            imageStyle={styles.image}
        >
            <View style={styles.overlay} />
            <View style={styles.content}>
                {subtitle ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{subtitle}</Text>
                    </View>
                ) : null}
                <Text style={styles.title} numberOfLines={2}>
                    {resolvedTitle}
                </Text>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    banner: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        justifyContent: 'flex-end',
    },
    image: {
        borderRadius: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        padding: spacing.lg,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(132,204,22,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(132,204,22,0.45)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: spacing.sm,
    },
    badgeText: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    title: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 29,
    },
});
