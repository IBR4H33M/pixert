import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  PanResponder,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Button } from "@shared/components/Button";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";

type CarouselConfigScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CarouselConfig">;
  route: RouteProp<RootStackParamList, "CarouselConfig">;
};

type AspectRatio = "3:4" | "4:5" | "1:1";
type Alignment = "top" | "bottom" | "custom";

// Helper to get aspect ratio dimensions
const getAspectRatioDimensions = (ratio: AspectRatio) => {
  switch (ratio) {
    case "3:4":
      return { width: 3, height: 4 };
    case "4:5":
      return { width: 4, height: 5 };
    case "1:1":
      return { width: 1, height: 1 };
  }
};

export default function CarouselConfigScreen({
  navigation,
  route,
}: CarouselConfigScreenProps) {
  const { imageUri, splits } = route.params;
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [alignment, setAlignment] = useState<Alignment>("top");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gridVerticalOffset, setGridVerticalOffset] = useState(0);
  const [gridHeight, setGridHeight] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(300);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);

      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need permission to save images to your gallery."
        );
        setIsGenerating(false);
        return;
      }

      // Simulate progress (in real implementation, this would track actual image processing)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Get image dimensions
      const getImageSize = (): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
          Image.getSize(
            imageUri,
            (width, height) => resolve({ width, height }),
            reject
          );
        });
      };

      const imageSize = await getImageSize();
      const aspectDimensions = getAspectRatioDimensions(aspectRatio);
      const targetAspect = aspectDimensions.width / aspectDimensions.height;

      // Calculate dimensions for each carousel image
      let cropWidth: number;
      let cropHeight: number;

      // Determine crop dimensions based on alignment
      if (alignment === "top" || alignment === "bottom") {
        // For top/bottom alignment, we crop the full width and calculate height based on aspect ratio
        cropWidth = imageSize.width / splits;
        cropHeight = cropWidth / targetAspect;
      } else {
        // For custom alignment, we use the same logic (can be enhanced later)
        cropWidth = imageSize.width / splits;
        cropHeight = cropWidth / targetAspect;
      }

      // Ensure crop height doesn't exceed image height
      if (cropHeight > imageSize.height) {
        cropHeight = imageSize.height;
        cropWidth = cropHeight * targetAspect;
      }

      // Calculate vertical offset based on alignment
      let yOffset = 0;
      if (alignment === "bottom") {
        yOffset = imageSize.height - cropHeight;
      } else if (alignment === "top") {
        yOffset = 0;
      } else {
        // custom - use the dragged position
        // Convert preview offset to actual image offset
        const offsetRatio = gridVerticalOffset / previewHeight;
        yOffset = offsetRatio * imageSize.height;
        // Ensure it doesn't exceed bounds
        yOffset = Math.max(0, Math.min(yOffset, imageSize.height - cropHeight));
      }

      // Create Pixert album
      let album = await MediaLibrary.getAlbumAsync("Pixert");
      if (!album) {
        // Create album by first creating an asset and then the album
        const firstAsset = await MediaLibrary.createAssetAsync(imageUri);
        album = await MediaLibrary.createAlbumAsync(
          "Pixert",
          firstAsset,
          false
        );
      }

      // Split and save each image
      const savedAssets = [];
      for (let i = 0; i < splits; i++) {
        const xOffset = i * cropWidth;

        // Crop the image
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              crop: {
                originX: xOffset,
                originY: yOffset,
                width: cropWidth,
                height: cropHeight,
              },
            },
            {
              resize: {
                width: Math.round(aspectDimensions.width * 400), // Scale to reasonable size (e.g., 1200x1600 for 3:4)
                height: Math.round(aspectDimensions.height * 400),
              },
            },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(manipResult.uri);
        savedAssets.push(asset);

        // Add to Pixert album
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        // Update progress
        const currentProgress = 90 + ((i + 1) / splits) * 10;
        setProgress(currentProgress);
      }

      setProgress(100);
      clearInterval(progressInterval);

      // Show success message
      Alert.alert(
        "Success! 🎉",
        `Carousel images created successfully!\n${splits} images saved to your gallery.`,
        [
          {
            text: "OK",
            onPress: () => {
              setIsGenerating(false);
              navigation.navigate("Home");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error generating carousel:", error);
      Alert.alert("Error", "Failed to generate carousel images.");
      setIsGenerating(false);
    }
  };

  // Calculate total grid ratio based on splits and aspect ratio
  const aspectDimensions = getAspectRatioDimensions(aspectRatio);
  const totalGridWidth = aspectDimensions.width * splits;
  const totalGridHeight = aspectDimensions.height;

  // Calculate grid height based on preview width
  const calculateGridHeight = () => {
    const screenWidth = Dimensions.get("window").width - 40; // padding
    const gridAspectRatio = totalGridWidth / totalGridHeight;
    return screenWidth / gridAspectRatio;
  };

  // Update grid height when aspect ratio or splits change
  useEffect(() => {
    const newGridHeight = calculateGridHeight();
    setGridHeight(newGridHeight);
  }, [aspectRatio, splits]);

  // Reset grid position when alignment changes
  useEffect(() => {
    if (alignment === "top") {
      setGridVerticalOffset(0);
    } else if (alignment === "bottom") {
      const maxOffset = Math.max(0, previewHeight - gridHeight);
      setGridVerticalOffset(maxOffset);
    } else if (alignment === "custom") {
      // Center it initially
      const centerOffset = Math.max(0, (previewHeight - gridHeight) / 2);
      setGridVerticalOffset(centerOffset);
    }
  }, [alignment, gridHeight, previewHeight]);

  // Create pan responder for dragging the grid
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => alignment === "custom",
    onMoveShouldSetPanResponder: () => alignment === "custom",
    onPanResponderGrant: () => {
      // User started touching
    },
    onPanResponderMove: (evt, gestureState) => {
      if (alignment === "custom") {
        const maxOffset = Math.max(0, previewHeight - gridHeight);
        let newOffset = gridVerticalOffset + gestureState.dy;
        newOffset = Math.max(0, Math.min(newOffset, maxOffset));
        setGridVerticalOffset(newOffset);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      // Finalize position
      if (alignment === "custom") {
        const maxOffset = Math.max(0, previewHeight - gridHeight);
        let finalOffset = gridVerticalOffset + gestureState.dy;
        finalOffset = Math.max(0, Math.min(finalOffset, maxOffset));
        setGridVerticalOffset(finalOffset);
      }
    },
  });

  // Get grid position based on alignment
  const getGridTopPosition = () => {
    switch (alignment) {
      case "top":
        return 0;
      case "bottom":
        return Math.max(0, previewHeight - gridHeight);
      case "custom":
        return gridVerticalOffset;
      default:
        return 0;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={alignment !== "custom"}
    >
      <Text style={styles.title}>Configure Your Carousel</Text>

      {/* Image Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Selected Image</Text>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <Text style={styles.splitsInfo}>Splits: {splits} images</Text>
      </View>

      {/* Aspect Ratio Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Aspect Ratio</Text>
        <View style={styles.optionsRow}>
          {(["3:4", "4:5", "1:1"] as AspectRatio[]).map((ratio) => (
            <TouchableOpacity
              key={ratio}
              style={[
                styles.optionButton,
                aspectRatio === ratio && styles.optionButtonActive,
              ]}
              onPress={() => setAspectRatio(ratio)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  aspectRatio === ratio && styles.optionButtonTextActive,
                ]}
              >
                {ratio}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Alignment Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carousel Alignment</Text>
        <View style={styles.optionsRow}>
          {(["top", "bottom", "custom"] as Alignment[]).map((align) => (
            <TouchableOpacity
              key={align}
              style={[
                styles.optionButton,
                alignment === align && styles.optionButtonActive,
              ]}
              onPress={() => setAlignment(align)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  alignment === align && styles.optionButtonTextActive,
                ]}
              >
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Grid Preview - shown for all alignments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {alignment === "custom"
            ? "Drag Grid to Adjust Position"
            : "Grid Preview"}
        </Text>
        <View
          style={styles.gridPreview}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setPreviewHeight(height);
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.gridBackgroundImage}
          />
          {/* Draggable Grid Overlay */}
          <View
            style={[
              styles.gridContainer,
              {
                top: getGridTopPosition(),
                height: gridHeight,
              },
            ]}
            {...(alignment === "custom" ? panResponder.panHandlers : {})}
          >
            <View style={styles.gridOverlay}>
              {Array.from({ length: splits }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.gridCell,
                    {
                      width: `${100 / splits}%`,
                      aspectRatio:
                        aspectDimensions.width / aspectDimensions.height,
                    },
                  ]}
                >
                  <View style={styles.gridBorder} />
                </View>
              ))}
            </View>
          </View>
          {/* Drag instruction for custom mode */}
          {alignment === "custom" && (
            <View style={styles.dragInstructionContainer}>
              <Text style={styles.dragInstruction}>↕️ Drag to adjust</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridHint}>
          {alignment === "custom"
            ? "Drag the grid overlay to adjust vertical position"
            : `Grid is aligned to ${alignment}`}
        </Text>
      </View>

      {/* Generate Button */}
      <View style={styles.generateSection}>
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Generating carousel...</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        ) : (
          <Button title="Generate Carousel" onPress={handleGenerate} />
        )}
      </View>
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
    marginBottom: 20,
    textAlign: "center",
  },
  previewSection: {
    marginBottom: 30,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: "contain",
  },
  splitsInfo: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
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
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  optionButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  optionButtonTextActive: {
    color: "#fff",
  },
  gridPreview: {
    position: "relative",
    width: "100%",
    height: 300,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#000",
  },
  gridBackgroundImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gridContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  gridOverlay: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  gridCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  gridBorder: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dragInstructionContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dragInstruction: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: "600",
  },
  gridHint: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
  },
  generateSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 15,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
});
