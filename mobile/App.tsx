import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import CarouselSetupScreen from "./src/screens/CarouselSetupScreen";
import CarouselConfigScreen from "./src/screens/CarouselConfigScreen";

export type RootStackParamList = {
  Home: undefined;
  CarouselSetup: undefined;
  CarouselConfig: {
    imageUri: string;
    splits: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Pixert" }}
        />
        <Stack.Screen
          name="CarouselSetup"
          component={CarouselSetupScreen}
          options={{ title: "Create Carousel" }}
        />
        <Stack.Screen
          name="CarouselConfig"
          component={CarouselConfigScreen}
          options={{ title: "Configure Carousel" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
