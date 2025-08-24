// navigation/TabsNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import WorkoutsListScreen from '../screens/WorkoutsListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StatsScreen from '../screens/StatsScreen';
import { View, Text } from 'react-native';
import { Icon } from '../components/Icon';
import { colors } from '../theme';
import { TabParamList } from './types';

type WorkoutsStackParamList = {
    WorkoutsList: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const WorkoutsStack = createNativeStackNavigator<WorkoutsStackParamList>();

function WorkoutsStackNavigator() {
    return (
        <WorkoutsStack.Navigator screenOptions={{ headerShown: false }}>
            <WorkoutsStack.Screen
                name="WorkoutsList"
                component={WorkoutsListScreen}
            />
        </WorkoutsStack.Navigator>
    );
}


export default function TabsNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.bg,
                    borderTopWidth: 0,
                    height: 70,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.sub,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Workouts"
                component={WorkoutsStackNavigator}
                options={{
                    tabBarIcon: ({ color, size }) => <Icon name="barbell" color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Stats"
                component={StatsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Icon name="stats-chart" color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Icon name="person" color={color} size={size} />,
                }}
            />
        </Tab.Navigator>
    );
}