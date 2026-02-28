import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import { Feather } from "@expo/vector-icons";
import { useTheme, ThemeColors } from "../context/ThemeContext";
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

type TutorialType = "panoramic" | "grid" | null;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialType, setTutorialType] = useState<TutorialType>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  let [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

  const openWebsite = () => {
    Linking.openURL("https://solase.studio");
  };

  const openYouTubeVideo = () => {
    const url =
      tutorialType === "panoramic"
        ? "https://youtube.com/shorts/sSA3XPC4I1s?feature=share"
        : "https://youtube.com/shorts/YZkiKKOhrg";
    Linking.openURL(url);
  };

  const openTutorial = (type: TutorialType) => {
    setTutorialType(type);
    setTutorialVisible(true);
  };

  const closeTutorial = () => {
    setTutorialVisible(false);
    setTutorialType(null);
  };

  const getTutorialContent = () => {
    if (tutorialType === "panoramic") {
      return {
        title: "How to Create Panoramic Splits",
        steps: [
          "Upload your image to be split",
          "Select the number of splits you want (2-10)",
          "Choose your desired aspect ratio (3:4, 4:5, or 1:1)",
          "Adjust the carousel size using the slider",
          "Drag the grid overlay to position your crop area",
          "Tap 'Generate Images' to create your carousel images",
        ],
      };
    } else {
      return {
        title: "How to Create Grid Splits",
        steps: [
          "Step 1: Upload your image from your gallery",
          "Step 2: Select grid dimension (2x2, 3x2, or 3x3)",
          "Step 3: Adjust the grid size using the slider (50-100%)",
          "Step 4: Drag the grid overlay to position your crop area",
          "Step 5: Tap 'Generate Images' to create your grid",
        ],
      };
    }
  };

  useEffect(() => {
    // Parallel animations for smooth entry
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Top Bar Icons */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topIconButton}
          onPress={() => navigation.navigate("RecentEdits")}
          activeOpacity={0.7}
        >
          <Feather name="clock" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topIconButton}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => navigation.navigate("CarouselConfig")}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../assets/images/pan.png")}
              style={styles.buttonIcon}
              resizeMode="contain"
            />
            <View style={styles.divider} />
            <Text style={styles.optionButtonText}>Create Panoramic Splits</Text>
            <TouchableOpacity
              style={styles.helpIcon}
              onPress={(e) => {
                e.stopPropagation();
                openTutorial("panoramic");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.helpIconText}>?</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => navigation.navigate("GridConfig")}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../assets/images/grid.png")}
              style={styles.buttonIcon}
              resizeMode="contain"
            />
            <View style={styles.divider} />
            <Text style={styles.optionButtonText}>Create Grid Splits</Text>
            <TouchableOpacity
              style={styles.helpIcon}
              onPress={(e) => {
                e.stopPropagation();
                openTutorial("grid");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.helpIconText}>?</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <TouchableOpacity
        style={styles.logoContainer}
        onPress={openWebsite}
        activeOpacity={0.7}
      >
        <Image
          source={require("../../assets/images/SOlace_transpa.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.studioText}>SOLASE Studio</Text>
      </TouchableOpacity>

      {/* Tutorial Modal */}
      <Modal
        visible={tutorialVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeTutorial}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getTutorialContent().title}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeTutorial}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Tutorial GIF/Video at the top */}
              {tutorialType === "panoramic" && (
                <>
                  <Image
                    source={require("../../assets/pan.gif")}
                    style={styles.tutorialGif}
                    resizeMode="cover"
                  />
                  <Text style={styles.tutorialDescription}>
                    This feature is best for splitting an image into multiple
                    images for posting a seamless horizontal carousel in
                    Instagram or other supported platforms.
                  </Text>
                </>
              )}

              {tutorialType === "grid" && (
                <>
                  <Image
                    source={require("../../assets/grid.gif")}
                    style={styles.tutorialGif}
                    resizeMode="contain"
                  />
                  <Text style={styles.tutorialDescription}>
                    Split your image into a grid of tiles, perfect for 2x2
                    Facebook posts or stunning tiled layouts (3x2 or 3x3) on
                    Instagram profiles.
                  </Text>
                </>
              )}

              {getTutorialContent().steps.map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.watchTutorialButton}
                onPress={openYouTubeVideo}
                activeOpacity={0.8}
              >
                <Text style={styles.watchTutorialButtonText}>
                  Watch Tutorial
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: "space-between",
      padding: 20,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 30,
    },
    topIconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.iconButtonBg,
      alignItems: "center",
      justifyContent: "center",
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      alignItems: "center",
      width: "100%",
      maxWidth: 400,
    },
    buttonWrapper: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      marginBottom: 20,
      gap: 8,
    },
    welcomeText: {
      fontSize: 32,
      fontFamily: "Lato_700Bold",
      marginBottom: 40,
      color: c.primaryDark,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    optionButton: {
      backgroundColor: c.primary,
      paddingVertical: 20,
      paddingHorizontal: 20,
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
      gap: 12,
      width: "100%",
      marginBottom: 20,
    },
    helpIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    helpIconText: {
      fontSize: 24,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    optionButtonText: {
      color: c.buttonText,
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      letterSpacing: 0.5,
      flex: 1,
      flexShrink: 1,
    },
    buttonIcon: {
      width: 32,
      height: 32,
      flexShrink: 0,
    },
    divider: {
      width: 2,
      height: 32,
      backgroundColor: c.chipBg,
      flexShrink: 0,
    },
    logoContainer: {
      alignItems: "center",
      paddingBottom: 20,
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 12,
    },
    studioText: {
      fontSize: 14,
      color: c.primary,
      fontFamily: "Lato_700Bold",
      letterSpacing: 1,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: c.modalBg,
      borderRadius: 20,
      width: "100%",
      maxHeight: "85%",
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      flex: 1,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.borderLight,
      alignItems: "center",
      justifyContent: "center",
    },
    closeButtonText: {
      fontSize: 24,
      color: c.textMuted,
      fontWeight: "300",
    },
    modalScrollView: {
      maxHeight: "100%",
    },
    modalScrollContent: {
      padding: 20,
    },
    tutorialGif: {
      width: "100%",
      height: 250,
      borderRadius: 12,
      marginBottom: 20,
    },
    tutorialDescription: {
      fontSize: 15,
      color: c.textTertiary,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: "center",
    },
    stepContainer: {
      flexDirection: "row",
      marginBottom: 20,
      alignItems: "flex-start",
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    stepNumberText: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: c.buttonText,
    },
    stepText: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
      lineHeight: 22,
      paddingTop: 5,
    },
    watchTutorialButton: {
      backgroundColor: c.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    watchTutorialButtonText: {
      color: c.buttonText,
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      letterSpacing: 0.5,
    },
    placeholderBox: {
      marginTop: 20,
      padding: 40,
      backgroundColor: c.inputBg,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontSize: 14,
      color: c.textPlaceholder,
      textAlign: "center",
    },
  });
