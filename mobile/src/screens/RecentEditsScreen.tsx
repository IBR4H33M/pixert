import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, EditHistoryEntry } from "../../App";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import { Paths, File } from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, ThemeColors } from "../context/ThemeContext";

type RecentEditsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RecentEdits">;
};

const HISTORY_FILE = new File(Paths.document, "pixert_edit_history.json");

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getSpecsSummary = (entry: EditHistoryEntry): string => {
  if (entry.mode === "carousel") {
    return `${entry.specs.splits} splits · ${entry.specs.aspectRatio}`;
  } else {
    return `${entry.specs.grid} · ${entry.specs.aspectRatio}`;
  }
};

export default function RecentEditsScreen({
  navigation,
}: RecentEditsScreenProps) {
  const [fontsLoaded] = useFonts({ Lato_700Bold });
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const loadHistory = async () => {
    try {
      if (HISTORY_FILE.exists) {
        const raw = await HISTORY_FILE.text();
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          setHistory(data);
        }
      }
    } catch (e) {
      console.warn("Failed to load edit history:", e);
    }
  };

  const handleReEdit = (entry: EditHistoryEntry) => {
    if (entry.mode === "carousel") {
      navigation.navigate("CarouselConfig", { prefill: entry });
    } else {
      navigation.navigate("GridConfig", { prefill: entry });
    }
  };

  const renderItem = ({ item }: { item: EditHistoryEntry }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.imageUri }}
        style={styles.thumbnail}
        resizeMode="contain"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.modeBadge}>
            <Feather
              name={item.mode === "carousel" ? "columns" : "grid"}
              size={12}
              color={colors.buttonText}
            />
            <Text style={styles.modeBadgeText}>
              {item.mode === "carousel" ? "Panoramic" : "Grid"}
            </Text>
          </View>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>

        <Text style={styles.specs}>{getSpecsSummary(item)}</Text>

        <TouchableOpacity
          style={styles.reEditButton}
          onPress={() => handleReEdit(item)}
          activeOpacity={0.7}
        >
          <Feather name="edit" size={14} color={colors.primary} />
          <Text style={styles.reEditText}>Re-edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Edit History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="clock" size={48} color={colors.emptyIcon} />
          <Text style={styles.emptyTitle}>No edits yet</Text>
          <Text style={styles.emptySubtitle}>
            Your last 3 edits will appear here after you generate images.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    list: {
      padding: 20,
      gap: 14,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    thumbnail: {
      width: "100%" as any,
      height: 180,
      backgroundColor: c.thumbnailBg,
    },
    cardContent: {
      padding: 14,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    modeBadgeText: {
      fontSize: 12,
      fontFamily: "Lato_700Bold",
      color: c.buttonText,
    },
    timestamp: {
      fontSize: 12,
      color: c.textPlaceholder,
    },
    specs: {
      fontSize: 13,
      fontFamily: "Lato_700Bold",
      color: c.textTertiary,
      marginTop: 6,
    },
    reEditButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      marginTop: 10,
    },
    reEditText: {
      fontSize: 13,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.accentSecondary,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },
  });
