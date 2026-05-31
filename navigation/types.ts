import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
    Home: undefined;
    Workouts: NavigatorScreenParams<WorkoutsStackParamList> | undefined;
    Stats: undefined;
    Profile: undefined;
};

export type WorkoutsStackParamList = {
    WorkoutsList: undefined;
};

export type RootStackParamList = {
    Tabs: NavigatorScreenParams<TabParamList> | undefined;
    TodayWorkout: {
        workoutId: string;
        title: string;
        date: string;
        exerciseCount?: number;
    };
    WorkoutDetails: {
        workoutId?: string;
        title?: string;
        date?: string;
        isDraft?: boolean;
    };
    ActiveWorkout: {
        workoutId: string;
        title: string;
        date?: string;
    };
    FinishedWorkoutSummary: {
        workoutId: string;
    };
};
