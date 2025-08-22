// screens/WorkoutsListScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Title, Icon } from '../components/Ui';
import GradientCard from '../components/GradientCard';
import { colors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_KEY = 'workouts';

type Workout = {
    id: string;
    name: string;
    date: string;
};

type RootStackParamList = {
    WorkoutsList: undefined;
    AddWorkout: undefined;
    WorkoutDetails: { workoutId: string; title: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutsList'>;

export default function WorkoutsListScreen({ navigation }: Props) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const insets = useSafeAreaInsets();

    const loadWorkouts = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setWorkouts(JSON.parse(stored));
        } catch (error) {
            console.error('Error loading workouts', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadWorkouts();
        }, [])
    );

    const saveWorkouts = async (updated: Workout[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving workouts', error);
        }
    };

    const handleDeleteWorkout = (id: string) => {
        Alert.alert('Confirm', 'Delete this workout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = workouts.filter((w) => w.id !== id);
                    setWorkouts(updated);
                    saveWorkouts(updated);

                    // Taip pat ištrinam visus pratimus iš šios treniruotės
                    await AsyncStorage.removeItem(`exercises_${id}`);
                },
            },
        ]);
    };

    const handleEditWorkout = (workout: Workout) => {
        navigation.navigate('AddWorkout', { workoutId: workout.id });
    };

    const handleSaveEdit = () => {
        if (!newTitle.trim()) {
            Alert.alert('Error', 'Title cannot be empty');
            return;
        }
        const updated = workouts.map((w) =>
            w.id === editingId ? { ...w, title: newTitle } : w
        );
        setWorkouts(updated);
        saveWorkouts(updated);
        setEditingId(null);
        setNewTitle('');
    };

    return (
        <Screen style={styles.container}>
            <View style={{ flex: 1 }}>
                <View style={{ paddingTop: insets.top + 16, alignItems: 'center' }}>
                    <Title style={styles.greeting}>Workouts</Title>
                </View>

                <GradientCard>
                    {workouts.length === 0 ? (
                        <View style={styles.noWorkoutsContainer}>
                            <Text style={styles.noWorkoutsTitle}>No workouts yet</Text>
                            <Text style={styles.noWorkoutsSubtitle}>Add your first workout</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={workouts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Swipeable renderRightActions={() => renderRightActions(item)}>
                                    <TouchableOpacity
                                        onPress={() =>
                                            navigation.navigate('WorkoutDetails', {
                                                workoutId: item.id,
                                                title: item.name,
                                            })
                                        }
                                    >
                                        <View style={styles.workoutItem}>
                                            <Text style={styles.workoutName}>{item.name}</Text>
                                            <Text style={styles.workoutDate}>{item.date}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Swipeable>
                            )}
                        />
                    )}
                </GradientCard>
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => navigation.navigate('AddWorkout')}
                >
                    <Icon.Ionicons name="add" size={18} color="#000" />
                    <Text style={styles.floatingButtonText}>Add Workout</Text>
                </TouchableOpacity>
            </View>
        </Screen>
    );
    function renderRightActions(item: Workout) {
        return (
            <View style={styles.rightActionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditWorkout(item)}
                >
                    <Icon.Ionicons name="create-outline" size={22} color="#fff" />
                    <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteWorkout(item.id)}
                >
                    <Icon.Ionicons name="trash-outline" size={22} color="#fff" />
                    <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    workoutItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    workoutName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    workoutDate: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center'
    },
    workoutText: { fontSize: 18, marginBottom: 6 },
    buttonsRow: { flexDirection: 'row', gap: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 6,
        marginBottom: 6,
        borderRadius: 4,
    },
    accentBorder: {
        width: 6,
        height: '100%',
        backgroundColor: '#C7EA46',
        borderRadius: 3,
        marginRight: 12,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: '#C7EA46',
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        elevation: 6,
    },
    floatingButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    noWorkoutsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noWorkoutsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    noWorkoutsSubtitle: {
        fontSize: 14,
        color: '#999',
    },
    greeting: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.accent,
    },
    rightActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginLeft: 2,
        borderRadius: 6,
    },
    editButton: {
        backgroundColor: '#3498db',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        marginLeft: 6,
    },
    actionText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 15,
    },
});