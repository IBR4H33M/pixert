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
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";

type CarouselConfigScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CarouselConfig">;
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
  // Load Lato font
  const [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

  // Image upload states
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedSplits, setSelectedSplits] = useState<number>(2);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Configuration states
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [gridWidthPercentage, setGridWidthPercentage] = useState<number>(100); // 50-100%
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

  // Image picker function
  const pickImage = async () => {
    setIsLoadingImage(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload images!"
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
          console.warn(
            "MediaLibrary approach failed, trying ImageManipulator:",
            e
          );
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
    if (!imageUri) {
      Alert.alert("No Image", "Please upload an image first!");
      return;
    }

    const splits = getFinalSplits();
    if (splits === 0) {
      Alert.alert(
        "Invalid Input",
        "Please select or enter a valid number of splits (4-10)."
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
      });

      // Calculate dimensions for each carousel image with high precision
      // Apply the slider percentage to determine the actual crop size
      const sizeMultiplier = gridWidthPercentage / 100;
      let cropWidth: number;
      let cropHeight: number;

      // Calculate the total aspect ratio of the grid (splits side by side)
      const totalGridAspect =
        (aspectDimensions.width * splits) / aspectDimensions.height;
      const imageAspect = imageSize.width / imageSize.height;

      // Determine if we should base calculations on width or height
      if (imageAspect <= totalGridAspect) {
        // Image is NOT wide enough - use WIDTH as constraint (fill width, crop top/bottom)
        const maxCropWidth = imageSize.width / splits; // Maximum width per split
        cropWidth = maxCropWidth * sizeMultiplier; // Apply slider scaling
        cropHeight = cropWidth / targetAspect;
        console.log("Using WIDTH-based calculation (portrait/square image)", {
          maxCropWidth: maxCropWidth.toFixed(2),
          cropWidth: cropWidth.toFixed(2),
          cropHeight: cropHeight.toFixed(2),
          sizeMultiplier: sizeMultiplier.toFixed(2),
        });
      } else {
        // Image is TOO wide/landscape - use HEIGHT as constraint (fill height, crop sides)
        const maxCropHeight = imageSize.height;
        const maxTotalCropWidth = maxCropHeight * totalGridAspect;
        const maxCropWidth = maxTotalCropWidth / splits;
        
        cropWidth = maxCropWidth * sizeMultiplier; // Apply slider scaling
        cropHeight = cropWidth / targetAspect;
        
        console.log("Using HEIGHT-based calculation (landscape image)", {
          maxCropHeight: maxCropHeight.toFixed(2),
          maxTotalCropWidth: maxTotalCropWidth.toFixed(2),
          maxCropWidth: maxCropWidth.toFixed(2),
          cropWidth: cropWidth.toFixed(2),
          cropHeight: cropHeight.toFixed(2),
          sizeMultiplier: sizeMultiplier.toFixed(2),
        });
      }

      console.log("Calculated crop dimensions", {
        cropWidth: cropWidth.toFixed(2),
        cropHeight: cropHeight.toFixed(2),
        totalWidth: (cropWidth * splits).toFixed(2),
      });

      // Calculate vertical and horizontal offsets based on dragged position with high precision
      const verticalOffsetRatio = gridVerticalOffset / previewHeight;
      let yOffset = verticalOffsetRatio * imageSize.height;
      // Ensure it doesn't exceed bounds
      yOffset = Math.max(0, Math.min(yOffset, imageSize.height - cropHeight));

      const horizontalOffsetRatio = gridHorizontalOffset / previewWidth;
      const totalCropWidth = cropWidth * splits;
      let xOffsetBase = horizontalOffsetRatio * imageSize.width;
      // Ensure the entire crop area fits within the image
      xOffsetBase = Math.max(0, Math.min(xOffsetBase, imageSize.width - totalCropWidth));

      console.log("Offsets calculated", {
        yOffset: yOffset.toFixed(2),
        xOffsetBase: xOffsetBase.toFixed(2),
        verticalOffsetRatio: verticalOffsetRatio.toFixed(4),
        horizontalOffsetRatio: horizontalOffsetRatio.toFixed(4),
        totalCropWidth: totalCropWidth.toFixed(2),
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
        const exactXStart = xOffsetBase + (i * cropWidth);
        const exactXEnd = xOffsetBase + ((i + 1) * cropWidth);

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
        `Carousel images created successfully!\n${splits} images saved to your gallery.`,
        "",
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

  // Calculate grid height based on preview width and slider percentage
  const calculateGridHeight = (width: number) => {
    const gridAspectRatio = totalGridWidth / totalGridHeight;
    return width / gridAspectRatio;
  };

  // Update grid dimensions when aspect ratio, splits, or width percentage change
  useEffect(() => {
    const newGridWidth = (previewWidth * gridWidthPercentage) / 100;
    const newGridHeight = calculateGridHeight(newGridWidth);
    setGridWidth(newGridWidth);
    setGridHeight(newGridHeight);
    // Update refs for pan responder
    gridWidthRef.current = newGridWidth;
    gridHeightRef.current = newGridHeight;
  }, [aspectRatio, splits, gridWidthPercentage, previewWidth]);

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
        (previewHeight - gridHeight) / 2
      );
      const centerHorizontalOffset = Math.max(
        0,
        (previewWidth - gridWidth) / 2
      );
      setGridVerticalOffset(centerVerticalOffset);
      setGridHorizontalOffset(centerHorizontalOffset);
      // Also update refs
      gridVerticalOffsetRef.current = centerVerticalOffset;
      gridHorizontalOffsetRef.current = centerHorizontalOffset;
    }
  }, [aspectRatio, splits, imageUri]); // Only reset on these changes, not gridWidth/gridHeight

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
          previewHeightRef.current - gridHeightRef.current
        );
        const maxHorizontalOffset = Math.max(
          0,
          previewWidthRef.current - gridWidthRef.current
        );

        let newVerticalOffset = panStartY.current + gestureState.dy;
        newVerticalOffset = Math.max(
          0,
          Math.min(newVerticalOffset, maxVerticalOffset)
        );
        // Update both state and ref directly
        setGridVerticalOffset(newVerticalOffset);
        gridVerticalOffsetRef.current = newVerticalOffset;

        let newHorizontalOffset = panStartX.current + gestureState.dx;
        newHorizontalOffset = Math.max(
          0,
          Math.min(newHorizontalOffset, maxHorizontalOffset)
        );
        // Update both state and ref directly
        setGridHorizontalOffset(newHorizontalOffset);
        gridHorizontalOffsetRef.current = newHorizontalOffset;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Use refs for current dimension values
        const maxVerticalOffset = Math.max(
          0,
          previewHeightRef.current - gridHeightRef.current
        );
        const maxHorizontalOffset = Math.max(
          0,
          previewWidthRef.current - gridWidthRef.current
        );

        let finalVerticalOffset = panStartY.current + gestureState.dy;
        finalVerticalOffset = Math.max(
          0,
          Math.min(finalVerticalOffset, maxVerticalOffset)
        );
        // Update both state and ref directly
        setGridVerticalOffset(finalVerticalOffset);
        gridVerticalOffsetRef.current = finalVerticalOffset;

        let finalHorizontalOffset = panStartX.current + gestureState.dx;
        finalHorizontalOffset = Math.max(
          0,
          Math.min(finalHorizontalOffset, maxHorizontalOffset)
        );
        // Update both state and ref directly
        setGridHorizontalOffset(finalHorizontalOffset);
        gridHorizontalOffsetRef.current = finalHorizontalOffset;
      },
    })
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
        <ActivityIndicator size="large" color="#376161" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={true}
    >
      <Text style={styles.title}>CONFIGURE IMAGES</Text>

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
              minimumTrackTintColor="#376161"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#376161"
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
    fontSize: 28,
    fontFamily: "Lato_700Bold",
    color: "#333",
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
    color: "#333",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Lato_700Bold",
    color: "#444",
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // Upload button (rectangular 18:9 with dashed border)
  uploadButton: {
    backgroundColor: "rgba(55,97,97,0.15)",
    width: "100%",
    aspectRatio: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#376161",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: "Lato_700Bold",
    color: "#203838",
  },
  uploadedImageContainer: {
    width: "100%",
    aspectRatio: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
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
    color: "#376161",
  },
  // Preview (kept only as grid preview below)
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
  // Selection buttons (semi-transparent, no inner border)
  optionButton: {
    flex: 1,
    backgroundColor: "rgba(55,97,97,0.25)",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  optionButtonActive: {
    backgroundColor: "#376161",
    shadowOpacity: 0.15,
    elevation: 4,
  },
  optionButtonText: {
    fontSize: 20,
    fontFamily: "Lato_700Bold",
    color: "#203838",
  },
  optionButtonTextActive: {
    color: "#fff",
  },
  // Split Control (Arrow-based UI)
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
    color: "#376161",
    fontWeight: "300",
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  splitNumberBox: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#376161",
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
    color: "#376161",
  },
  customInput: {
    marginTop: 12,
    backgroundColor: "rgba(55,97,97,0.25)",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "Lato_700Bold",
    color: "#203838",
    textAlign: "center",
  },
  customInputInvalid: {
    // keep a visual invalid hint via background tint
    backgroundColor: "rgba(231,76,60,0.12)",
  },
  // Slider for grid width
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: "Lato_700Bold",
    color: "#666",
    textTransform: "uppercase",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 16,
    fontFamily: "Lato_700Bold",
    color: "#376161",
    textAlign: "center",
    marginTop: 8,
  },
  gridPreview: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aspectRatioBoxActive: {
    backgroundColor: "#376161",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  aspectRatioText: {
    color: "#fff",
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
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Lato_700Bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#376161",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Lato_700Bold",
    color: "#376161",
  },
  generateButton: {
    backgroundColor: "#376161",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Lato_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
