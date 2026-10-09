import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import CreateTemplateScreen from '../screens/CreateTemplateScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AICoachScreen from '../screens/AICoachScreen';

// Root stack – contains tabs + modal screens
export type RootStackParamList = {
  Tabs: undefined;
  ExerciseDetail: { exerciseId: string };
  CreateTemplate: { templateId?: number };
  // Without sessionId the workout is opened but not started yet
  ActiveWorkout: { sessionId?: number; templateId?: number; sessionName: string };
  SessionDetail: { sessionId: number };
  Settings: undefined;
};

// Bottom tabs
export type TabParamList = {
  HomeTab: undefined;
  ExercisesTab: undefined;
  WorkoutTab: undefined;
  HistoryTab: undefined;
  AICoachTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Hem',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ExercisesTab"
        component={ExercisesScreen}
        options={{
          tabBarLabel: 'Övningar',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkoutTab"
        component={WorkoutScreen}
        options={{
          tabBarLabel: 'Träna',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'flash' : 'flash-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historik',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AICoachTab"
        component={AICoachScreen}
        options={{
          tabBarLabel: 'AI Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="CreateTemplate" component={CreateTemplateScreen} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
