# Period Tracker App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Expo period tracker app with record management, calendar viewing, prediction, and settings data clearing.

**Architecture:** Use Expo Router for three tab pages. Keep SQLite persistence in a small service layer, date/prediction/calendar behavior in pure TypeScript utilities, and screens focused on rendering and user actions.

**Tech Stack:** React Native, Expo, TypeScript, Expo Router, expo-sqlite, Jest.

---

## File Structure

- Create `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `jest.config.js`, `expo-env.d.ts` for project configuration.
- Create `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/calendar.tsx`, `app/(tabs)/settings.tsx` for routing and screens.
- Create `src/types/period.ts` for period record types.
- Create `src/utils/date.ts` for date parsing, formatting, range, and month helpers.
- Create `src/utils/prediction.ts` for next-period calculation.
- Create `src/utils/calendar.ts` for mapping records onto calendar days.
- Create `src/db/periodRecords.ts` for SQLite table setup and CRUD.
- Create `src/components/PeriodRecordForm.tsx` for shared create/edit form.
- Create `src/utils/*.test.ts` for pure logic tests.

## Tasks

### Task 1: Scaffold Expo project

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `babel.config.js`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `expo-env.d.ts`

- [ ] Create the Expo, TypeScript, Router, SQLite, and Jest configuration files.
- [ ] Run `npm install`.
- [ ] Run `npm test -- --runInBand`; expected initial result: no tests found or pass after tests are added.

### Task 2: Add pure date utilities with tests

**Files:**
- Create: `src/utils/date.ts`
- Create: `src/utils/date.test.ts`

- [ ] Write failing tests for `toDateKey`, `addDays`, `daysBetween`, `isDateInRange`, `getMonthMatrix`, and `formatDisplayDate`.
- [ ] Run `npm test -- src/utils/date.test.ts --runInBand` and confirm failures are from missing implementation.
- [ ] Implement the minimal date utilities using local noon dates to avoid timezone boundary issues.
- [ ] Re-run the date test command and confirm it passes.

### Task 3: Add prediction logic with tests

**Files:**
- Create: `src/types/period.ts`
- Create: `src/utils/prediction.ts`
- Create: `src/utils/prediction.test.ts`

- [ ] Write failing tests for no-record, single-record default 28-day prediction, and multi-record average interval prediction.
- [ ] Run `npm test -- src/utils/prediction.test.ts --runInBand` and confirm expected failures.
- [ ] Implement `getLatestRecord` and `predictNextPeriod`.
- [ ] Re-run the prediction test command and confirm it passes.

### Task 4: Add calendar mapping logic with tests

**Files:**
- Create: `src/utils/calendar.ts`
- Create: `src/utils/calendar.test.ts`

- [ ] Write failing tests for marking dates inside a period, outside a period, and resolving the record for a selected date.
- [ ] Run `npm test -- src/utils/calendar.test.ts --runInBand` and confirm expected failures.
- [ ] Implement `getRecordForDate` and `isPeriodDate`.
- [ ] Re-run the calendar test command and confirm it passes.

### Task 5: Add SQLite persistence

**Files:**
- Create: `src/db/periodRecords.ts`

- [ ] Implement `initPeriodDatabase`, `listPeriodRecords`, `createPeriodRecord`, `updatePeriodRecord`, `deletePeriodRecord`, and `clearPeriodRecords`.
- [ ] Store dates as `YYYY-MM-DD` strings.
- [ ] Validate that `startDate <= endDate` before inserts and updates.

### Task 6: Add routing shell and shared form

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `src/components/PeriodRecordForm.tsx`

- [ ] Implement the root stack layout.
- [ ] Implement three tabs: Home, Calendar, Settings.
- [ ] Implement a shared form with start date, end date, save, and cancel actions.

### Task 7: Add home screen

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] Initialize the database on focus.
- [ ] Load records sorted by newest start date.
- [ ] Show today's status, latest record, predicted next start date, days remaining, and add-record form entry.
- [ ] Refresh after saving a new record.

### Task 8: Add calendar screen

**Files:**
- Create: `app/(tabs)/calendar.tsx`

- [ ] Show current month grid with previous/next month controls.
- [ ] Mark days that belong to recorded periods.
- [ ] Show selected date details.
- [ ] Allow editing and deleting the selected date's matching record.

### Task 9: Add settings screen

**Files:**
- Create: `app/(tabs)/settings.tsx`

- [ ] Show local-only data explanation.
- [ ] Add clear-all action with confirmation alert.
- [ ] Refresh state after clearing records.

### Task 10: Final verification

**Files:**
- All created project files.

- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx expo start --localhost --port 8081` and confirm the server starts.
- [ ] Report exact verification results and the local URL.

## Self-Review

- Requirements coverage: record CRUD, calendar marking, home status, prediction, local data, and clear-all settings are all mapped to tasks.
- Placeholder scan: no unfinished requirement placeholders remain.
- Type consistency: period records consistently use `startDate` and `endDate` as `YYYY-MM-DD` strings.
