// App.tsx
import React from 'react';
import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabsNavigator from './navigation/TabsNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ActiveWorkoutScreen from './screens/ActiveWorkoutScreen';
import FinishedWorkoutSummaryScreen from './screens/FinishedWorkoutSummaryScreen';
import TodayWorkoutScreen from './screens/TodayWorkoutScreen';
import WorkoutDetailsScreen from './screens/WorkoutDetailsScreen';
import { RootStackParamList } from './navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabsNavigator} />
          <Stack.Screen name="TodayWorkout" component={TodayWorkoutScreen} />
          <Stack.Screen name="WorkoutDetails" component={WorkoutDetailsScreen} />
          <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          <Stack.Screen name="FinishedWorkoutSummary" component={FinishedWorkoutSummaryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
