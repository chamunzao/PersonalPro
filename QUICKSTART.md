# PersonalPro Quick Start Guide

## 5-Minute Setup

### Step 1: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Click "Add app" and select web
4. Copy the config object that looks like:
```javascript
{
  apiKey: "AIz...",
  authDomain: "project.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### Step 2: Update Firebase Config
Edit `src/firebase.js` and replace the placeholder values:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_VALUE_HERE",
  authDomain: "YOUR_VALUE_HERE",
  projectId: "YOUR_VALUE_HERE",
  storageBucket: "YOUR_VALUE_HERE",
  messagingSenderId: "YOUR_VALUE_HERE",
  appId: "YOUR_VALUE_HERE"
};
```

### Step 3: Enable Firebase Services
In Firebase Console:

**Authentication:**
1. Go to Authentication → Sign-in method
2. Enable "Email/Password"
3. Click Save

**Firestore Database:**
1. Go to Firestore Database
2. Click "Create database"
3. Select "Start in test mode" (for development)
4. Choose your region
5. Click Enable

### Step 4: Install & Run
```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## First Run

### Create Account
1. Click "Registrar" tab
2. Enter email and password (6+ chars)
3. Click "Registrar"

### Add Students
1. Go to "Alunos" tab
2. Click "+ Novo"
3. Fill in:
   - **Nome**: Student name
   - **Preço/Aula**: Price per class (e.g., 70)
   - **Horários**: Click the times to select (e.g., "Segunda 06:00")
4. Click "Salvar"

### Track Attendance
1. Go to "Registro" tab
2. Select date
3. Click "Presente" or "Ausente" for each class
4. Changes save automatically

### View Financial Report
1. Go to "Relatório" tab
2. Select month and year
3. See:
   - **Receita Bruta**: Total revenue
   - **Taxa Academia**: Gym fee (R$21 per class attended)
   - **Renda Líquida**: Your net income
   - **Per-student breakdown**

### Track Payments
1. Go to "Pagamentos" tab
2. Select month and year
3. Click "Pendente" to mark as "Pago"
4. Shows payment date when marked as paid

## Common Tasks

### Change Student Price
1. Go to "Alunos" tab
2. Click edit icon (pencil) on student
3. Update price
4. Click "Salvar"

### Delete Student
1. Go to "Alunos" tab
2. Click delete icon (trash) on student
3. Confirm deletion
4. All associated data is preserved in history

### View Monthly Calendar
1. Go to "Agenda" tab
2. Use "Anterior" and "Próximo" to navigate months
3. Click "Hoje" to return to current month
4. Days with classes show class count

### Correct Attendance Mistake
1. Go to "Registro" tab
2. Select the correct date
3. Click the button again to toggle status
4. Or remove the attendance marker entirely

## Business Rules

### Gym Fee
- **R$21 per class** for each student who attended
- Stops when monthly revenue exceeds **R$5,500**
- Automatically calculated in reports

### Working Hours
- **Monday to Friday only**
- **06:00 to 20:00**
- Weekends are not available

### Attendance
- Mark as **Presente** or **Ausente**
- Only counts attended classes for revenue
- Absence doesn't affect payment but affects statistics

## Financial Example

**Scenario:**
- 2 students at R$70/class
- Student A: 10 classes attended, 1 absent
- Student B: 15 classes attended, 0 absent
- Total attended: 25 classes
- Gross revenue: 25 × R$70 = R$1,750

**Calculation:**
- Gym fee: 25 × R$21 = R$525
- Net income: R$1,750 - R$525 = R$1,225
- Attendance rate: 25/26 = 96.2%

## Troubleshooting

### "Firebase config not set"
- Check that you updated `src/firebase.js` with real credentials
- Verify no typos in config values

### "Email already in use"
- The account already exists
- Try logging in instead
- Use "Registrar" → password reset if forgotten

### "Permission denied" errors
- Check Firestore is created
- Verify security rules are set (see SETUP.md)
- Check that user is authenticated

### Data not saving
- Check internet connection
- Verify Firestore database exists
- Check Firebase Console for errors
- Try reloading the page

## Tips

- Use the same email/password for testing
- Monthly reports update automatically as you add attendance
- Payment tracking is separate from attendance
- Browser back/forward works across tabs
- Data persists even after closing the browser
- All data is private to your account

## Next Steps

1. **Customize**: Edit colors in `src/App.jsx` (search for `#7c3aed`)
2. **Deploy**: See deployment options in SETUP.md
3. **Backup**: Firebase automatically backs up your data
4. **Scale**: Add more students/classes as needed

## Support

### Check These First
1. Firebase Console → Project Settings
2. Browser Console (F12 → Console tab)
3. Network tab (check for failed requests)
4. Firebase → Firestore → Data (verify structure)

### Common Fix
If data won't save:
1. Check internet connection
2. Go to Firebase Console
3. Verify email is created under Authentication
4. Verify Firestore database exists
5. Try a different student name/date

---

**Happy tracking!** PersonalPro is now ready for your personal training business.
