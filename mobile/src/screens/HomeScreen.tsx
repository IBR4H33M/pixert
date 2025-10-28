import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  let [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.welcomeText}>Welcome to Pixert!</Text>
        <Text style={styles.subtitle}>
          Create Panoramic carousels in seconds!
        </Text>

        <TouchableOpacity
          style={styles.makeCarouselButton}
          onPress={() => navigation.navigate("CarouselConfig")}
          activeOpacity={0.8}
        >
          <Text style={styles.makeCarouselButtonText}>Make Carousel</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 32,
    fontFamily: "Lato_700Bold",
    marginBottom: 12,
    color: "#203838",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 50,
    textAlign: "center",
    lineHeight: 24,
  },
  makeCarouselButton: {
    backgroundColor: "#376161",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  makeCarouselButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Lato_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
