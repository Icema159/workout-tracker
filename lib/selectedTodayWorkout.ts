import AsyncStorage from '@react-native-async-storage/async-storage';

export const SELECTED_TODAY_WORKOUT_STORAGE_KEY = 'selected_today_workout_id';

export async function getSelectedTodayWorkoutId() {
    return AsyncStorage.getItem(SELECTED_TODAY_WORKOUT_STORAGE_KEY);
}

export async function saveSelectedTodayWorkoutId(workoutId: string) {
    await AsyncStorage.setItem(SELECTED_TODAY_WORKOUT_STORAGE_KEY, workoutId);
}

export async function clearSelectedTodayWorkoutId() {
    await AsyncStorage.removeItem(SELECTED_TODAY_WORKOUT_STORAGE_KEY);
}
