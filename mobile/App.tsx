import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import CarouselConfigScreen from "./src/screens/CarouselConfigScreen";
import GridConfigScreen from "./src/screens/GridConfigScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import RecentEditsScreen from "./src/screens/RecentEditsScreen";
import { ThemeProvider } from "./src/context/ThemeContext";

export type EditHistoryEntry = {
  id: string;
  mode: "carousel" | "grid";
  imageUri: string;
  timestamp: number;
  specs: {
    splits?: number;
    grid?: string;
    aspectRatio: string;
    gridWidthPercentage: number;
  };
};

export type RootStackParamList = {
  Home: undefined;
  CarouselConfig: { prefill?: EditHistoryEntry } | undefined;
  GridConfig: { prefill?: EditHistoryEntry } | undefined;
  Settings: undefined;
  RecentEdits: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" translucent={true} />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CarouselConfig"
            component={CarouselConfigScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GridConfig"
            component={GridConfigScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RecentEdits"
            component={RecentEditsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
