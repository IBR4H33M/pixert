import React from "react";
import { ButtonProps } from "../types";
import "./Button.css";

/**
 * Shared Button component that works on both web and mobile
 * Uses platform-specific rendering
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
}) => {
  // For web, we use a regular button element
  // For React Native, this component would be wrapped differently
  return (
    <button className="shared-button" onClick={onPress} disabled={disabled}>
      {title}
    </button>
  );
};
