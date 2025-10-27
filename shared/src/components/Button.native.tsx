// @ts-nocheck - React Native types conflict with web React types in shared package
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { ButtonProps } from "../types";

/**
 * Button component for React Native
 * This is the mobile-specific implementation
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    backgroundColor: "#ccc",
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
