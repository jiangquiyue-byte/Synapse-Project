# Synapse Project - Complete Rewrite Task

## Project Overview
Synapse is a multi-agent group chat collaboration platform built with React Native (Expo) + FastAPI.
- **Backend**: FastAPI + SQLite + LangGraph orchestrator (~4000 lines)
- **Mobile**: Expo React Native with expo-router (~6000 lines)

## Critical Bugs to Fix

### 1. App.tsx is Default Expo Placeholder
- `mobile/App.tsx` contains default "Open up App.tsx" text, not connected to actual app
- Need to either remove it or make it the proper entry point

### 2. authToken Not in Interface
- `useAppStore` references `authToken` and `clearAuthToken` but they're NOT defined in the `AppState` interface
- This causes TypeScript errors and runtime issues
- Need to add: `authToken: string; setAuthToken: (token: string) => void; clearAuthToken: () => void;`

### 3. SSE Client Uses require() Inside Function Body
- `mobile/services/sseClient.ts` line ~140: `require('../stores/useAppStore').useAppStore.getState().authToken`
- This is bad practice and can cause bundling issues
- Should import at top level

### 4. Backend URL Hardcoded
- `mobile/services/api.ts` has `DEFAULT_BACKEND_URL = 'https://synapse-project-seven.vercel.app'`
- This is a deployed instance, not configurable
- Should use environment variable or settings

### 5. No Proper Error Handling in Many Places
- Many catch blocks are empty: `catch (e) {}`
- Silent failures everywhere

### 6. Missing TypeScript Types
- Many `any` types throughout the codebase
- No proper type safety

## Design Requirements: Google Material Design 3

### Color System (Material You)
- Primary: #1A73E8 (Google Blue)
- On Primary: #FFFFFF
- Surface: #FAFAFA
- On Surface: #1F1F1F
- Surface Container: #FFFFFF
- Outline: #747775
- Error: #B3261E
- Tertiary: #7D5260

### Typography
- Use Google Sans / Inter font family
- Material Design 3 type scale (Display, Headline, Title, Body, Label)

### Components to Redesign
- Cards with rounded corners (16px)
- Bottom navigation with Material 3 pill indicator
- FAB (Floating Action Button) for primary actions
- Material 3 dialogs and bottom sheets
- Chips for tags and filters
- Search bar with Material 3 design
- Snackbar for notifications

## SVG Animations Required

### 1. SynapseLogo Animation
- Hexagonal logo with pulsing neural connections
- Animated SVG paths with stroke-dasharray/dashoffset

### 2. AgentAvatar Animations
- Each agent type gets unique SVG animation
- GPT: Rotating neural network pattern
- Claude: Breathing concentric circles
- DeepSeek: Flowing data stream
- Custom: Configurable pattern

### 3. MessageAnimations
- Typing indicator: Three bouncing dots
- Message appear: Slide up + fade in
- Streaming text: Character-by-character reveal

### 4. TabTransitions
- Smooth SVG morphing between tab icons
- Active state: Filled with subtle pulse

### 5. Loading States
- Skeleton screens with shimmer effect
- Progress indicators with Material 3 design

## Architecture Improvements

### Mobile Architecture
```
mobile/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout with providers
│   ├── (auth)/            # Auth group
│   │   └── login.tsx      # Login screen
│   └── (tabs)/            # Tab group
│       ├── _layout.tsx    # Tab layout with Material 3 nav
│       ├── index.tsx      # Chat screen (main)
│       ├── agents.tsx     # Agent management
│       ├── memory.tsx     # Memory/RAG screen
│       ├── workflows.tsx  # Workflow templates
│       └── settings.tsx   # Settings & dashboard
├── components/            # Reusable components
│   ├── ui/               # Material 3 UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── FAB.tsx
│   │   ├── SearchBar.tsx
│   │   └── ...
│   ├── chat/             # Chat-specific components
│   │   ├── MessageBubble.tsx
│   │   ├── AgentSelector.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── ...
│   ├── agents/           # Agent-specific components
│   └── animations/       # SVG animation components
├── services/             # API & SSE client
├── stores/               # Zustand stores
├── hooks/                # Custom hooks
├── theme/                # Material 3 theme
│   ├── colors.ts
│   ├── typography.ts
│   └── tokens.ts
└── utils/                # Utility functions
```

### Open Source Libraries to Integrate
1. **react-native-reanimated** - Smooth animations
2. **react-native-gesture-handler** - Better gesture handling
3. **@gorhom/bottom-sheet** - Material 3 bottom sheets
4. **react-native-paper** or custom Material 3 components
5. **expo-haptics** - Haptic feedback
6. **expo-blur** - Blur effects
7. **react-native-skia** - Advanced SVG/Canvas rendering (if needed)

## APK Build Process

### Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Configure eas.json for Android build
3. Run `eas build --platform android --profile preview`

### eas.json Configuration
```json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Execution Order

1. **Phase 1: Bug Fixes** (Critical)
   - Fix authToken interface
   - Fix App.tsx entry point
   - Fix SSE client imports
   - Add proper error handling
   - Fix TypeScript types

2. **Phase 2: Architecture Setup**
   - Create theme system (colors, typography, tokens)
   - Create Material 3 UI component library
   - Set up proper project structure

3. **Phase 3: SVG Animations**
   - Create animated logo component
   - Create animated agent avatars
   - Create message animations
   - Create tab transition animations

4. **Phase 4: Screen Redesign**
   - Login screen with Material 3 design
   - Chat screen with new message bubbles
   - Agent management screen
   - Memory/RAG screen
   - Workflows screen
   - Settings & dashboard

5. **Phase 5: Integration & Testing**
   - Test all API endpoints
   - Test SSE streaming
   - Test agent creation/management
   - Test chat functionality
   - Test memory/RAG features
   - Test export features

6. **Phase 6: APK Build**
   - Configure EAS build
   - Build APK
   - Verify APK on device/emulator

## Notes
- Keep backend unchanged (it's working)
- Focus on mobile app redesign
- Maintain all existing functionality
- Add proper loading states and error handling
- Use consistent Material 3 design language throughout
