import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to Pixert!</Text>
      <Text style={styles.subtitle}>Create Panoramic carousels in seconds!</Text>

      <TouchableOpacity 
        style={styles.makeCarouselButton} 
        onPress={() => navigation.navigate("CarouselSetup")}
      >
        <Text style={styles.makeCarouselButtonText}>Make Carousel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  makeCarouselButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  makeCarouselButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
