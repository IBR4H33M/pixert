import React, { useState, useEffect, useRef, useMemo } from "react";
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
  TextInput,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, EditHistoryEntry } from "../../App";
import { RouteProp, useRoute } from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { Paths, File } from "expo-file-system";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { useTheme, ThemeColors } from "../context/ThemeContext";

type CarouselConfigScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CarouselConfig">;
};

const HISTORY_FILE = new File(Paths.document, "pixert_edit_history.json");
const MAX_HISTORY = 3;

const saveEditHistory = async (entry: EditHistoryEntry) => {
  let history: EditHistoryEntry[] = [];
  try {
    if (HISTORY_FILE.exists) {
      const raw = await HISTORY_FILE.text();
      history = JSON.parse(raw);
    }
  } catch {}
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  HISTORY_FILE.write(JSON.stringify(history));
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
}: CarouselConfigScreenProps) {
  const route = useRoute<RouteProp<RootStackParamList, "CarouselConfig">>();
  const prefill = route.params?.prefill;

  // Load Lato font
  const [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Image upload states
  const [imageUri, setImageUri] = useState<string | null>(
    prefill?.imageUri || null,
  );
  const [selectedSplits, setSelectedSplits] = useState<number>(
    prefill?.specs?.splits || 2,
  );
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Configuration states
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (prefill?.specs?.aspectRatio as AspectRatio) || "4:5",
  );
  const [gridWidthPercentage, setGridWidthPercentage] = useState<number>(
    prefill?.specs?.gridWidthPercentage ?? 100,
  ); // 50-100%
  const [previewWidth, setPreviewWidth] = useState<number>(300);
  const [previewHeight, setPreviewHeight] = useState(300);
  const [gridHorizontalOffset, setGridHorizontalOffset] = useState<number>(0);
  const [gridVerticalOffset, setGridVerticalOffset] = useState(0);
  const panStartX = useRef(0);
  const panStartY = useRef(0);

  // Refs to track current offset values for pan responder
  const gridHorizontalOffsetRef = useRef(0);
  const gridVerticalOffsetRef = useRef(0);

  const [gridHeight, setGridHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);

  // Refs to hold current dimension values for pan responder
  const previewWidthRef = useRef(300);
  const previewHeightRef = useRef(300);
  const gridWidthRef = useRef(0);
  const gridHeightRef = useRef(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  // Success/Error modal state
  const [resultModal, setResultModal] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  // Image picker function
  const pickImage = async () => {
    setIsLoadingImage(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload images!",
      );
      setIsLoadingImage(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
      exif: true,
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

      // Load image aspect ratio for preview
      Image.getSize(pickedImageUri, (width, height) => {
        setImageAspectRatio(width / height);
        setIsLoadingImage(false);
      });
    } else {
      setIsLoadingImage(false);
    }
  };

  const getFinalSplits = (): number => {
    return selectedSplits;
  };

  const splits = getFinalSplits();

  // Load image dimensions on mount (only if imageUri exists)
  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (width, height) => {
        setImageAspectRatio(width / height);
      });
    }
  }, [imageUri]);

  // Helper function to get TRUE image dimensions (not display size)
  const getActualImageSize = async (
    uri: string,
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
          console.warn(
            "MediaLibrary approach failed, trying ImageManipulator:",
            e,
          );
        }
      }

      // Fallback: Use ImageManipulator to get actual file dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [], // No transformations
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
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
              error,
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
              reject,
            );
          },
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
          reject,
        );
      });
    }
  };

  const handleGenerate = async () => {
    if (!imageUri) {
      Alert.alert("No Image", "Please upload an image first!");
      return;
    }

    const splits = getFinalSplits();
    if (splits === 0) {
      Alert.alert(
        "Invalid Input",
        "Please select or enter a valid number of splits (4-10).",
      );
      return;
    }

    try {
      setIsGenerating(true);
      setProgress(0);

      // Request media library permission once
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need permission to save images to your gallery.",
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
      });

      // Map preview grid dimensions directly to actual image crop
      // This ensures generated images exactly match the preview
      const totalCropWidth = (gridWidth / previewWidth) * imageSize.width;
      const totalCropHeight = (gridHeight / previewHeight) * imageSize.height;
      const cropWidth = totalCropWidth / splits;
      const cropHeight = totalCropHeight;

      console.log("Calculated crop dimensions (mapped from preview)", {
        cropWidth: cropWidth.toFixed(2),
        cropHeight: cropHeight.toFixed(2),
        totalCropWidth: totalCropWidth.toFixed(2),
      });

      // Map preview grid offset to actual image offset
      let xOffsetBase = (gridHorizontalOffset / previewWidth) * imageSize.width;
      let yOffset = (gridVerticalOffset / previewHeight) * imageSize.height;

      // Clamp to image bounds
      xOffsetBase = Math.max(
        0,
        Math.min(xOffsetBase, imageSize.width - totalCropWidth),
      );
      yOffset = Math.max(
        0,
        Math.min(yOffset, imageSize.height - totalCropHeight),
      );

      // Get album name from settings
      let albumName = "Pixert";
      try {
        const settingsFile = new File(Paths.document, "pixert_settings.json");
        if (settingsFile.exists) {
          const raw = await settingsFile.text();
          const data = JSON.parse(raw);
          if (data.albumName) albumName = data.albumName;
        }
      } catch (e) {
        console.warn("Failed to read album name setting:", e);
      }

      // Create album
      let album;
      try {
        album = await MediaLibrary.getAlbumAsync(albumName);
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
              ((e as any)?.message || String(e)),
          );
        }
        try {
          // Some versions accept (albumName, asset, copy) and some accept (albumName, assetId)
          // Try the 3-arg version first, fallback to 2-arg
          try {
            album = await (MediaLibrary as any).createAlbumAsync(
              albumName,
              firstAsset,
              false,
            );
          } catch (err) {
            console.warn("createAlbumAsync 3-arg failed, trying 2-arg", err);
            album = await (MediaLibrary as any).createAlbumAsync(
              albumName,
              firstAsset,
            );
          }
        } catch (e) {
          console.error("createAlbumAsync failed", e);
        }
      }

      // Process all images with cumulative positioning to avoid gaps
      const processedImages = [];
      let currentX = xOffsetBase;

      for (let i = 0; i < splits; i++) {
        // Calculate tile width - last tile takes remaining width
        const tileWidth =
          i === splits - 1
            ? Math.round(xOffsetBase + cropWidth * splits) -
              Math.round(currentX)
            : Math.round(currentX + cropWidth) - Math.round(currentX);

        // Crop the image with precise coordinates
        console.log(`Cropping split ${i + 1}/${splits}`, {
          xOffset: Math.round(currentX),
          yOffset: Math.round(yOffset),
          width: tileWidth,
          height: Math.round(cropHeight),
          sourceImageSize: imageSize,
        });

        let manipResult;
        try {
          manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [
              {
                crop: {
                  originX: Math.round(currentX),
                  originY: Math.round(yOffset),
                  width: tileWidth,
                  height: Math.round(cropHeight),
                },
              },
              // Keep original resolution - no resize for high quality
            ],
            { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
          );

          console.log(
            `Split ${i + 1} cropped successfully, result URI:`,
            manipResult.uri,
          );
        } catch (e) {
          console.error("ImageManipulator failed", e);
          throw new Error(
            "ImageManipulator failed: " + ((e as any)?.message || String(e)),
          );
        }
        processedImages.push(manipResult.uri);

        // Update progress for processing
        const processingProgress = 50 + ((i + 1) / splits) * 40;
        setProgress(processingProgress);

        currentX += cropWidth; // Move to next split position
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
            "createAssetAsync failed: " + ((e as any)?.message || String(e)),
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
            false,
          );
          console.log(`All assets added to ${albumName} album`);
        } catch (err) {
          console.warn(
            "addAssetsToAlbumAsync batch failed, trying individual",
            err,
          );
          // Fallback to individual additions if batch fails
          for (const asset of savedAssets) {
            try {
              await (MediaLibrary as any).addAssetsToAlbumAsync(
                [asset],
                (album as any).id || album,
              );
            } catch (err2) {
              console.error("Individual addAssetsToAlbumAsync failed", err2);
            }
          }
        }
      }

      setProgress(100);
      clearInterval(progressInterval);

      // Save to edit history
      try {
        await saveEditHistory({
          id: Date.now().toString(),
          mode: "carousel",
          imageUri: imageUri,
          timestamp: Date.now(),
          specs: {
            splits,
            aspectRatio,
            gridWidthPercentage,
          },
        });
      } catch (e) {
        console.warn("Failed to save edit history:", e);
      }

      // Show themed success message
      setIsGenerating(false);
      setResultModal({
        visible: true,
        type: "success",
        title: "Carousel Created!",
        message: `${splits} images saved to your gallery in the ${albumName} album.`,
      });
    } catch (error) {
      console.error("Error generating carousel:", error);
      setIsGenerating(false);
      setResultModal({
        visible: true,
        type: "error",
        title: "Something Went Wrong",
        message: "Failed to generate carousel images. Please try again.",
      });
    }
  };

  // Calculate total grid ratio based on splits and aspect ratio
  const aspectDimensions = getAspectRatioDimensions(aspectRatio);
  const totalGridWidth = aspectDimensions.width * splits;
  const totalGridHeight = aspectDimensions.height;

  // Calculate grid height based on preview width and slider percentage
  const calculateGridHeight = (width: number) => {
    const gridAspectRatio = totalGridWidth / totalGridHeight;
    return width / gridAspectRatio;
  };

  // Update grid dimensions when aspect ratio, splits, or width percentage change
  useEffect(() => {
    if (previewWidth <= 0 || previewHeight <= 0) return;
    const gridAspectRatio = totalGridWidth / totalGridHeight;

    // Calculate max grid that fits within BOTH preview width and height
    let maxGridWidth, maxGridHeight;
    if (previewWidth / previewHeight >= gridAspectRatio) {
      // Preview is wider than grid ratio — height is the constraint
      maxGridHeight = previewHeight;
      maxGridWidth = maxGridHeight * gridAspectRatio;
    } else {
      // Preview is taller than grid ratio — width is the constraint
      maxGridWidth = previewWidth;
      maxGridHeight = maxGridWidth / gridAspectRatio;
    }

    const newGridWidth = maxGridWidth * (gridWidthPercentage / 100);
    const newGridHeight = maxGridHeight * (gridWidthPercentage / 100);

    setGridWidth(newGridWidth);
    setGridHeight(newGridHeight);
    // Update refs for pan responder
    gridWidthRef.current = newGridWidth;
    gridHeightRef.current = newGridHeight;
  }, [aspectRatio, splits, gridWidthPercentage, previewWidth, previewHeight]);

  // Update preview dimension refs whenever they change
  useEffect(() => {
    previewWidthRef.current = previewWidth;
    previewHeightRef.current = previewHeight;
  }, [previewWidth, previewHeight]);

  // Reset grid position ONLY when image changes or aspect ratio/splits change (not on slider change)
  useEffect(() => {
    if (
      previewWidth > 0 &&
      previewHeight > 0 &&
      gridWidth > 0 &&
      gridHeight > 0
    ) {
      // Center it initially
      const centerVerticalOffset = Math.max(
        0,
        (previewHeight - gridHeight) / 2,
      );
      const centerHorizontalOffset = Math.max(
        0,
        (previewWidth - gridWidth) / 2,
      );
      setGridVerticalOffset(centerVerticalOffset);
      setGridHorizontalOffset(centerHorizontalOffset);
      // Also update refs
      gridVerticalOffsetRef.current = centerVerticalOffset;
      gridHorizontalOffsetRef.current = centerHorizontalOffset;
    }
  }, [aspectRatio, splits, imageUri]); // Only reset on these changes, not gridWidth/gridHeight

  // Clamp grid offset when grid dimensions change (e.g., slider increase while at edge)
  useEffect(() => {
    if (
      previewWidth <= 0 ||
      previewHeight <= 0 ||
      gridWidth <= 0 ||
      gridHeight <= 0
    )
      return;

    const maxVerticalOffset = Math.max(0, previewHeight - gridHeight);
    const maxHorizontalOffset = Math.max(0, previewWidth - gridWidth);

    const clampedV = Math.max(
      0,
      Math.min(gridVerticalOffset, maxVerticalOffset),
    );
    const clampedH = Math.max(
      0,
      Math.min(gridHorizontalOffset, maxHorizontalOffset),
    );

    if (clampedV !== gridVerticalOffset || clampedH !== gridHorizontalOffset) {
      setGridVerticalOffset(clampedV);
      setGridHorizontalOffset(clampedH);
      gridVerticalOffsetRef.current = clampedV;
      gridHorizontalOffsetRef.current = clampedH;
    }
  }, [gridWidth, gridHeight, previewWidth, previewHeight]);

  // Create pan responder for dragging the grid (both vertical and horizontal)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // Store current offsets from refs when touch starts
        panStartX.current = gridHorizontalOffsetRef.current;
        panStartY.current = gridVerticalOffsetRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Use refs for current dimension values
        const maxVerticalOffset = Math.max(
          0,
          previewHeightRef.current - gridHeightRef.current,
        );
        const maxHorizontalOffset = Math.max(
          0,
          previewWidthRef.current - gridWidthRef.current,
        );

        let newVerticalOffset = panStartY.current + gestureState.dy;
        newVerticalOffset = Math.max(
          0,
          Math.min(newVerticalOffset, maxVerticalOffset),
        );
        // Update both state and ref directly
        setGridVerticalOffset(newVerticalOffset);
        gridVerticalOffsetRef.current = newVerticalOffset;

        let newHorizontalOffset = panStartX.current + gestureState.dx;
        newHorizontalOffset = Math.max(
          0,
          Math.min(newHorizontalOffset, maxHorizontalOffset),
        );
        // Update both state and ref directly
        setGridHorizontalOffset(newHorizontalOffset);
        gridHorizontalOffsetRef.current = newHorizontalOffset;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Use refs for current dimension values
        const maxVerticalOffset = Math.max(
          0,
          previewHeightRef.current - gridHeightRef.current,
        );
        const maxHorizontalOffset = Math.max(
          0,
          previewWidthRef.current - gridWidthRef.current,
        );

        let finalVerticalOffset = panStartY.current + gestureState.dy;
        finalVerticalOffset = Math.max(
          0,
          Math.min(finalVerticalOffset, maxVerticalOffset),
        );
        // Update both state and ref directly
        setGridVerticalOffset(finalVerticalOffset);
        gridVerticalOffsetRef.current = finalVerticalOffset;

        let finalHorizontalOffset = panStartX.current + gestureState.dx;
        finalHorizontalOffset = Math.max(
          0,
          Math.min(finalHorizontalOffset, maxHorizontalOffset),
        );
        // Update both state and ref directly
        setGridHorizontalOffset(finalHorizontalOffset);
        gridHorizontalOffsetRef.current = finalHorizontalOffset;
      },
    }),
  ).current;

  // Get grid position
  const getGridTopPosition = () => {
    return gridVerticalOffset;
  };

  const getGridLeftPosition = () => {
    return gridHorizontalOffset;
  };

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.backgroundContainer} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        scrollEnabled={true}
      >
        {/* Image Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {imageUri ? "UPLOADED IMAGE" : "UPLOAD IMAGE"}
          </Text>
          {imageUri ? (
            <View>
              <View style={styles.uploadedImageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.uploadedImage}
                  resizeMode="contain"
                />
              </View>
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
                disabled={isLoadingImage}
                accessibilityLabel="Change image"
                accessibilityHint="Opens image picker to select a different photo"
              >
                <Text style={styles.changeImageButtonText}>
                  {isLoadingImage ? "Loading..." : "Change Image"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={isLoadingImage}
              accessibilityLabel="Upload an image for carousel splitting"
              accessibilityHint="Opens image picker to select a photo"
            >
              <Text style={styles.uploadButtonText}>
                {isLoadingImage ? "Loading..." : "Click to Select Image"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Single Preview removed here to keep only the grid preview below */}

        {/* Number of Splits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NUMBER OF SPLITS</Text>
          <View style={styles.splitControlContainer}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => {
                if (selectedSplits > 2) {
                  setSelectedSplits(selectedSplits - 1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              disabled={selectedSplits <= 2}
              accessibilityLabel="Decrease split count"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.arrowButtonText,
                  selectedSplits <= 2 && styles.arrowButtonDisabled,
                ]}
              >
                &lt;
              </Text>
            </TouchableOpacity>

            <View style={styles.splitNumberBox}>
              <Text style={styles.splitNumberText}>{selectedSplits}</Text>
            </View>

            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => {
                if (selectedSplits < 10) {
                  setSelectedSplits(selectedSplits + 1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              disabled={selectedSplits >= 10}
              accessibilityLabel="Increase split count"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.arrowButtonText,
                  selectedSplits >= 10 && styles.arrowButtonDisabled,
                ]}
              >
                &gt;
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aspect Ratio Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ASPECT RATIO OF EACH IMAGE</Text>
          <View style={styles.optionsRow}>
            {(["3:4", "4:5", "1:1"] as AspectRatio[]).map((ratio) => {
              const [width, height] = ratio.split(":").map(Number);
              const aspectValue = width / height;
              return (
                <TouchableOpacity
                  key={ratio}
                  style={styles.aspectRatioButton}
                  onPress={() => {
                    setAspectRatio(ratio);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityLabel={`Aspect ratio ${ratio}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: aspectRatio === ratio }}
                >
                  <View
                    style={[
                      styles.aspectRatioBox,
                      { aspectRatio: aspectValue },
                      aspectRatio === ratio && styles.aspectRatioBoxActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.aspectRatioText,
                        aspectRatio === ratio && styles.aspectRatioTextActive,
                      ]}
                    >
                      {ratio}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Carousel Size Slider - Only show if image is selected */}
        {imageUri && splits > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CAROUSEL SIZE</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Smaller</Text>
              <Slider
                style={styles.slider}
                minimumValue={50}
                maximumValue={100}
                value={gridWidthPercentage}
                onValueChange={(value) => setGridWidthPercentage(value)}
                onSlidingComplete={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.sliderTrack}
                thumbTintColor={colors.primary}
              />
              <Text style={styles.sliderLabel}>Bigger</Text>
            </View>
            <Text style={styles.sliderValue}>
              {Math.round(gridWidthPercentage)}%
            </Text>
          </View>
        )}

        {/* Grid Preview - Only show if image is selected */}
        {imageUri && splits > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DRAG THE GRID TO ALIGN</Text>
            <View
              style={[styles.gridPreview, { aspectRatio: imageAspectRatio }]}
              onLayout={(event) => {
                const { height, width } = event.nativeEvent.layout;
                setPreviewHeight(height);
                setPreviewWidth(width);
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
                    left: getGridLeftPosition(),
                    height: gridHeight,
                    width: gridWidth,
                  },
                ]}
                {...panResponder.panHandlers}
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
            </View>
          </View>
        )}

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
              accessibilityLabel="Generate carousel images"
              accessibilityHint="Creates split images from your uploaded photo"
              accessibilityRole="button"
            >
              <Text style={styles.generateButtonText}>Generate Images</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Themed Result Modal */}
      <Modal
        visible={resultModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setResultModal({ ...resultModal, visible: false })
        }
      >
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalContent}>
            <Text style={styles.resultModalIcon}>
              {resultModal.type === "success" ? "\u2713" : "!"}
            </Text>
            <Text style={styles.resultModalTitle}>{resultModal.title}</Text>
            <Text style={styles.resultModalMessage}>{resultModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.resultModalButton,
                resultModal.type === "error" && styles.resultModalButtonError,
              ]}
              onPress={() => {
                setResultModal({ ...resultModal, visible: false });
                if (resultModal.type === "success") {
                  navigation.navigate("Home");
                }
              }}
            >
              <Text style={styles.resultModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backgroundContainer: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 12,
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
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontFamily: "Lato_700Bold",
      color: c.textPrimary,
      marginBottom: 24,
      textAlign: "center",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    // Empty State
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontFamily: "Lato_700Bold",
      color: c.textPrimary,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: c.textSecondary,
      marginBottom: 12,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    // Upload button
    uploadButton: {
      backgroundColor: c.iconButtonBg,
      width: "100%",
      aspectRatio: 2,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: c.primary,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    uploadButtonText: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: c.primaryDark,
    },
    uploadedImageContainer: {
      width: "100%",
      aspectRatio: 2,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: c.inputBg,
      marginBottom: 12,
    },
    uploadedImage: {
      width: "100%",
      height: "100%",
    },
    changeImageButton: {
      backgroundColor: "transparent",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    changeImageButtonText: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    previewImage: {
      width: "100%",
      borderRadius: 12,
      marginBottom: 10,
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    optionButton: {
      flex: 1,
      backgroundColor: c.iconButtonBgStrong,
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
      marginHorizontal: 4,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    optionButtonActive: {
      backgroundColor: c.primary,
      shadowOpacity: 0.15,
      elevation: 4,
    },
    optionButtonText: {
      fontSize: 20,
      fontFamily: "Lato_700Bold",
      color: c.primaryDark,
    },
    optionButtonTextActive: {
      color: c.buttonText,
    },
    splitControlContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    arrowButton: {
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowButtonText: {
      fontSize: 40,
      color: c.primary,
      fontWeight: "300",
    },
    arrowButtonDisabled: {
      opacity: 0.3,
    },
    splitNumberBox: {
      backgroundColor: c.accent,
      borderWidth: 1,
      borderColor: c.primary,
      minWidth: 120,
      paddingVertical: 20,
      paddingHorizontal: 30,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    splitNumberText: {
      fontSize: 48,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    customInput: {
      marginTop: 12,
      backgroundColor: c.iconButtonBgStrong,
      padding: 14,
      borderRadius: 10,
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: c.primaryDark,
      textAlign: "center",
    },
    customInputInvalid: {
      backgroundColor: c.dangerBg,
    },
    sliderContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 8,
    },
    sliderLabel: {
      fontSize: 12,
      fontFamily: "Lato_700Bold",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    slider: {
      flex: 1,
      height: 40,
    },
    sliderValue: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      textAlign: "center",
      marginTop: 8,
    },
    gridPreview: {
      position: "relative",
      width: "100%",
      aspectRatio: 1,
      borderRadius: 0,
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
      backgroundColor: "rgba(0,0,0,0.25)",
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
      backgroundColor: "rgba(255,255,255,0.03)",
    },
    aspectRatioButton: {
      padding: 0,
      margin: 5,
    },
    aspectRatioBox: {
      backgroundColor: "#000",
      padding: 20,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
      minHeight: 60,
    },
    aspectRatioBoxActive: {
      backgroundColor: c.primary,
    },
    aspectRatioText: {
      color: c.buttonText,
      fontSize: 16,
      fontFamily: "Lato_700Bold",
    },
    aspectRatioTextActive: {
      fontSize: 18,
    },
    generateSection: {
      marginTop: 10,
      marginBottom: 20,
    },
    loadingContainer: {
      alignItems: "center",
      padding: 30,
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: c.textPrimary,
      marginTop: 15,
      marginBottom: 20,
    },
    progressBarContainer: {
      width: "100%",
      height: 10,
      backgroundColor: c.progressBg,
      borderRadius: 5,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressBar: {
      height: "100%",
      backgroundColor: c.primary,
      borderRadius: 5,
    },
    progressText: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: c.primary,
    },
    generateButton: {
      backgroundColor: c.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    },
    generateButtonText: {
      color: c.buttonText,
      fontSize: 17,
      fontFamily: "Lato_700Bold",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    // Result Modal
    resultModalOverlay: {
      flex: 1,
      backgroundColor: c.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
    },
    resultModalContent: {
      backgroundColor: c.modalBg,
      borderRadius: 20,
      padding: 30,
      alignItems: "center",
      width: "100%",
      maxWidth: 320,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    resultModalIcon: {
      fontSize: 48,
      color: c.primary,
      marginBottom: 12,
      fontWeight: "700",
    },
    resultModalTitle: {
      fontSize: 22,
      fontFamily: "Lato_700Bold",
      color: c.primary,
      marginBottom: 8,
      textAlign: "center",
    },
    resultModalMessage: {
      fontSize: 15,
      color: c.textTertiary,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 24,
    },
    resultModalButton: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      paddingHorizontal: 48,
      borderRadius: 30,
      alignItems: "center",
    },
    resultModalButtonError: {
      backgroundColor: c.danger,
    },
    resultModalButtonText: {
      color: c.buttonText,
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
  });
