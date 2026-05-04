# Supabase Migration Plan

This app still uses Firebase in production. The goal of this plan is to keep future Supabase migration predictable by moving Firebase calls behind service functions before changing providers.

## Current First Step

`src/services/appDataService.js` owns the main app data load:

- theme settings
- students
- attendance/session records
- payments
- schedule overrides

React screens should increasingly call service functions instead of importing Firebase helpers directly.

`src/services/settingsService.js` owns theme settings persistence.

`src/services/recordsService.js` owns attendance/session record persistence and the local-state mappers used after those writes.

## Future Service Boundaries

- `authService`: login, register, logout, password reset, auth state.
- `studentsService`: student CRUD, profile, anamnesis, measurements, photos, workout plans.
- `scheduleService`: base schedules, date overrides, class rescheduling.
- `recordsService`: attendance, class notes, exercise notes.
- `paymentsService`: monthly payments, package payments, payment deletion.
- `settingsService`: theme and account-level preferences.

## Proposed Supabase Tables

- `profiles`: owner-level account metadata.
- `students`: one row per student, scoped by `user_id`.
- `student_schedules`: recurring weekly class times.
- `schedule_overrides`: date-specific extra, canceled, or rescheduled classes.
- `attendance_records`: presence, absence, class notes, custom price.
- `payments`: monthly, package, and class-based payment entries.
- `anamnesis`: student intake/profile health notes.
- `measurements`: body measurements by date.
- `progress_photos`: external or stored photo references by date.
- `workout_plans`: plan metadata.
- `workout_exercises`: exercises belonging to a workout plan.

## Migration Order

1. Finish Firebase service extraction without behavior changes.
2. Add tests around billing, reports, alerts, and schedule calculations.
3. Export Firestore data to JSON.
4. Create Supabase schema and row-level security policies.
5. Write import scripts from Firestore JSON to Supabase tables.
6. Implement Supabase service versions behind the same service contracts.
7. Switch one non-critical module in staging, then broaden module by module.

## Rule

Do not change Firestore document shapes while extracting services. The extraction phase is only about reducing provider coupling.
