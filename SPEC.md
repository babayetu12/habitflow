# Habit Tracker App Specification

## 1. Project Overview

- **Project Name**: HabitFlow
- **Type**: Web Application (Next.js)
- **Core Functionality**: A minimalist habit tracker where users can add habits, mark them complete daily, and track streaks
- **Target Users**: Individuals looking to build and maintain daily habits

## 2. UI/UX Specification

### Layout Structure

- **Header**: App title with minimalist branding
- **Main Content**: 
  - Add habit input section
  - Today's habits list
  - Weekly streak overview
- **Responsive**: Mobile-first, single column layout

### Visual Design

- **Color Palette**:
  - Background: `#0D0D0D` (near black)
  - Surface: `#1A1A1A` (dark gray card)
  - Primary: `#E8F5E9` (soft mint green)
  - Accent: `#4ADE80` (vibrant green for completed)
  - Text Primary: `#FAFAFA` (off-white)
  - Text Muted: `#737373` (gray)
  - Danger: `#EF4444` (red for delete)

- **Typography**:
  - Font Family: "DM Sans" (headings), "JetBrains Mono" (numbers/streaks)
  - Heading: 28px bold
  - Body: 16px regular
  - Small: 14px

- **Spacing**: 
  - Base unit: 4px
  - Card padding: 16px
  - Gap between items: 12px

- **Visual Effects**:
  - Cards: subtle border `1px solid #262626`
  - Hover: slight scale(1.01) with transition
  - Completed habits: checkmark animation with spring effect
  - Streak numbers: monospace, bold, prominent

### Components

1. **AddHabitInput**
   - Text input with placeholder "Add a new habit..."
   - Submit on Enter key
   - Clear after submission

2. **HabitItem**
   - Habit name
   - Checkbox for completion (today)
   - Current streak count
   - Delete button (on hover)
   - States: default, completed, hover

3. **StreakBadge**
   - Shows current streak (fire icon + number)
   - Animated on increment

4. **EmptyState**
   - Encouraging message when no habits

## 3. Functionality Specification

### Core Features

1. **Add Habit**
   - User types habit name
   - Press Enter to add
   - Habit saved to local storage

2. **Toggle Completion**
   - Click checkbox to mark complete/incomplete
   - Automatically updates streak
   - Visual feedback on toggle

3. **Streak Tracking**
   - Streak increments when habit completed on consecutive days
   - Streak resets if a day is missed
   - Display current streak count

4. **Delete Habit**
   - Delete button removes habit permanently
   - Confirmation not required (simple)

5. **Data Persistence**
   - All data stored in localStorage
   - Loads on app start
   - Saves on every change

### User Interactions

- Enter key submits new habit
- Checkbox toggles today's completion
- Delete icon removes habit
- Data persists across page reloads

### Edge Cases

- Empty habit name: don't add
- Duplicate habits: allow (user's choice)
- Many habits: scrollable list
- Long habit name: truncate with ellipsis

## 4. Acceptance Criteria

- [ ] App loads without errors
- [ ] Can add a new habit
- [ ] Can mark habit as complete
- [ ] Streak displays correctly
- [ ] Can delete a habit
- [ ] Data persists after refresh
- [ ] Responsive on mobile
- [ ] Animations are smooth
- [ ] No console errors
- [ ] npm run dev works