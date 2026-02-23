# FlyRely App - Complete MVP Implementation

This project contains the **complete FlyRely MVP** built with TanStack Start, covering all screens from your Figma design system.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 📁 Project Structure

```
flyrely-app/
├── app/
│   ├── routes/
│   │   ├── __root.tsx                    # Root layout with QueryClient
│   │   ├── index.tsx                     # Home screen (dashboard)
│   │   ├── auth/
│   │   │   ├── login.tsx                 # Sign In screen
│   │   │   ├── signup.tsx                # Sign Up screen
│   │   │   └── forgot-password.tsx       # Password reset
│   │   ├── flights/
│   │   │   ├── add.tsx                   # Add flight (by number/route)
│   │   │   ├── history.tsx               # Past/completed flights
│   │   │   └── $flightId/
│   │   │       ├── index.tsx             # Flight details
│   │   │       ├── alternatives.tsx      # Alternate flights
│   │   │       └── edit.tsx              # Edit flight
│   │   ├── trips/
│   │   │   └── index.tsx                 # Trips screen
│   │   ├── explore/
│   │   │   └── index.tsx                 # Explore screen
│   │   └── account/
│   │       ├── index.tsx                 # Account screen
│   │       ├── settings.tsx              # Notification settings
│   │       └── billing.tsx               # Plans & billing
│   ├── router.tsx
│   ├── client.tsx
│   └── ssr.tsx
├── src/
│   ├── components/
│   │   ├── ui/                           # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── InputError.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/                       # Layout components
│   │   │   ├── BottomNav.tsx
│   │   │   └── AppShell.tsx
│   │   └── flight/                       # Flight-specific components
│   │       ├── FlightCard.tsx
│   │       ├── AlertCard.tsx
│   │       ├── AlternateFlightCard.tsx
│   │       ├── RemoveFlightModal.tsx
│   │       ├── UnsupportedFlightCard.tsx
│   │       ├── NoPredictionBanner.tsx
│   │       └── CompletedFlightCard.tsx
│   ├── lib/
│   │   └── utils.ts                      # Utility functions
│   ├── styles/
│   │   └── globals.css                   # Tailwind + custom styles
│   └── types/
│       └── index.ts                      # TypeScript types
├── tailwind.config.ts                    # Design system colors
├── package.json
└── tsconfig.json
```

## ✅ All Screens Built

### Core Navigation (Bottom Nav)

| Screen | Route | Description |
|--------|-------|-------------|
| **Home** | `/` | Dashboard with upcoming flights, alerts, quick actions |
| **Trips** | `/trips` | Trip grouping with expandable flight lists |
| **Explore** | `/explore` | Route insights, airline rankings, trends |
| **Account** | `/account` | Profile, settings, billing access |

### Flight Management

| Screen | Route | Description |
|--------|-------|-------------|
| **Add Flight** | `/flights/add` | Search by number or route, confirm tracking |
| **Flight Details** | `/flights/:id` | Full flight info, risk status, schedule comparison |
| **Edit Flight** | `/flights/:id/edit` | Change date or switch to different flight |
| **Alternate Flights** | `/flights/:id/alternatives` | View lower-risk alternatives |
| **Flight History** | `/flights/history` | Past/completed flights with stats |

### Authentication

| Screen | Route | Description |
|--------|-------|-------------|
| **Sign In** | `/auth/login` | Email/password + social login |
| **Sign Up** | `/auth/signup` | Registration with password requirements |
| **Forgot Password** | `/auth/forgot-password` | Password reset flow |

### Settings & Account

| Screen | Route | Description |
|--------|-------|-------------|
| **Settings** | `/account/settings` | Notification preferences, channels, sensitivity |
| **Plans & Billing** | `/account/billing` | Free/Premium plans with upgrade flow |

## 🧩 Reusable Components

### UI Components
| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, outline, ghost, danger variants |
| `Input` | Form input with labels, icons, validation |
| `Header` | Screen header with back button, actions |
| `Modal` | Bottom sheet modal for confirmations |
| `ErrorState` | Network, server, search error states |
| `Toast` | Success/error/warning notifications |

### Layout Components
| Component | Purpose |
|-----------|---------|
| `BottomNav` | 4-tab navigation (Home, Trips, Explore, Account) |
| `AppShell` | Screen wrapper with bottom nav |

### Flight Components
| Component | Purpose |
|-----------|---------|
| `FlightCard` | Main flight display with risk indicator |
| `AlertCard` | Risk change notifications |
| `AlternateFlightCard` | Alternative flight option |
| `RemoveFlightModal` | Confirmation for removing flights |
| `UnsupportedFlightCard` | Airline/route not supported state |
| `NoPredictionBanner` | No prediction available state |
| `CompletedFlightCard` | Past flight display |

## 🎨 Design System

Colors match your Figma design:

- **Primary**: `#1C64F2` (Blue)
- **Accent**: `#F59E0B` (Orange/Amber)
- **Navy**: `#0F172A` - `#F8FAFC` (Scale)
- **Risk Low**: `#10B981` (Green)
- **Risk Medium**: `#F59E0B` (Amber)
- **Risk High**: `#EF4444` (Red)

## 📋 MVP Features Covered

### E1: Flight Search & Add
- ✅ Search by flight number
- ✅ Search by route
- ✅ Save flight to tracking
- ✅ Add from My Flights

### E2: My Flights Overview
- ✅ Upcoming flights list
- ✅ Upcoming vs past separation
- ✅ Trip metadata/grouping

### E3: Prediction & Risk Display
- ✅ Risk status badges (On track, At risk, High risk)
- ✅ Flight details view
- ✅ Schedule vs predicted comparison
- ✅ Airline status vs FlyRely prediction

### E4: Notifications & Alerts
- ✅ Notification preferences (push, email, SMS)
- ✅ Alert sensitivity settings
- ✅ Recent alerts display

### E5: Accounts & Identity
- ✅ Sign up with email/password
- ✅ Sign in with Apple/Google
- ✅ Password reset flow
- ✅ Profile management

### E6: Manage Flights & Trips
- ✅ Edit flight date
- ✅ Switch to different flight
- ✅ Remove flight with confirmation
- ✅ Trip grouping (create, expand, add flights)
- ✅ Unsupported/no-prediction states
- ✅ Flight lifecycle (auto-complete)
- ✅ Input validation

### E7: Time & Localization
- ✅ Airport local time display
- ✅ Scheduled vs expected times

### E8: Feedback & Support
- ✅ Feedback entry point
- ✅ Support contact links

### E9: Trust & Airline Comparison
- ✅ Airline status display
- ✅ Prediction vs airline discrepancy explanation

### E10: Alternate Flight Suggestions (New)
- ✅ Alternative flights when risk is high
- ✅ Compare alternatives by risk level
- ✅ Switch tracked flight

## 🔗 Integration Notes

To integrate with your backend:

1. Replace mock data in route files with TanStack Query hooks
2. Add authentication state (context or Zustand)
3. Connect to your API endpoints
4. Add push notification setup (Expo/FCM)
5. Configure deep linking

## 📱 Mobile-First Design

All screens are designed mobile-first with:
- Touch-friendly tap targets (min 44px)
- Bottom sheet modals on mobile
- Proper safe area handling
- Responsive layouts (max-width 430px for phone preview)
- iOS status bar integration
