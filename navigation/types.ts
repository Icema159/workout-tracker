// navigation/types.ts
// navigation/types.ts (arba čia viršuje)
export type TabParamList = {
    Home: undefined;
    Workouts: undefined;
    Stats: undefined;
    Profile: undefined;
};

export type RootStackParamList = {
    WorkoutsList: undefined;
    WorkoutDetails: { workoutId: string; title: string };
    AddWorkout: { workoutId?: string }; // 👈 pridedam čia
    Home: undefined;
    Stats: undefined;
    Profile: undefined;
};