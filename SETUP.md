# PersonalPro - Setup Guide

PersonalPro is a complete React + Vite SaaS platform for personal trainers with Firebase integration.

The app is published as static files on GitHub Pages. Vite is used only to
build those static files; GitHub Pages remains the public hosting target.

## Prerequisites

- Node.js 16+ installed
- A Firebase project (free tier is sufficient)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Go to your Firebase Console (console.firebase.google.com)
   - Create a new project or select an existing one
   - Go to Project Settings > General
   - Copy your Firebase configuration

3. Update `src/firebase.js`:
   - Open the file and replace the placeholder values:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. Enable Firebase Services:
   - In Firebase Console, go to Authentication
   - Enable "Email/Password" sign-in method
   - In Firestore Database, create a database
   - Publish the security rules from `firestore.rules` before using real data
   - In Authentication > Settings > Authorized domains, keep only the expected domains
   - In App Check, enable protection for the web app before production use

## Firestore Security Rules

Use the versioned rules in `firestore.rules`. They scope every document under
`users/{userId}` to the authenticated owner, including students, workouts,
measurements, photos, records, payments, settings, and schedule overrides.

Do not leave Firestore in test mode for production.

If using Firebase CLI, deploy only the rules with:
```bash
firebase deploy --only firestore:rules
```

## Firebase App Check And API Key Controls

The Firebase web config in `src/firebase.js` is public by design. It is not a
password, but the production project should still be protected:

- Enable Firebase App Check for the web app.
- Restrict Firebase Auth authorized domains to the GitHub Pages domain and any
  local domains used for development.
- Restrict the Google Cloud API key where possible.
- Monitor Auth and Firestore usage for unexpected spikes.

## Development

Run the dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The optimized app will be in the `dist/` folder.

## Features

### 1. Authentication
- Email/Password registration and login
- Secure Firebase Authentication
- Auto logout with confirmation

### 2. Student Management
- Create, edit, and delete students
- Set price per class
- Define weekly schedule (Mon-Fri, 06:00-20:00)

### 3. Calendar/Agenda
- Monthly calendar view
- Quick view of scheduled classes
- Last 7 days preview

### 4. Attendance Tracking
- Mark attendance for each class (Present/Absent)
- Date selector
- Quick toggle buttons

### 5. Payment Control
- Monthly payment tracking per student
- PIX payment status tracking
- Payment date recording

### 6. Financial Reports
- Gross revenue calculation
- Gym fee calculation (R$21 per class, up to R$5,500 limit)
- Net income calculation
- Attendance rate tracking
- Per-student breakdown

## Data Structure

All data is stored in Firestore under:
- `users/{userId}/students` - Student information
- `users/{userId}/records` - Attendance records
- `users/{userId}/payments` - Payment tracking

## Business Rules

- Gym fee: R$21 per class (for classes where student was present)
- Gym fee limit: Stops being charged after monthly revenue exceeds R$5,500
- Working hours: Monday to Friday, 06:00 to 20:00
- Price per class: Customizable per student

## Design

- Mobile-first responsive design
- Purple theme (#7c3aed)
- Inline styles (no CSS frameworks)
- PWA capable
- Clean, modern UI

## Offline Behavior

The app shows a message if the network connection is lost. Firebase handles offline data caching automatically.

## Support

For issues or questions:
1. Check Firebase Console for errors
2. Review browser console for JavaScript errors
3. Verify Firestore security rules are correctly configured
4. Ensure Firebase config is properly set in `src/firebase.js`
