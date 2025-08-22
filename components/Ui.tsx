// components/Ui.tsx
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';


export const Screen: React.FC<React.PropsWithChildren> = ({ children }) => (
    <View style={styles.screen}>{children}</View>
);

export const Title: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
    <Text style={[styles.title, style]}>{children}</Text>
);

export const Subtitle: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
    <Text style={[styles.subtitle, style]}>{children}</Text>
);

export const Card: React.FC<React.PropsWithChildren<{ style?: ViewStyle }>> = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

export const Row: React.FC<{
    title: string;
    subtitle?: string;
    onPress?: () => void;
    right?: React.ReactNode;
}> = ({ title, subtitle, onPress, right }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
        <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
        </View>
        {right ?? <Ionicons name="chevron-forward" size={18} color={colors.sub} />}
    </Pressable>
);

export const AccentButton: React.FC<{ title: string; onPress: () => void; icon?: React.ReactNode }> = ({ title, onPress, icon }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.99 }] }]}>
        {icon}
        <Text style={styles.btnText}>{title}</Text>
    </Pressable>
);

export const DangerButton: React.FC<{ title: string; onPress: () => void }> = ({ title, onPress }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnDanger, pressed && { opacity: 0.9 }]}>
        <Text style={styles.btnText}>{title}</Text>
    </Pressable>
);

export const Input: React.FC<React.ComponentProps<typeof TextInput>> = (props) => (
    <TextInput
        placeholderTextColor={colors.sub}
        {...props}
        style={[styles.input, props.style]}
    />
);

export const Icon = { Ionicons, MaterialIcons };

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
    subtitle: { color: colors.sub, fontSize: 14, marginBottom: spacing.md },
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
    rowSub: { color: colors.sub, fontSize: 12, marginTop: 2 },
    btn: {
        backgroundColor: colors.accent,
        borderRadius: radii.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    btnDanger: {
        backgroundColor: colors.danger,
        borderRadius: radii.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
    input: {
        backgroundColor: '#0f0f0f',
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
});