import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as ImagePicker from "expo-image-picker";
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict

type CarouselSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CarouselSetup">;
};

export default function CarouselSetupScreen({
  navigation,
}: CarouselSetupScreenProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedSplits, setSelectedSplits] = useState<number>(2);
  const [customSplits, setCustomSplits] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload images!"
      );
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
      exif: true, // Include EXIF data
      base64: false,
    });

    if (!result.canceled) {
      const pickedImageUri = result.assets[0].uri;
      console.log("Image picked:", {
        uri: pickedImageUri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      });
      setImageUri(pickedImageUri);
    }
  };

  const handleSplitSelection = (splits: number) => {
    setIsCustom(false);
    setSelectedSplits(splits);
    setCustomSplits("");
  };

  const handleCustomSelection = () => {
    setIsCustom(true);
    setSelectedSplits(0);
  };

  const handleNext = () => {
    if (!imageUri) {
      Alert.alert("No Image", "Please upload an image first!");
      return;
    }

    let finalSplits = selectedSplits;
    if (isCustom) {
      const customValue = parseInt(customSplits);
      if (isNaN(customValue) || customValue < 4 || customValue > 10) {
        Alert.alert(
          "Invalid Input",
          "Please enter a number between 4 and 10 for custom splits."
        );
        return;
      }
      finalSplits = customValue;
    }

    navigation.navigate("CarouselConfig", {
      imageUri,
      splits: finalSplits,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Your Carousel</Text>

      {/* Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Image</Text>
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
              <Text style={styles.changeButtonText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>Click to select Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Split Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Number of Splits</Text>
        <View style={styles.splitOptions}>
          {[2, 3, 4].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.splitButton,
                selectedSplits === num && !isCustom && styles.splitButtonActive,
              ]}
              onPress={() => handleSplitSelection(num)}
            >
              <Text
                style={[
                  styles.splitButtonText,
                  selectedSplits === num &&
                    !isCustom &&
                    styles.splitButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.splitButton, isCustom && styles.splitButtonActive]}
            onPress={handleCustomSelection}
          >
            <Text
              style={[
                styles.splitButtonText,
                isCustom && styles.splitButtonTextActive,
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {isCustom && (
          <View style={styles.customInputContainer}>
            <Text style={styles.customLabel}>Enter splits (4-10):</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g., 5"
              keyboardType="number-pad"
              value={customSplits}
              onChangeText={setCustomSplits}
              maxLength={2}
            />
          </View>
        )}
      </View>

      {/* Next Button */}
      <TouchableOpacity 
        style={[styles.nextButton, !imageUri && styles.nextButtonDisabled]} 
        onPress={handleNext} 
        disabled={!imageUri}
      >
        <Text style={[styles.nextButtonText, !imageUri && styles.nextButtonTextDisabled]}>Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginBottom: 15,
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#007AFF",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  imageContainer: {
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: "contain",
  },
  changeButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  splitOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  splitButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  splitButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  splitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  splitButtonTextActive: {
    color: "#fff",
  },
  customInputContainer: {
    marginTop: 15,
  },
  customLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  nextButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  nextButtonDisabled: {
    backgroundColor: "#ccc",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButtonTextDisabled: {
    color: "#999",
  },
});
