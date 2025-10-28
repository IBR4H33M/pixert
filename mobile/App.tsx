import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import CarouselConfigScreen from "./src/screens/CarouselConfigScreen";

export type RootStackParamList = {
  Home: undefined;
  CarouselConfig: undefined;
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
          name="CarouselConfig"
          component={CarouselConfigScreen}
          options={{ title: "Create Carousel" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
