# Pixert - Cross-Platform App

A modern cross-platform application built with **React Native** (mobile) and **React** (web), sharing common components and logic.

## 🚀 Project Structure

```
pixert/
├── mobile/          # React Native app (iOS & Android) with Expo
├── web/             # React web app with Vite
├── shared/          # Shared components, utilities, and types
└── README.md
```

## 📱 Tech Stack

### Mobile (React Native + Expo)

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform for React Native
- **TypeScript** - Type safety
- **React Navigation** - Navigation library

### Web (React + Vite)

- **React** - UI library
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type safety
- **React Router** - Client-side routing

### Shared

- **TypeScript** - Shared types and interfaces
- **Shared Components** - Reusable UI components
- **Shared Utilities** - Common helper functions

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo Go app** on your phone (for mobile preview)

## 📦 Installation

1. **Clone the repository** (or you're already here!)

2. **Install dependencies for all packages:**

```cmd
cd mobile
npm install
cd ..

cd web
npm install
cd ..

cd shared
npm install
cd ..
```

## 🏃 Running the Apps

### Mobile App (React Native + Expo)

```cmd
cd mobile
npm start
```

This will start the Expo development server. You'll see a QR code in the terminal.

**To preview on your phone:**

1. Install **Expo Go** app from App Store (iOS) or Play Store (Android)
2. Scan the QR code with your camera (iOS) or Expo Go app (Android)
3. The app will load on your phone!

**To preview on emulator:**

- Press `a` for Android emulator
- Press `i` for iOS simulator (Mac only)

### Web App (React + Vite)

```cmd
cd web
npm run dev
```

The web app will be available at **http://localhost:5173**

You can preview it directly in VS Code's Simple Browser or any web browser!

## 🎨 Features

- ✅ **Cross-platform** - Single codebase for iOS, Android, and Web
- ✅ **Shared components** - Reusable UI components across platforms
- ✅ **TypeScript** - Full type safety
- ✅ **Hot reload** - Instant updates during development
- ✅ **Navigation** - Configured routing for both mobile and web
- ✅ **Modern tooling** - Expo and Vite for best DX

## 📁 Key Files

### Mobile

- `mobile/App.tsx` - Main app entry with navigation
- `mobile/src/screens/` - Screen components
- `mobile/app.json` - Expo configuration

### Web

- `web/src/App.tsx` - Main app with routing
- `web/src/pages/` - Page components
- `web/vite.config.ts` - Vite configuration

### Shared

- `shared/src/components/` - Shared UI components
- `shared/src/utils/` - Shared utility functions
- `shared/src/types/` - Shared TypeScript types

## 🔧 Development Tips

### VS Code is Perfect for This!

- ✅ Use the integrated terminal to run both apps
- ✅ Preview the web app in VS Code's Simple Browser
- ✅ Debug both mobile and web apps
- ✅ IntelliSense works across shared packages

### Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**

### Adding Shared Components

1. Create component in `shared/src/components/`
2. Export it in `shared/src/index.ts`
3. Import in mobile or web: `import { Component } from '@shared/components/Component'`

## 📱 Mobile Preview Options

1. **Expo Go (Easiest)** ⭐

   - Install Expo Go app on your phone
   - Scan QR code - instant preview!
   - No emulator needed

2. **Android Emulator**

   - Requires Android Studio
   - Run with `npm run android` in mobile folder

3. **iOS Simulator** (Mac only)
   - Requires Xcode
   - Run with `npm run ios` in mobile folder

## 🌐 Web Preview

- Development server: `http://localhost:5173`
- Can preview in VS Code's Simple Browser
- Or use any web browser

## 📚 Learn More

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

## 🤝 Contributing

This is your project! Feel free to modify and extend it as needed.

## 📄 License

MIT

---

**Happy Coding! 🎉**
