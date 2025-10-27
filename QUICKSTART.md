# 🚀 Quick Start Guide

## You're All Set! 🎉

Your React Native + React cross-platform project is ready to go!

## What We've Built

✅ **Mobile App** - React Native with Expo (iOS & Android)  
✅ **Web App** - React with Vite  
✅ **Shared Package** - Common components and utilities  
✅ **All Dependencies Installed**

## 🏃 How to Run

### Option 1: Using VS Code Tasks (Recommended)

1. Press **Ctrl+Shift+P** (or Cmd+Shift+P on Mac)
2. Type "Run Task"
3. Choose one of:
   - **Start Mobile App (Expo)** - Run mobile app only
   - **Start Web App (Vite)** - Run web app only
   - **Start Both Apps** - Run both simultaneously!

### Option 2: Using Terminal

**For Mobile:**

```cmd
cd mobile
npm start
```

Then scan the QR code with Expo Go app on your phone!

**For Web:**

```cmd
cd web
npm run dev
```

Then open http://localhost:5173 in your browser!

## 📱 Preview the Mobile App

### Easiest Method - Expo Go App:

1. Download **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `npm start` in the mobile folder
3. Scan the QR code that appears
4. Your app loads instantly on your phone! 🎉

### Alternative - Emulators:

- Press `a` for Android emulator (requires Android Studio)
- Press `i` for iOS simulator (Mac only, requires Xcode)

## 🌐 Preview the Web App

### In VS Code (Simple Browser):

1. Run the web app (`cd web && npm run dev`)
2. Press **Ctrl+Shift+P**
3. Type "Simple Browser"
4. Enter: `http://localhost:5173`

### In Regular Browser:

Just open http://localhost:5173 after starting the web app!

## 📂 Project Structure

```
pixert/
├── mobile/              # React Native app
│   ├── App.tsx         # Main app with navigation
│   └── src/screens/    # All screens
├── web/                # React web app
│   ├── src/App.tsx     # Main app with routing
│   └── src/pages/      # All pages
└── shared/             # Shared code
    ├── components/     # Shared UI components
    ├── utils/          # Helper functions
    └── types/          # TypeScript types
```

## 🎨 What's Included

- ✅ Navigation (React Navigation for mobile, React Router for web)
- ✅ TypeScript configured
- ✅ Example screens/pages
- ✅ Shared Button component (works on both platforms!)
- ✅ Hot reload enabled

## 📝 Next Steps

1. **Customize the UI** - Edit screens in `mobile/src/screens/` and pages in `web/src/pages/`
2. **Add shared components** - Create in `shared/src/components/`
3. **Add new screens** - Follow the pattern in existing screens
4. **Style your app** - Use StyleSheet for mobile, CSS for web

## 🔧 Useful Commands

```cmd
# Mobile
cd mobile
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS

# Web
cd web
npm run dev        # Start dev server
npm run build      # Build for production

# Shared
cd shared
npm run type-check # Check TypeScript types
```

## 💡 Tips

- **VS Code is perfect for this!** You can run and debug both mobile and web apps
- **Use Expo Go on your phone** - No need for emulators during development
- **Shared components** - Import from `@shared/...` in both mobile and web
- **Hot reload** - Changes appear instantly in both apps!

## 🆘 Troubleshooting

**Can't connect to Expo?**

- Make sure your phone and computer are on the same WiFi network
- Try running with `npm start --tunnel`

**Web app won't start?**

- Check if port 5173 is available
- Try `npm run dev -- --port 3000` to use a different port

**Type errors in shared components?**

- Run `npm install` in the shared folder
- Restart VS Code

## 🎉 Ready to Build!

Start coding and watch your changes appear on mobile and web instantly!

**Happy Coding!** 🚀
