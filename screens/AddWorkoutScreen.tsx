import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import GradientCard from '../components/GradientCard';

const STORAGE_KEY = 'workouts';

type RootStackParamList = {
    WorkoutsList: undefined;
    AddWorkout: { workoutId?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddWorkout'>;

type Workout = {
    id: string;
    name: string;
    date: string;        // YYYY-MM-DD
    exercises: any[];    // vėliau tipuosim
};

export default function AddWorkoutScreen({ route, navigation }: Props) {
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const loadWorkout = async () => {
            if (route.params?.workoutId) {
                try {
                    const existing = await AsyncStorage.getItem(STORAGE_KEY);
                    const list: Workout[] = existing ? JSON.parse(existing) : [];
                    const workout = list.find(w => w.id === route.params!.workoutId);
                    if (workout) {
                        setName(workout.name);
                        setDate(workout.date);
                    }
                } catch (e) {
                    console.error('Failed to load workout', e);
                }
            }
        };
        loadWorkout();
    }, [route.params]);

    const saveWorkout = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert('Enter a workout name');
            return;
        }

        try {
            const existing = await AsyncStorage.getItem(STORAGE_KEY);
            const list: Workout[] = existing ? JSON.parse(existing) : [];

            if (route.params?.workoutId) {
                // Update existing workout
                const updated = list.map(w => {
                    if (w.id === route.params!.workoutId) {
                        return {
                            ...w,
                            name: trimmed,
                            date,
                        };
                    }
                    return w;
                });
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } else {
                // Create new workout
                const newWorkout: Workout = {
                    id: Date.now().toString(),                   // paprastas ID
                    name: trimmed,
                    date,
                    exercises: [],
                };
                const updated = [newWorkout, ...list];
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
            navigation.goBack();
        } catch (e) {
            console.error('Failed to save workout', e);
            Alert.alert('Failed to save workout');
        }
    };

    const isEditing = !!route.params?.workoutId;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Text style={styles.title}>{isEditing ? 'Edit Workout' : 'Add Workout'}</Text>
            <Text style={styles.label}>Workout Name</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Push Day"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveWorkout}>
                <Text style={styles.saveButtonText}>{isEditing ? 'Update Workout' : 'Save Workout'}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0B0B',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.accent, // accent color
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#1A1A1A',
        color: '#fff',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#C7EA46',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0B0B0B',
    },
});