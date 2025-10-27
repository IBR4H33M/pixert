# 📱 Pixert Carousel Maker - Implementation Guide

## ✅ **What's Been Implemented:**

### **Three-Page Flow:**

1. **Home Page** (`HomeScreen.tsx`)

   - Welcome message
   - "Make Carousel" button
   - Navigates to Carousel Setup

2. **Carousel Setup Page** (`CarouselSetupScreen.tsx`)

   - Upload image functionality
   - Split selection (2, 3, 4, or custom 4-10)
   - Validation (Next button disabled until image uploaded)
   - Preview uploaded image

3. **Carousel Config Page** (`CarouselConfigScreen.tsx`)
   - Aspect ratio selection (3:4, 4:5, 1:1)
   - Alignment options (Top, Bottom, Custom)
   - Custom grid overlay (when Custom selected)
   - Generate carousel button

---

## 📂 **File System & Storage:**

### **How Image Storage Works:**

#### **1. Image Picker (expo-image-picker):**

- Uses device's photo library
- Returns a **local URI** to the selected image
- No network access needed
- Format: `file:///data/user/0/.../image.jpg`

#### **2. Image Storage Location:**

**During App Session:**

- Images are stored in **temporary cache**
- URI points to device's local filesystem
- Persists until app closes or device clears cache

**For Permanent Storage (Future Enhancement):**

```javascript
import * as FileSystem from "expo-file-system";

// Save to app's permanent directory
const permanentUri = FileSystem.documentDirectory + "uploads/image.jpg";
await FileSystem.copyAsync({
  from: imageUri, // temporary URI
  to: permanentUri, // permanent location
});
```

#### **3. Current Implementation:**

- ✅ Image URI passed between screens via navigation params
- ✅ Local file access (no upload to server)
- ✅ Fast and works offline
- ⚠️ Images are temporary (cleared when app restarts)

---

## 🔧 **How Each Feature Works:**

### **1. Upload Functionality:**

```typescript
const pickImage = async () => {
  // Request permission to access photos
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  // Open device photo library
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });

  // Save URI to state
  if (!result.canceled) {
    setImageUri(result.assets[0].uri);
  }
};
```

**File System Flow:**

```
User selects image
     ↓
Expo Image Picker
     ↓
Returns local file URI (e.g., file:///storage/image.jpg)
     ↓
Stored in React state
     ↓
Passed to next screen via navigation params
```

### **2. Next Button Validation:**

```typescript
<Button
  title="Next →"
  onPress={handleNext}
  disabled={!imageUri} // Disabled until image uploaded
/>
```

- **Gray/disabled** when no image
- **Blue/active** when image uploaded
- Shows alert if user tries to proceed without image

### **3. Split Selection:**

- **Preset options:** 2, 3, 4 (single tap)
- **Custom option:** Opens text input for 4-10
- Validates custom input before proceeding

### **4. Custom Grid Overlay:**

When "Custom" alignment is selected:

- Shows image with grid overlay
- Grid divides image into `splits` columns
- Semi-transparent borders show split lines
- (Future: Add drag functionality to adjust position)

---

## 📱 **Data Flow:**

```
HomeScreen
    ↓
  [Make Carousel button]
    ↓
CarouselSetupScreen
  - Upload image → imageUri saved in state
  - Select splits → splits saved in state
  - Press Next → Navigate with params
    ↓
  navigation.navigate("CarouselConfig", { imageUri, splits })
    ↓
CarouselConfigScreen
  - Receives: route.params.imageUri, route.params.splits
  - Configure aspect ratio
  - Configure alignment
  - Generate carousel
```

---

## 🗂️ **File Structure:**

```
mobile/
├── App.tsx                          # Navigation setup
├── src/
│   └── screens/
│       ├── HomeScreen.tsx           # Home page
│       ├── CarouselSetupScreen.tsx  # Upload & splits
│       └── CarouselConfigScreen.tsx # Config & generate
```

---

## 🎨 **UI Components:**

### **CarouselSetupScreen:**

- **Upload Button:** Large, centered, dashed border
- **Image Preview:** Full-width, 300px height
- **Split Buttons:** Row of 4 buttons (2, 3, 4, Custom)
- **Custom Input:** Number pad keyboard, 2-digit max
- **Next Button:** Bottom, disabled when no image

### **CarouselConfigScreen:**

- **Image Preview:** Shows uploaded image
- **Aspect Ratio Buttons:** 3 buttons in a row
- **Alignment Buttons:** 3 buttons in a row
- **Grid Preview:** Image with overlay (custom mode)
- **Generate Button:** Final action button

---

## 💾 **Storage Considerations:**

### **Current (Temporary Storage):**

✅ Fast and simple
✅ No storage management needed
✅ Works offline
❌ Lost on app restart

### **For Production (Permanent Storage):**

**Option 1: Local Storage (expo-file-system)**

```javascript
// Save permanently
const dir = FileSystem.documentDirectory + "carousel_images/";
await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
await FileSystem.copyAsync({
  from: imageUri,
  to: dir + Date.now() + ".jpg",
});
```

**Option 2: AsyncStorage (metadata only)**

```javascript
import AsyncStorage from "@react-native-async-storage/async-storage";

// Save image reference
await AsyncStorage.setItem(
  "lastCarousel",
  JSON.stringify({
    imageUri,
    splits,
    aspectRatio,
    timestamp: Date.now(),
  })
);
```

**Option 3: Cloud Storage**

- Upload to Firebase Storage, AWS S3, etc.
- Better for sharing/syncing
- Requires internet connection

---

## 🚀 **Next Steps (Future Enhancements):**

1. **Persistent Storage:**

   - Save images to permanent directory
   - Store carousel configurations in AsyncStorage

2. **Grid Adjustment:**

   - Add PanResponder for draggable grid
   - Allow vertical positioning adjustment

3. **Carousel Generation:**

   - Split image into segments
   - Export individual carousel images
   - Save to camera roll

4. **Preview:**
   - Show carousel preview before generation
   - Swipeable preview of all splits

---

## 🔍 **Testing the Flow:**

1. **Start the app:**

   ```bash
   cd mobile
   npm start
   ```

2. **Test Upload:**

   - Tap "Make Carousel"
   - Tap "Upload Image"
   - Select image from gallery
   - See preview appear

3. **Test Validation:**

   - Try pressing "Next" without uploading → Alert shown
   - Upload image → "Next" button becomes active

4. **Test Split Selection:**

   - Tap 2, 3, or 4 → Button highlights
   - Tap Custom → Input field appears
   - Enter 7 → Proceeds with 7 splits

5. **Test Config:**
   - Select aspect ratio → Button highlights
   - Select alignment → Button highlights
   - Select Custom → Grid overlay appears

---

## 📝 **Key Files Modified:**

- ✅ `App.tsx` - Updated navigation
- ✅ `HomeScreen.tsx` - Added "Make Carousel" button
- ✅ `CarouselSetupScreen.tsx` - NEW - Upload & splits
- ✅ `CarouselConfigScreen.tsx` - NEW - Config page
- ✅ `package.json` - Added expo-image-picker, expo-file-system

---

## ✨ **Features Implemented:**

- ✅ Three-page navigation flow
- ✅ Image upload from device library
- ✅ Image preview
- ✅ Split selection (2, 3, 4, custom 4-10)
- ✅ Custom input validation
- ✅ Next button disabled until image uploaded
- ✅ Aspect ratio selection (3:4, 4:5, 1:1)
- ✅ Alignment options (Top, Bottom, Custom)
- ✅ Custom grid overlay preview
- ✅ Local file system integration
- ✅ Permission handling

---

**Your carousel maker is ready to use! Start the app and tap "Make Carousel" to begin!** 🎉
