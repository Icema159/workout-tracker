// components/Icon.tsx
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export const Icon = ({
    name,
    size = 20,
    color = colors.text,
    style = {},
}: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    size?: number;
    color?: string;
    style?: object;
}) => (
    <Ionicons name={name} size={size} color={color} style={style} />
);