import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useFonts, Lato_700Bold } from "@expo-google-fonts/lato";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";

type GridConfigScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "GridConfig">;
};

type GridDimension = "2x2" | "3x2" | "3x3";
type AspectRatio = "3:4" | "1:1";

export default function GridConfigScreen({
  navigation,
}: GridConfigScreenProps) {
  const [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<GridDimension>("2x2");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  // Grid preview and dragging states
  const [gridWidthPercentage, setGridWidthPercentage] = useState<number>(100);
  const [previewWidth, setPreviewWidth] = useState<number>(300);
  const [previewHeight, setPreviewHeight] = useState(300);
  const [gridHorizontalOffset, setGridHorizontalOffset] = useState<number>(0);
  const [gridVerticalOffset, setGridVerticalOffset] = useState(0);
  const panStartX = useRef(0);
  const panStartY = useRef(0);

  const gridHorizontalOffsetRef = useRef(0);
  const gridVerticalOffsetRef = useRef(0);

  const [gridHeight, setGridHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);

  const previewWidthRef = useRef(300);
  const previewHeightRef = useRef(300);
  const gridWidthRef = useRef(0);
  const gridHeightRef = useRef(0);

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

  const handleGridSelection = (grid: GridDimension) => {
    setSelectedGrid(grid);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Auto-select aspect ratio based on grid
    if (grid === "2x2") {
      setAspectRatio("1:1");
    } else {
      setAspectRatio("3:4");
    }
  };

  // Get actual image size
  const getActualImageSize = async (
    uri: string
  ): Promise<{ width: number; height: number }> => {
    try {
      if (uri.startsWith("file://") || uri.startsWith("content://")) {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);

          if (assetInfo.width && assetInfo.height) {
            return { width: assetInfo.width, height: assetInfo.height };
          }
        } catch (e) {
          console.warn("MediaLibrary approach failed:", e);
        }
      }

      const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return new Promise((resolve, reject) => {
        Image.getSize(
          imageInfo.uri,
          (width, height) => resolve({ width, height }),
          (error) => {
            Image.getSize(
              uri,
              (width, height) => resolve({ width, height }),
              reject
            );
          }
        );
      });
    } catch (error) {
      return new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width, height) => resolve({ width, height }),
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

    try {
      setIsGenerating(true);
      setProgress(0);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need permission to save images to your gallery."
        );
        setIsGenerating(false);
        return;
      }

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Get grid configuration
      const [cols, rows] = selectedGrid.split("x").map(Number);
      const totalCells = cols * rows;

      // Get actual image dimensions
      const imageSize = await getActualImageSize(imageUri);

      // Calculate cell dimensions based on aspect ratio and grid size percentage
      const sizeMultiplier = gridWidthPercentage / 100;
      let cellWidth: number;
      let cellHeight: number;

      if (aspectRatio === "1:1") {
        const maxCellSize = Math.min(
          imageSize.width / cols,
          imageSize.height / rows
        );
        cellWidth = cellHeight = maxCellSize * sizeMultiplier;
      } else {
        // 3:4 aspect ratio
        const maxCellWidth = imageSize.width / cols;
        cellWidth = maxCellWidth * sizeMultiplier;
        cellHeight = (cellWidth * 4) / 3;
      }

      // Calculate offsets based on dragged position
      const verticalOffsetRatio = gridVerticalOffset / previewHeight;
      let yOffset = verticalOffsetRatio * imageSize.height;
      const totalGridHeight = cellHeight * rows;
      yOffset = Math.max(
        0,
        Math.min(yOffset, imageSize.height - totalGridHeight)
      );

      const horizontalOffsetRatio = gridHorizontalOffset / previewWidth;
      const totalGridWidth = cellWidth * cols;
      let xOffset = horizontalOffsetRatio * imageSize.width;
      xOffset = Math.max(
        0,
        Math.min(xOffset, imageSize.width - totalGridWidth)
      );

      // Create Pixert album
      let album;
      try {
        album = await MediaLibrary.getAlbumAsync("Pixert");
      } catch (e) {
        console.error("getAlbumAsync failed", e);
      }

      if (!album) {
        let firstAsset;
        try {
          firstAsset = await MediaLibrary.createAssetAsync(imageUri);
        } catch (e) {
          console.error("createAssetAsync (firstAsset) failed", e);
          throw new Error("createAssetAsync (firstAsset) failed");
        }
        try {
          try {
            album = await (MediaLibrary as any).createAlbumAsync(
              "Pixert",
              firstAsset,
              false
            );
          } catch (err) {
            album = await (MediaLibrary as any).createAlbumAsync(
              "Pixert",
              firstAsset
            );
          }
        } catch (e) {
          console.error("createAlbumAsync failed", e);
        }
      }

      // Create grid layout
      const processedImages = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const exactXStart = xOffset + col * cellWidth;
          const exactYStart = yOffset + row * cellHeight;

          const thisXOffset = Math.round(exactXStart);
          const thisYOffset = Math.round(exactYStart);
          const thisWidth = Math.round(cellWidth);
          const thisHeight = Math.round(cellHeight);

          const croppedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [
              {
                crop: {
                  originX: thisXOffset,
                  originY: thisYOffset,
                  width: thisWidth,
                  height: thisHeight,
                },
              },
            ],
            { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
          );

          processedImages.push(croppedImage.uri);
          setProgress(50 + (processedImages.length / totalCells) * 40);
        }
      }

      // Save all images
      const savedAssets = [];
      for (let i = 0; i < processedImages.length; i++) {
        const asset = await MediaLibrary.createAssetAsync(processedImages[i]);
        savedAssets.push(asset);
        setProgress(90 + ((i + 1) / processedImages.length) * 10);
      }

      // Add to album
      if (album && savedAssets.length > 0) {
        try {
          await (MediaLibrary as any).addAssetsToAlbumAsync(
            savedAssets,
            album,
            false
          );
        } catch (err) {
          console.warn("addAssetsToAlbumAsync batch failed", err);
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

      clearInterval(progressInterval);
      setProgress(100);

      Alert.alert(
        `Grid layout created successfully!\n${totalCells} images saved to your gallery.`,
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
      console.error("Error generating grid:", error);
      Alert.alert("Error", "Failed to generate grid layout. Please try again.");
      setIsGenerating(false);
    }
  };

  // Load image dimensions on mount
  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (width, height) => {
        setImageAspectRatio(width / height);
      });
    }
  }, [imageUri]);

  // Calculate grid dimensions based on selected grid and aspect ratio
  const getGridDimensions = () => {
    const [cols, rows] = selectedGrid.split("x").map(Number);
    // For 3:4 aspect ratio, width:height = 3:4, so height = width * (4/3)
    const cellAspect = aspectRatio === "1:1" ? 1 : 4 / 3;

    const totalWidth = cols;
    const totalHeight = rows * cellAspect;

    return { width: totalWidth, height: totalHeight };
  };

  const calculateGridHeight = (width: number) => {
    const gridDims = getGridDimensions();
    const gridAspectRatio = gridDims.width / gridDims.height;
    return width / gridAspectRatio;
  };

  // Update grid dimensions when settings change
  useEffect(() => {
    const newGridWidth = (previewWidth * gridWidthPercentage) / 100;
    const newGridHeight = calculateGridHeight(newGridWidth);
    setGridWidth(newGridWidth);
    setGridHeight(newGridHeight);
    gridWidthRef.current = newGridWidth;
    gridHeightRef.current = newGridHeight;
  }, [aspectRatio, selectedGrid, gridWidthPercentage, previewWidth]);

  // Update preview dimension refs
  useEffect(() => {
    previewWidthRef.current = previewWidth;
    previewHeightRef.current = previewHeight;
  }, [previewWidth, previewHeight]);

  // Reset grid position when image or settings change
  useEffect(() => {
    if (
      previewWidth > 0 &&
      previewHeight > 0 &&
      gridWidth > 0 &&
      gridHeight > 0
    ) {
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
      gridVerticalOffsetRef.current = centerVerticalOffset;
      gridHorizontalOffsetRef.current = centerHorizontalOffset;
    }
  }, [
    aspectRatio,
    selectedGrid,
    imageUri,
    gridWidth,
    gridHeight,
    previewWidth,
    previewHeight,
  ]);

  // Create pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        panStartX.current = gridHorizontalOffsetRef.current;
        panStartY.current = gridVerticalOffsetRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
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
        setGridVerticalOffset(newVerticalOffset);
        gridVerticalOffsetRef.current = newVerticalOffset;

        let newHorizontalOffset = panStartX.current + gestureState.dx;
        newHorizontalOffset = Math.max(
          0,
          Math.min(newHorizontalOffset, maxHorizontalOffset)
        );
        setGridHorizontalOffset(newHorizontalOffset);
        gridHorizontalOffsetRef.current = newHorizontalOffset;
      },
      onPanResponderRelease: (evt, gestureState) => {
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
        setGridVerticalOffset(finalVerticalOffset);
        gridVerticalOffsetRef.current = finalVerticalOffset;

        let finalHorizontalOffset = panStartX.current + gestureState.dx;
        finalHorizontalOffset = Math.max(
          0,
          Math.min(finalHorizontalOffset, maxHorizontalOffset)
        );
        setGridHorizontalOffset(finalHorizontalOffset);
        gridHorizontalOffsetRef.current = finalHorizontalOffset;
      },
    })
  ).current;

  const getGridTopPosition = () => gridVerticalOffset;
  const getGridLeftPosition = () => gridHorizontalOffset;

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#376161" />
      </View>
    );
  }

  const [cols, rows] = selectedGrid.split("x").map(Number);
  // For display, 3:4 aspect means aspectRatio prop = 3/4 = 0.75 (portrait)
  const cellAspect = aspectRatio === "1:1" ? 1 : 3 / 4;

  return (
    <SafeAreaView style={styles.backgroundContainer} edges={["top"]}>
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
            >
              <Text style={styles.uploadButtonText}>
                {isLoadingImage ? "Loading..." : "Click to Select Image"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grid Dimension Selection with Arrow Keys */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GRID DIMENSION</Text>
          <View style={styles.splitControlContainer}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => {
                if (selectedGrid === "3x2") {
                  handleGridSelection("2x2");
                } else if (selectedGrid === "3x3") {
                  handleGridSelection("3x2");
                }
              }}
              disabled={selectedGrid === "2x2"}
            >
              <Text
                style={[
                  styles.arrowButtonText,
                  selectedGrid === "2x2" && styles.arrowButtonDisabled,
                ]}
              >
                &lt;
              </Text>
            </TouchableOpacity>

            <View style={styles.splitNumberBox}>
              <Text style={styles.splitNumberText}>{selectedGrid}</Text>
            </View>

            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => {
                if (selectedGrid === "2x2") {
                  handleGridSelection("3x2");
                } else if (selectedGrid === "3x2") {
                  handleGridSelection("3x3");
                }
              }}
              disabled={selectedGrid === "3x3"}
            >
              <Text
                style={[
                  styles.arrowButtonText,
                  selectedGrid === "3x3" && styles.arrowButtonDisabled,
                ]}
              >
                &gt;
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aspect Ratio Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ASPECT RATIO (AUTO-SELECTED)</Text>
          <View style={styles.aspectRatioDisplay}>
            <Text style={styles.aspectRatioText}>{aspectRatio}</Text>
          </View>
        </View>

        {/* Grid Size Slider */}
        {imageUri && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GRID SIZE</Text>
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

        {/* Grid Preview */}
        {imageUri && (
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
                  {Array.from({ length: rows }).map((_, rowIndex) => (
                    <View key={rowIndex} style={styles.gridRow}>
                      {Array.from({ length: cols }).map((_, colIndex) => (
                        <View
                          key={colIndex}
                          style={[
                            styles.gridCell,
                            {
                              width: `${100 / cols}%`,
                              aspectRatio: cellAspect,
                              borderLeftWidth: colIndex === 0 ? 2 : 0,
                              borderLeftColor: "rgba(255, 255, 255, 0.9)",
                              borderTopWidth: rowIndex === 0 ? 2 : 0,
                              borderTopColor: "rgba(255, 255, 255, 0.9)",
                            },
                          ]}
                        >
                          <View style={styles.gridBorder} />
                        </View>
                      ))}
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
              <Text style={styles.loadingText}>Generating grid layout...</Text>
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
              <Text style={styles.generateButtonText}>Generate Images</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: "#97C8C9",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 20,
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
  aspectRatioDisplay: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#376161",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  aspectRatioText: {
    fontSize: 24,
    fontFamily: "Lato_700Bold",
    color: "#376161",
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
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  gridRow: {
    flexDirection: "row",
    width: "100%",
  },
  gridCell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 2,
    borderRightColor: "rgba(255, 255, 255, 0.9)",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  gridBorder: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
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
