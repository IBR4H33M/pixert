// @ts-nocheck
// Note: This screen is currently not used in the navigation
// It's kept for potential future use
import React from "react";
import { View, Text, StyleSheet } from "react-native";
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict

export default function DetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details Screen</Text>
      <Text style={styles.text}>This screen is not currently in use</Text>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  text: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
});
