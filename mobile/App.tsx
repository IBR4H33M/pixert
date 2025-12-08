import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import CarouselConfigScreen from "./src/screens/CarouselConfigScreen";
import GridConfigScreen from "./src/screens/GridConfigScreen";

export type RootStackParamList = {
  Home: undefined;
  CarouselConfig: undefined;
  GridConfig: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
