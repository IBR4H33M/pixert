import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import { Paths, File } from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { useTheme, ThemeColors } from "../context/ThemeContext";

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Settings">;
};

const SETTINGS_FILE = new File(Paths.document, "pixert_settings.json");
const DEFAULT_ALBUM = "Pixert";

const PRESET_ALBUMS = [
  { label: "Pixert", value: "Pixert", description: "Default album" },
  {
    label: "Pixert Carousels",
    value: "Pixert Carousels",
    description: "Separate carousel album",
  },
  {
    label: "Pixert Grids",
    value: "Pixert Grids",
    description: "Separate grid album",
  },
];

const readSetting = async (key: string): Promise<string | null> => {
  try {
    if (!SETTINGS_FILE.exists) return null;
    const raw = await SETTINGS_FILE.text();
    const data = JSON.parse(raw);
    return data[key] ?? null;
  } catch {
    return null;
  }
};

const writeSetting = async (key: string, value: string) => {
  let data: Record<string, string> = {};
  try {
    if (SETTINGS_FILE.exists) {
      const raw = await SETTINGS_FILE.text();
      data = JSON.parse(raw);
    }
  } catch {}
  data[key] = value;
  SETTINGS_FILE.write(JSON.stringify(data));
};

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [fontsLoaded] = useFonts({ Lato_700Bold });
  const { isDark, colors, toggleTheme } = useTheme();
  const [albumName, setAlbumName] = useState(DEFAULT_ALBUM);
  const [savedAlbumName, setSavedAlbumName] = useState(DEFAULT_ALBUM);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAlbumName, setCustomAlbumName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadAlbumName();
  }, []);

  const loadAlbumName = async () => {
    try {
      const stored = await readSetting("albumName");
      if (stored) {
        setAlbumName(stored);
        setSavedAlbumName(stored);
        // If not a preset, show custom input
        if (!PRESET_ALBUMS.find((p) => p.value === stored)) {
          setShowCustomInput(true);
          setCustomAlbumName(stored);
        }
      }
    } catch (e) {
      console.warn("Failed to load album name:", e);
    }
  };

  const selectAlbum = async (value: string) => {
    setShowCustomInput(false);
    setAlbumName(value);
    try {
      await writeSetting("albumName", value);
      setSavedAlbumName(value);
    } catch (e) {
      console.warn("Failed to save album name:", e);
    }
  };

  const selectCustom = () => {
    setShowCustomInput(true);
    setCustomAlbumName(albumName);
  };

  const saveCustomAlbum = async () => {
    const trimmed = customAlbumName.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Album name cannot be empty.");
      return;
    }
    // Validate: only letters, numbers, spaces, hyphens, underscores, slashes
    const isValid = /^[a-zA-Z0-9 _\-/]+$/.test(trimmed);
    if (!isValid) {
      Alert.alert(
        "Invalid Name",
        "Album name can only contain letters, numbers, spaces, hyphens, underscores, and slashes.",
      );
      return;
    }
    try {
      await writeSetting("albumName", trimmed);
      setAlbumName(trimmed);
      setSavedAlbumName(trimmed);
    } catch (e) {
      console.warn("Failed to save album name:", e);
      Alert.alert("Error", "Failed to save setting.");
    }
  };

  const resetToDefault = async () => {
    try {
      await writeSetting("albumName", DEFAULT_ALBUM);
      setAlbumName(DEFAULT_ALBUM);
      setSavedAlbumName(DEFAULT_ALBUM);
      setShowCustomInput(false);
      setCustomAlbumName("");
    } catch (e) {
      console.warn("Failed to reset album name:", e);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEME</Text>
          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[styles.themeOption, !isDark && styles.themeOptionActive]}
              onPress={() => isDark && toggleTheme()}
              activeOpacity={0.7}
            >
              <Feather
                name="sun"
                size={18}
                color={!isDark ? colors.primary : colors.textPlaceholder}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  !isDark && styles.themeOptionTextActive,
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, isDark && styles.themeOptionActive]}
              onPress={() => !isDark && toggleTheme()}
              activeOpacity={0.7}
            >
              <Feather
                name="moon"
                size={18}
                color={isDark ? colors.primary : colors.textPlaceholder}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  isDark && styles.themeOptionTextActive,
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SAVE LOCATION</Text>
          <Text style={styles.sectionDescription}>
            Choose the album name where generated images will be saved in your
            gallery.
          </Text>

          {/* Preset Dropdown */}
          <View style={{ zIndex: 10 }}>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownTriggerLeft}>
                <Feather name="folder" size={16} color={colors.primary} />
                <Text style={styles.dropdownTriggerText}>
                  {(!showCustomInput &&
                    PRESET_ALBUMS.find((p) => p.value === albumName)?.label) ||
                    "Select a location"}
                </Text>
              </View>
              <Feather
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdownList}>
                {PRESET_ALBUMS.map((preset) => {
                  const isSelected =
                    !showCustomInput && albumName === preset.value;
                  return (
                    <TouchableOpacity
                      key={preset.value}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        selectAlbum(preset.value);
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text
                          style={[
                            styles.dropdownItemLabel,
                            isSelected && styles.dropdownItemLabelSelected,
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text style={styles.dropdownItemDesc}>
                          {preset.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather
                          name="check"
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Custom Location — separate option */}
          <TouchableOpacity
            style={[
              styles.customOption,
              showCustomInput && styles.customOptionSelected,
            ]}
            onPress={() => {
              setDropdownOpen(false);
              selectCustom();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.customOptionLeft}>
              <Feather
                name="edit-2"
                size={16}
                color={
                  showCustomInput ? colors.primary : colors.textPlaceholder
                }
              />
              <View>
                <Text
                  style={[
                    styles.customOptionLabel,
                    showCustomInput && styles.customOptionLabelSelected,
                  ]}
                >
                  Custom Location
                </Text>
                <Text style={styles.customOptionDesc}>
                  Enter your own album name
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Custom Input Field */}
          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.albumInput}
                value={customAlbumName}
                onChangeText={setCustomAlbumName}
                placeholder="e.g. My Photos"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.customSaveButton,
                  customAlbumName.trim() === savedAlbumName &&
                    styles.saveButtonDisabled,
                ]}
                onPress={saveCustomAlbum}
                disabled={customAlbumName.trim() === savedAlbumName}
                activeOpacity={0.8}
              >
                <Text style={styles.customSaveButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Current Value */}
          <View style={styles.currentValueRow}>
            <Feather name="folder" size={14} color={colors.textMuted} />
            <Text style={styles.currentValue}>
              Album:{" "}
              <Text style={styles.currentValueBold}>{savedAlbumName}</Text>
            </Text>
          </View>

          {/* Reset */}
          {savedAlbumName !== DEFAULT_ALBUM && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetToDefault}
              activeOpacity={0.8}
            >
              <Text style={styles.resetButtonText}>Reset to Default</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spacer to push about to bottom */}
        <View style={{ flex: 1 }} />

        {/* Contact Us */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL("mailto:contact@solase.studio")}
          activeOpacity={0.7}
        >
          <Feather name="mail" size={16} color={colors.primary} />
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.aboutSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <Text style={styles.copyright}>© 2026 SOLASE Studio</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.iconButtonBg,
      alignItems: "center",
      justifyContent: "center",
    },
    backButtonText: {
      fontSize: 24,
      color: c.primary,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      letterSpacing: 0.5,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      flexGrow: 1,
    },
    section: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    sectionDescription: {
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 20,
      marginBottom: 16,
    },
    themeToggleRow: {
      flexDirection: "row" as const,
      gap: 12,
    },
    themeOption: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.inputBgAlt,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    themeOptionActive: {
      backgroundColor: c.accent,
      borderColor: c.primary,
    },
    themeOptionText: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.textPlaceholder,
    },
    themeOptionTextActive: {
      color: c.primary,
    },
    dropdownTrigger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: c.inputBgAlt,
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    dropdownTriggerLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    dropdownTriggerText: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    dropdownList: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden" as const,
    },
    dropdownItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
    },
    dropdownItemSelected: {
      backgroundColor: c.accent,
    },
    dropdownItemLabel: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.textTertiary,
    },
    dropdownItemLabelSelected: {
      color: c.primary,
    },
    dropdownItemDesc: {
      fontSize: 12,
      color: c.textPlaceholder,
      marginTop: 2,
    },
    customOption: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: c.inputBgAlt,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    customOptionSelected: {
      backgroundColor: c.accent,
      borderColor: c.primary,
    },
    customOptionLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      flex: 1,
    },
    customOptionLabel: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.textTertiary,
    },
    customOptionLabelSelected: {
      color: c.primary,
    },
    customOptionDesc: {
      fontSize: 12,
      color: c.textPlaceholder,
      marginTop: 2,
    },
    customInputContainer: {
      flexDirection: "row" as const,
      gap: 10,
      marginBottom: 12,
      marginTop: 4,
    },
    albumInput: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.textPrimary,
    },
    customSaveButton: {
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    customSaveButtonText: {
      color: c.buttonText,
      fontSize: 14,
      fontFamily: "Lato_700Bold",
    },
    currentValueRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      marginTop: 12,
      marginBottom: 4,
    },
    currentValue: {
      fontSize: 13,
      color: c.textMuted,
    },
    currentValueBold: {
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    resetButton: {
      alignSelf: "center" as const,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    resetButtonText: {
      color: c.primary,
      fontSize: 13,
      fontFamily: "Lato_700Bold",
      textDecorationLine: "underline" as const,
    },
    aboutSection: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      alignItems: "center" as const,
    },
    infoRow: {
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 6,
    },
    infoLabel: {
      fontSize: 13,
      color: c.accentSecondary,
    },
    infoValue: {
      fontSize: 13,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    copyright: {
      fontSize: 12,
      color: c.accentSecondary,
      marginTop: 2,
    },
    contactButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      backgroundColor: c.card,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginHorizontal: 20,
      marginBottom: 20,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    contactButtonText: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
  });
