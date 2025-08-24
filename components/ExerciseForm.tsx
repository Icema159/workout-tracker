import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../theme';

// components/ExerciseForm.tsx
type ExerciseFormProps = {
    onSubmit: (exercise: { name: string; sets: string; reps: string }) => void;
    initialValues: { name: string; sets: string; reps: string };
    renderSubmitButton?: (onPress: () => void) => React.JSX.Element; // 👈 pridėta
};

const ExerciseForm: React.FC<ExerciseFormProps> = ({ onSubmit, initialValues }) => {
    const [name, setName] = useState(initialValues?.name || '');
    const [sets, setSets] = useState(initialValues?.sets || '');
    const [reps, setReps] = useState(initialValues?.reps || '');

    const handleSubmit = () => {
        if (!name.trim() || !sets.trim() || !reps.trim()) return;
        onSubmit({ name, sets, reps });
        setName('');
        setSets('');
        setReps('');
    };

    return (
        <View style={styles.inputRow}>
            <TextInput
                style={styles.input}
                placeholder="Exercise name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Sets"
                placeholderTextColor="#aaa"
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Reps"
                placeholderTextColor="#aaa"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>Save Exercise</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ExerciseForm;

const styles = StyleSheet.create({
    inputRow: {
        flexDirection: 'column',
        marginBottom: 10,
        alignItems: 'stretch',
        marginTop: 20,
    },
    input: {
        backgroundColor: '#1A1A1A',
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: '#C7EA46',
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        elevation: 6,
        marginTop: 20,
    },
    saveButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});