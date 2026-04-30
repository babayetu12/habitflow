# HabitFlow

A minimalist habit tracker built with Next.js, Tailwind CSS, and Supabase.

## Features

- Track daily habits with streaks
- View habit statistics and insights
- Heatmap visualization
- Automaticity tracking (Lally model)
- Smart recommendations for habit improvement
- Cross-device synchronization with Supabase
- Responsive design

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/habitflow.git
cd habitflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key
   - Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Run the SQL in `supabase-setup.sql` to create tables

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Schema

### habits table
```sql
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  completed_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### reflections table
```sql
CREATE TABLE reflections (
  id TEXT PRIMARY KEY,
  habit_id TEXT REFERENCES habits(id),
  date DATE NOT NULL,
  note TEXT NOT NULL,
  tweak TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Deployment

### GitHub Pages

1. Push to GitHub
2. Enable Pages in repository settings
3. Set source to "GitHub Actions"
4. The workflow will automatically build and deploy

### Manual Build

```bash
npm run build
npm run export
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details