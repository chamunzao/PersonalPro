# PersonalPro Architecture

## Overview

PersonalPro is a React + Vite SaaS platform for personal trainers built with Firebase backend. It follows a component-based architecture with context-based authentication and Firestore for data persistence.

## Project Structure

```
rosana-app/
├── src/
│   ├── firebase.js           # Firebase initialization and exports
│   ├── AuthContext.jsx       # Authentication context and provider
│   ├── LoginPage.jsx         # Login/Registration UI
│   ├── App.jsx              # Main app with all tabs and features
│   ├── main.jsx             # Entry point
│   └── useLocalStorage.js   # Legacy hook (can be deleted)
├── index.html               # HTML entry point
├── vite.config.js          # Vite configuration with PWA
├── package.json            # Dependencies
├── SETUP.md                # Setup and deployment guide
└── ARCHITECTURE.md         # This file
```

## Technology Stack

- **Frontend**: React 18, Vite
- **Backend**: Firebase (Authentication + Firestore)
- **Styling**: Inline styles (no CSS framework)
- **PWA**: Vite PWA plugin for offline capability
- **Package Manager**: npm

## Authentication Flow

### AuthContext.jsx
Provides authentication state management:
- `user` - Current authenticated user
- `loading` - Loading state during auth check
- `error` - Auth error messages
- `register()` - Create new account
- `login()` - Sign in user
- `logout()` - Sign out user
- `setError()` - Update error state

### LoginPage.jsx
Dual-tab interface for login and registration:
- Email/password input fields
- Form validation
- Error display
- Loading states
- Purple gradient theme

### App.jsx
Main app component that:
1. Checks if user is authenticated (shows LoginPage if not)
2. Loads user data from Firestore
3. Renders tabbed interface with 5 tabs

## Data Structure (Firestore)

### Collections

```
users/{userId}/
├── students/
│   └── {studentId}
│       ├── name: string
│       ├── pricePerClass: number
│       └── schedule: [
│           { day: number (0-4), time: string (HH:00) }
│       ]
├── records/
│   └── {YYYY-MM-DD_studentId_HH:00}
│       └── status: "present" | "absent"
└── payments/
    └── {YYYY-MM_studentId}
        ├── paid: boolean
        ├── date: string (DD/MM/YYYY)
        └── month: string (YYYY-MM)
```

### Security Rules

All data is scoped to the authenticated user:
- Users can only read/write their own `/users/{userId}/*` documents
- Subcollections inherit parent permissions

## Components

### StudentsTab
Features:
- List all students
- Create new student with name, price per class, schedule
- Edit student details
- Delete student with confirmation
- Schedule selector (5 days x 15 hours)
- Firebase integration with addDoc/updateDoc/deleteDoc

### AgendaTab
Features:
- Monthly calendar view
- Color-coded day indicating working days
- Show class count per day
- Last 7 days preview
- Navigation between months

### AttendanceTab
Features:
- Date picker for selecting specific day
- List classes for selected date
- Toggle attendance: Present/Absent/None
- Disable weekend/holiday selection
- Real-time Firebase updates

### PaymentsTab
Features:
- Month and year selector
- Student list with payment status
- Toggle paid/pending status
- Display payment date
- Firebase persistence

### ReportsTab
Features:
- Financial summary cards:
  - Gross Revenue
  - Gym Fee (R$21 per class)
  - Net Income (Revenue - Fee)
  - Attendance Rate (%)
- Per-student breakdown with:
  - Classes present/absent
  - Revenue calculation
  - Gym fee allocation
  - Net income
- Month/year selector

## Business Logic

### Attendance Recording
- Key format: `YYYY-MM-DD_studentId_HH:00`
- Only works for weekdays (Mon-Fri)
- Only for scheduled hours (06:00-20:00)
- Three states: Present, Absent, None

### Gym Fee Calculation
- Base: R$21 per class where student was present
- Monthly revenue limit: R$5,500
- Once gross revenue exceeds limit, gym fee stops
- Proportional allocation across students

```
gymFee = min(classesPresent * 21, remainingFeeLimit)
```

### Financial Reports
- Gross Revenue: Sum of all student payments
- Gym Fee: Allocated based on presence
- Net Income: Gross Revenue - Gym Fee
- Attendance Rate: (Classes Present / Total Classes) * 100

## State Management

### App.jsx State
```javascript
const [activeTab, setActiveTab] = useState("students")
const [students, setStudents] = useState([])
const [records, setRecords] = useState([])
const [payments, setPayments] = useState([])
const [loadingData, setLoadingData] = useState(false)
```

### Component-level State
Each tab manages its own UI state:
- Form inputs, date selection, sorting/filtering
- Loading states during API calls

## Firebase Patterns

### Reading Data
```javascript
const snapshot = await getDocs(collection(db, `users/${user.uid}/students`));
const data = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### Creating Data
```javascript
const docRef = await addDoc(collection(db, `users/${user.uid}/students`), data);
// Returns document ID
```

### Updating Data
```javascript
await updateDoc(doc(db, `users/${user.uid}/students/${studentId}`), updates);
```

### Deleting Data
```javascript
await deleteDoc(doc(db, `users/${user.uid}/students/${studentId}`));
```

## Styling Approach

All styling uses inline CSS objects:
- No external CSS frameworks
- Mobile-first design
- Purple theme (#7c3aed)
- Responsive grid layouts
- Hover/focus states with inline handlers

Colors:
- Primary: #7c3aed (purple)
- Dark variant: #6d28d9
- Background: #f9fafb (light gray)
- Borders: #e5e7eb
- Text: #1f2937 (dark gray)
- Muted: #9ca3af (gray)

## Error Handling

### Authentication
- Invalid email format
- Weak password
- Email already in use
- User not found
- Wrong password

### Firestore Operations
- Try-catch blocks on all DB operations
- User-friendly error messages in Portuguese
- Console logging for debugging
- Alert dialogs for critical errors

## Performance Optimizations

1. **Data Loading**
   - Load all data once on component mount
   - Update local state on mutations
   - No real-time listeners (optional feature)

2. **Rendering**
   - Use keys for list items
   - Avoid re-renders with proper state management
   - Memoization (useMemo, useCallback) available if needed

3. **Bundle Size**
   - Inline SVG icons (no icon library)
   - Minimal dependencies (only React, React-DOM, Firebase)
   - Vite for optimized builds

## PWA Features

- Web app manifest
- Service worker for offline support
- Installable on mobile devices
- App icon (192x512px)
- Splash screen configuration
- Status bar styling

## Development Features

### Firebase Emulator Support
Commented code in `firebase.js` for local development:
```javascript
// Uncomment to use with Firebase Emulator Suite
connectAuthEmulator(auth, 'http://localhost:9099');
connectFirestoreEmulator(db, 'localhost', 8080);
```

### Local Development
```bash
npm run dev  # Start dev server
npm run build # Build for production
npm run preview # Preview production build
```

## Deployment Considerations

1. **Environment Variables**
   - Firebase config should be in `.env.local`
   - Never commit `.env.local` to git

2. **Firebase Setup**
   - Enable Email/Password authentication
   - Create Firestore database
   - Set security rules before deploying
   - Configure CORS if needed

3. **Hosting Options**
   - Firebase Hosting
   - Vercel
   - Netlify
   - Any static host (dist folder)

## Future Enhancements

Possible features to add:
- Real-time data synchronization with listeners
- Client-side offline data persistence
- Image avatars for students
- Class notes/observations
- Student communication via email
- Bulk import/export
- Custom business hours per student
- Recurring schedule templates
- Payment integration (Stripe, PIX)
- Analytics and statistics
- Dark mode
- Multi-language support

## Testing Strategy

Recommended tests:
- Unit tests for utility functions (formatCurrency, etc.)
- Integration tests for Firebase operations
- E2E tests for user flows (login, create student, track attendance)
- Visual regression tests for responsive design

## Security

- All data is scoped to authenticated users
- Firebase security rules enforce user isolation
- Sensitive data (auth tokens) handled by Firebase SDK
- No sensitive data in component state visible to users
- HTTPS enforced by Firebase

## Debugging

1. **Check Firebase Console**
   - Verify users are being created
   - Check Firestore data structure
   - Review authentication logs

2. **Browser Console**
   - Check for JavaScript errors
   - Review console.error logs
   - Verify network requests in Network tab

3. **Local Development**
   - Use React DevTools
   - Check Firebase emulator logs
   - Enable verbose logging if needed
