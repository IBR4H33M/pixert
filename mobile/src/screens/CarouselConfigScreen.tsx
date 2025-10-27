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
// import { Button } from "@shared/components/Button"; // Temporarily disabled due to React version conflict
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

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
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  // Load image dimensions on mount
  useEffect(() => {
    Image.getSize(imageUri, (width, height) => {
      setImageAspectRatio(width / height);
    });
  }, [imageUri]);

  // Helper function to get TRUE image dimensions (not display size)
  const getActualImageSize = async (
    uri: string
  ): Promise<{ width: number; height: number }> => {
    try {
      // Try to get asset info from MediaLibrary first (most reliable for original dimensions)
      if (uri.startsWith("file://") || uri.startsWith("content://")) {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);

          if (assetInfo.width && assetInfo.height) {
            console.log("Actual image dimensions from MediaLibrary:", {
              width: assetInfo.width,
              height: assetInfo.height,
            });
            return { width: assetInfo.width, height: assetInfo.height };
          }
        } catch (e) {
          console.warn("MediaLibrary approach failed, trying ImageManipulator:", e);
        }
      }

      // Fallback: Use ImageManipulator to get actual file dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [], // No transformations
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Get the size of the manipulated result
      return new Promise((resolve, reject) => {
        Image.getSize(
          imageInfo.uri,
          (width, height) => {
            console.log("Actual image dimensions from ImageManipulator:", {
              width,
              height,
            });
            resolve({ width, height });
          },
          (error) => {
            console.error(
              "Failed to get image size from manipulated image:",
              error
            );
            // Last resort: regular Image.getSize on original
            Image.getSize(
              uri,
              (width, height) => {
                console.warn("Using fallback Image.getSize (may be scaled):", {
                  width,
                  height,
                });
                resolve({ width, height });
              },
              reject
            );
          }
        );
      });
    } catch (error) {
      console.error("All methods failed, using basic Image.getSize:", error);
      // Final fallback
      return new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width, height) => {
            console.warn("Using last resort Image.getSize:", { width, height });
            resolve({ width, height });
          },
          reject
        );
      });
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);

      // Request media library permission once
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

      // Get ACTUAL image dimensions (not display size)
      console.log("Getting actual image dimensions from:", imageUri);
      const imageSize = await getActualImageSize(imageUri);

      const aspectDimensions = getAspectRatioDimensions(aspectRatio);
      const targetAspect = aspectDimensions.width / aspectDimensions.height;

      console.log("Image processing started", {
        imageSize,
        splits,
        aspectRatio,
        targetAspect,
        alignment,
      });

      // Calculate dimensions for each carousel image with high precision
      let cropWidth: number;
      let cropHeight: number;

      // Calculate the total aspect ratio of the grid (splits side by side)
      const totalGridAspect =
        (aspectDimensions.width * splits) / aspectDimensions.height;
      const imageAspect = imageSize.width / imageSize.height;

      // Determine if we should base calculations on width or height
      if (imageAspect <= totalGridAspect) {
        // Image is NOT wide enough - use WIDTH as constraint (fill width, crop top/bottom)
        cropWidth = imageSize.width / splits; // Width per split
        cropHeight = cropWidth / targetAspect;
        console.log("Using WIDTH-based calculation (portrait/square image)", {
          cropWidth: cropWidth.toFixed(2),
          cropHeight: cropHeight.toFixed(2),
        });
      } else {
        // Image is TOO wide/landscape - use HEIGHT as constraint (fill height, crop sides)
        cropHeight = imageSize.height;
        const totalCropWidth = cropHeight * totalGridAspect;
        cropWidth = totalCropWidth / splits; // Width per split
        console.log("Using HEIGHT-based calculation (landscape image)", {
          cropHeight: cropHeight.toFixed(2),
          totalCropWidth: totalCropWidth.toFixed(2),
          cropWidth: cropWidth.toFixed(2),
        });
      }

      console.log("Calculated crop dimensions", {
        cropWidth: cropWidth.toFixed(2),
        cropHeight: cropHeight.toFixed(2),
        totalWidth: (cropWidth * splits).toFixed(2),
      });

      // Calculate vertical offset based on alignment with high precision
      let yOffset = 0;
      if (alignment === "bottom") {
        yOffset = imageSize.height - cropHeight;
      } else if (alignment === "top") {
        yOffset = 0;
      } else {
        // custom - use the dragged position with precise calculation
        const offsetRatio = gridVerticalOffset / previewHeight;
        yOffset = offsetRatio * imageSize.height;
        // Ensure it doesn't exceed bounds
        yOffset = Math.max(0, Math.min(yOffset, imageSize.height - cropHeight));
      }

      console.log("Vertical offset calculated", {
        yOffset: yOffset.toFixed(2),
        alignment,
        offsetRatio:
          alignment === "custom"
            ? (gridVerticalOffset / previewHeight).toFixed(4)
            : "N/A",
      });

      // Create Pixert album
      let album;
      try {
        album = await MediaLibrary.getAlbumAsync("Pixert");
      } catch (e) {
        console.error("getAlbumAsync failed", e);
      }
      if (!album) {
        // Create album by first creating an asset and then the album
        let firstAsset;
        try {
          firstAsset = await MediaLibrary.createAssetAsync(imageUri);
        } catch (e) {
          console.error("createAssetAsync (firstAsset) failed", e);
          throw new Error(
            "createAssetAsync (firstAsset) failed: " +
              ((e as any)?.message || String(e))
          );
        }
        try {
          // Some versions accept (albumName, asset, copy) and some accept (albumName, assetId)
          // Try the 3-arg version first, fallback to 2-arg
          try {
            album = await (MediaLibrary as any).createAlbumAsync(
              "Pixert",
              firstAsset,
              false
            );
          } catch (err) {
            console.warn("createAlbumAsync 3-arg failed, trying 2-arg", err);
            album = await (MediaLibrary as any).createAlbumAsync(
              "Pixert",
              firstAsset
            );
          }
        } catch (e) {
          console.error("createAlbumAsync failed", e);
        }
      }

      // Process all images and collect them before saving to avoid multiple permission prompts
      const processedImages = [];
      for (let i = 0; i < splits; i++) {
        // Calculate exact crop region for this split to avoid accumulated rounding errors
        const exactXStart = i * cropWidth;
        const exactXEnd = (i + 1) * cropWidth;

        // Round to integers for this specific crop
        const xOffset = Math.round(exactXStart);
        const thisWidth = Math.round(exactXEnd) - Math.round(exactXStart);
        const thisHeight = Math.round(cropHeight);
        const thisYOffset = Math.round(yOffset);

        // Crop the image with precise coordinates
        console.log(`Cropping split ${i + 1}/${splits}`, {
          xOffset,
          yOffset: thisYOffset,
          width: thisWidth,
          height: thisHeight,
          sourceImageSize: imageSize,
        });

        let manipResult;
        try {
          manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [
              {
                crop: {
                  originX: xOffset,
                  originY: thisYOffset,
                  width: thisWidth,
                  height: thisHeight,
                },
              },
              // Keep original resolution - no resize for high quality
            ],
            { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
          );

          console.log(
            `Split ${i + 1} cropped successfully, result URI:`,
            manipResult.uri
          );
        } catch (e) {
          console.error("ImageManipulator failed", e);
          throw new Error(
            "ImageManipulator failed: " + ((e as any)?.message || String(e))
          );
        }
        processedImages.push(manipResult.uri);

        // Update progress for processing
        const processingProgress = 50 + ((i + 1) / splits) * 40;
        setProgress(processingProgress);
      }

      console.log("All images processed, saving to gallery...");

      // Now save all images in batch to minimize permission prompts
      const savedAssets = [];
      for (let i = 0; i < processedImages.length; i++) {
        let asset;
        try {
          asset = await MediaLibrary.createAssetAsync(processedImages[i]);
          console.log(`Saved split ${i + 1} to gallery, asset ID:`, asset.id);
        } catch (e) {
          console.error("createAssetAsync failed", e);
          throw new Error(
            "createAssetAsync failed: " + ((e as any)?.message || String(e))
          );
        }
        savedAssets.push(asset);

        // Update progress for saving
        const savingProgress = 90 + ((i + 1) / processedImages.length) * 10;
        setProgress(savingProgress);
      }

      // Add all assets to album in batch
      if (album && savedAssets.length > 0) {
        try {
          await (MediaLibrary as any).addAssetsToAlbumAsync(
            savedAssets,
            album,
            false
          );
          console.log("All assets added to Pixert album");
        } catch (err) {
          console.warn(
            "addAssetsToAlbumAsync batch failed, trying individual",
            err
          );
          // Fallback to individual additions if batch fails
          for (const asset of savedAssets) {
            try {
              await (MediaLibrary as any).addAssetsToAlbumAsync(
                [asset],
                (album as any).id || album
              );
            } catch (err2) {
              console.error("Individual addAssetsToAlbumAsync failed", err2);
            }
          }
        }
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
      Alert.alert(
        "Error",
        "Failed to generate carousel images. Check console for details."
      );
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

  // Create pan responder for dragging the grid (only within preview area)
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
      scrollEnabled={true}
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
          style={[styles.gridPreview, { aspectRatio: imageAspectRatio }]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setPreviewHeight(height);
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.gridBackgroundImage}
            resizeMode="contain"
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
                      borderLeftWidth: index === 0 ? 2 : 0,
                      borderLeftColor: "rgba(255, 255, 255, 0.9)",
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
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
          >
            <Text style={styles.generateButtonText}>Generate Carousel</Text>
          </TouchableOpacity>
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
    aspectRatio: 1, // Will be overridden dynamically
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
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
    borderRightWidth: 2,
    borderRightColor: "rgba(255, 255, 255, 0.9)",
  },
  gridBorder: {
    width: "100%",
    height: "100%",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "rgba(255, 255, 255, 0.9)",
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
  generateButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
