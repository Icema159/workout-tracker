import AsyncStorage from '@react-native-async-storage/async-storage';

export const WORKOUTS_STORAGE_KEY = 'workouts';

export type SetEntry = {
    id: string;
    reps: string;
    weight: string;
    completed: boolean;
};

export type Exercise = {
    id: string;
    name: string;
    sets: string;
    reps: string;
    weight?: string;
    setEntries?: SetEntry[];
};

export type Workout = {
    id: string;
    name: string;
    date: string;
    status: WorkoutStatus;
    completedAt?: string;
    durationSeconds?: number;
};

export type WorkoutStatus = 'planned' | 'in_progress' | 'finished';

export type WorkoutTemplateKey =
    | 'push_day'
    | 'pull_day'
    | 'leg_day'
    | 'upper_body'
    | 'lower_body';

type WorkoutTemplate = {
    key: WorkoutTemplateKey;
    label: string;
    workoutName: string;
    exercises: Array<Pick<Exercise, 'name' | 'sets' | 'reps'>>;
};

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
    {
        key: 'push_day',
        label: 'Push Day',
        workoutName: 'Push Day',
        exercises: [
            { name: 'Bench Press', sets: '4', reps: '6-8' },
            { name: 'Incline Dumbbell Press', sets: '3', reps: '8-10' },
            { name: 'Seated Shoulder Press', sets: '3', reps: '8-10' },
            { name: 'Lateral Raise', sets: '3', reps: '12-15' },
            { name: 'Cable Tricep Pushdown', sets: '3', reps: '10-12' },
        ],
    },
    {
        key: 'pull_day',
        label: 'Pull Day',
        workoutName: 'Pull Day',
        exercises: [
            { name: 'Pull Ups', sets: '4', reps: '6-10' },
            { name: 'Barbell Row', sets: '4', reps: '6-8' },
            { name: 'Lat Pulldown', sets: '3', reps: '8-12' },
            { name: 'Seated Cable Row', sets: '3', reps: '10-12' },
            { name: 'EZ Bar Curl', sets: '3', reps: '10-12' },
        ],
    },
    {
        key: 'leg_day',
        label: 'Leg Day',
        workoutName: 'Leg Day',
        exercises: [
            { name: 'Back Squat', sets: '4', reps: '5-8' },
            { name: 'Romanian Deadlift', sets: '3', reps: '8-10' },
            { name: 'Leg Press', sets: '3', reps: '10-12' },
            { name: 'Leg Curl', sets: '3', reps: '10-12' },
            { name: 'Standing Calf Raise', sets: '4', reps: '12-15' },
        ],
    },
    {
        key: 'upper_body',
        label: 'Upper Body',
        workoutName: 'Upper Body',
        exercises: [
            { name: 'Flat Dumbbell Press', sets: '4', reps: '8-10' },
            { name: 'Chest Supported Row', sets: '4', reps: '8-10' },
            { name: 'Seated Shoulder Press', sets: '3', reps: '8-10' },
            { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
            { name: 'Cable Curl', sets: '3', reps: '12-15' },
            { name: 'Overhead Tricep Extension', sets: '3', reps: '12-15' },
        ],
    },
    {
        key: 'lower_body',
        label: 'Lower Body',
        workoutName: 'Lower Body',
        exercises: [
            { name: 'Front Squat', sets: '4', reps: '6-8' },
            { name: 'Romanian Deadlift', sets: '4', reps: '8-10' },
            { name: 'Walking Lunges', sets: '3', reps: '10 each' },
            { name: 'Leg Extension', sets: '3', reps: '12-15' },
            { name: 'Seated Leg Curl', sets: '3', reps: '12-15' },
        ],
    },
];

export async function getWorkouts(): Promise<Workout[]> {
    const stored = await AsyncStorage.getItem(WORKOUTS_STORAGE_KEY);

    if (!stored) {
        return [];
    }

    const parsed = JSON.parse(stored) as Workout[];

    return parsed
        .map(normalizeWorkout)
        .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveWorkouts(workouts: Workout[]): Promise<void> {
    await AsyncStorage.setItem(
        WORKOUTS_STORAGE_KEY,
        JSON.stringify(workouts.map(normalizeWorkout))
    );
}

export async function upsertWorkout(workout: Workout): Promise<void> {
    const workouts = await getWorkouts();
    const existingIndex = workouts.findIndex((item) => item.id === workout.id);
    const normalizedWorkout = normalizeWorkout(workout);

    if (existingIndex >= 0) {
        workouts[existingIndex] = normalizedWorkout;
    } else {
        workouts.unshift(normalizedWorkout);
    }

    await saveWorkouts(workouts);
}

export async function deleteWorkout(workoutId: string): Promise<void> {
    const workouts = await getWorkouts();
    const updated = workouts.filter((workout) => workout.id !== workoutId);

    await saveWorkouts(updated);
    await AsyncStorage.removeItem(getExercisesStorageKey(workoutId));
}

export async function getExercises(workoutId: string): Promise<Exercise[]> {
    const stored = await AsyncStorage.getItem(getExercisesStorageKey(workoutId));

    if (!stored) {
        return [];
    }

    const parsed = JSON.parse(stored) as Exercise[];

    return parsed.map(normalizeExercise);
}

export async function saveExercises(workoutId: string, exercises: Exercise[]): Promise<void> {
    await AsyncStorage.setItem(
        getExercisesStorageKey(workoutId),
        JSON.stringify(exercises.map(normalizeExercise))
    );
}

export async function getWorkoutWithExercises() {
    const workouts = await getWorkouts();
    const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => ({
            ...workout,
            exercises: await getExercises(workout.id),
        }))
    );

    return workoutsWithExercises;
}

export async function createWorkout(input?: Partial<Omit<Workout, 'id'>>) {
    const workout: Workout = {
        id: Date.now().toString(),
        name: input?.name?.trim() || 'New Workout',
        date: input?.date || new Date().toISOString().slice(0, 10),
        status: input?.status ?? 'planned',
        completedAt: input?.completedAt,
        durationSeconds: input?.durationSeconds,
    };

    await upsertWorkout(workout);

    return workout;
}

export async function duplicateWorkout(sourceWorkoutId: string) {
    const workouts = await getWorkouts();
    const sourceWorkout = workouts.find((workout) => workout.id === sourceWorkoutId);

    if (!sourceWorkout) {
        throw new Error('Source workout not found');
    }

    const duplicatedWorkout = await createWorkout({
        name: `${sourceWorkout.name} Repeat`,
        date: new Date().toISOString().slice(0, 10),
    });

    const sourceExercises = await getExercises(sourceWorkoutId);
    const duplicatedExercises = sourceExercises.map((exercise, index) => ({
        ...exercise,
        id: `${Date.now()}_${index}`,
        weight: exercise.weight ?? '',
    }));

    await saveExercises(duplicatedWorkout.id, duplicatedExercises);

    return duplicatedWorkout;
}

export function createExercisesFromTemplate(templateKey: WorkoutTemplateKey): Exercise[] {
    const template = WORKOUT_TEMPLATES.find((item) => item.key === templateKey);

    if (!template) {
        return [];
    }

    return template.exercises.map((exercise, index) => ({
        id: `${Date.now()}_${index}`,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: '',
        setEntries: createSetEntries(exercise.sets, exercise.reps, ''),
    }));
}

export function createSetEntries(sets: string, reps: string, weight = ''): SetEntry[] {
    const count = Math.max(Number.parseInt(sets, 10) || 0, 1);

    return Array.from({ length: count }, (_, index) => ({
        id: `${Date.now()}_set_${index}`,
        reps,
        weight,
        completed: false,
    }));
}

export function getCompletedSetCount(exercises: Exercise[]) {
    return exercises.reduce(
        (total, exercise) => total + normalizeExercise(exercise).setEntries.filter((set) => set.completed).length,
        0
    );
}

export function getTotalSetCount(exercises: Exercise[]) {
    return exercises.reduce(
        (total, exercise) => total + normalizeExercise(exercise).setEntries.length,
        0
    );
}

export function normalizeExercise(exercise: Exercise): Exercise & { setEntries: SetEntry[] } {
    const weight = exercise.weight ?? '';
    const setEntries = exercise.setEntries?.length
        ? exercise.setEntries.map((setEntry, index) => ({
            id: setEntry.id || `${exercise.id}_set_${index}`,
            reps: setEntry.reps ?? exercise.reps ?? '',
            weight: setEntry.weight ?? weight,
            completed: Boolean(setEntry.completed),
        }))
        : createSetEntries(exercise.sets, exercise.reps, weight);

    return {
        ...exercise,
        weight,
        setEntries,
        sets: String(setEntries.length),
        reps: exercise.reps ?? setEntries[0]?.reps ?? '',
    };
}

export function normalizeWorkout(workout: Workout): Workout {
    return {
        ...workout,
        status: workout.status ?? 'planned',
        completedAt: workout.completedAt || undefined,
        durationSeconds: Number.isFinite(workout.durationSeconds) ? workout.durationSeconds : undefined,
    };
}

function getExercisesStorageKey(workoutId: string) {
    return `exercises_${workoutId}`;
}
