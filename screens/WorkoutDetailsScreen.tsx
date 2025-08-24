// screens/WorkoutDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, Title, Card } from '../components/Ui';
import { colors } from '../theme';
import ExerciseForm from '../components/ExerciseForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientCard from '../components/GradientCard';

type Exercise = {
    id: string;
    name: string;
    sets: string;
    reps: string;
};

type RootStackParamList = {
    WorkoutDetails: { workoutId: string; title: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetails'>;

export default function WorkoutDetailsScreen({ route }: Props) {
    const { workoutId, title } = route.params;
    const insets = useSafeAreaInsets();

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

    // Load exercises on screen load
    useEffect(() => {
        loadExercises();
    }, []);

    const loadExercises = async () => {
        try {
            const stored = await AsyncStorage.getItem(`exercises_${workoutId}`);
            if (stored) {
                setExercises(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading exercises', error);
        }
    };

    const saveExercises = async (updated: Exercise[]) => {
        try {
            await AsyncStorage.setItem(`exercises_${workoutId}`, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving exercises', error);
        }
    };

    const handleAddExercise = (exercise: { name: string; sets: string; reps: string }) => {
        if (editingExercise) {
            const updated = exercises.map((ex) =>
                ex.id === editingExercise.id ? { ...exercise, id: editingExercise.id } : ex
            );
            setExercises(updated);
            saveExercises(updated);
            setEditingExercise(null);
        } else {
            const newExercise = { ...exercise, id: Date.now().toString() };
            const updated = [...exercises, newExercise];
            setExercises(updated);
            saveExercises(updated);
        }
    };

    const handleDeleteExercise = (id: string) => {
        Alert.alert('Confirm', 'Delete this exercise?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const updated = exercises.filter((ex) => ex.id !== id);
                    setExercises(updated);
                    saveExercises(updated);
                },
            },
        ]);
    };

    // Custom render function for ExerciseForm submit button
    const renderSubmitButton = (onPress: () => void) => (
        <TouchableOpacity style={styles.floatingButton} onPress={onPress}>
            <Text style={styles.floatingButtonText}>Save Exercise</Text>
        </TouchableOpacity>
    );

    return (
        <Screen style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, flex: 1 }}>
                <Title style={[styles.title, { textAlign: 'center' }]}>{title}</Title>
                <Card>
                    {exercises.length === 0 ? (
                        <Text style={{ color: '#999' }}>No exercises yet</Text>
                    ) : (
                        <FlatList
                            data={exercises}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.exerciseItem}>
                                    <Text style={styles.exerciseText}>
                                        {item.name} – {item.sets}x{item.reps}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteExercise(item.id)}
                                        style={styles.deleteButton}
                                    >
                                        <Text style={styles.deleteButtonText}> Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </Card>

                <ExerciseForm
                    onSubmit={handleAddExercise}
                    initialValues={editingExercise || { name: '', sets: '', reps: '' }}
                    renderSubmitButton={renderSubmitButton}
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 32, fontWeight: 'bold', color: colors.accent, marginBottom: 16 },
    exerciseItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exerciseText: { fontSize: 16, marginBottom: 6, color: '#fff' },
    buttonsRow: { flexDirection: 'row', gap: 8 },
    floatingButton: {
        backgroundColor: colors.accent,
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        elevation: 6,
        marginTop: 16,
    },
    floatingButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e74c3c',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3,
        elevation: 4,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 4,
    },
});