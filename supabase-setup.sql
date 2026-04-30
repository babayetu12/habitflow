-- Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Create habits table
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completed_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reflections table
CREATE TABLE reflections (
  id TEXT PRIMARY KEY,
  habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT NOT NULL,
  tweak TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reflections
CREATE POLICY "Users can view reflections for their habits" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = reflections.habit_id
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reflections for their habits" ON reflections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = reflections.habit_id
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reflections for their habits" ON reflections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = reflections.habit_id
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reflections for their habits" ON reflections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = reflections.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_created_at ON habits(created_at DESC);
CREATE INDEX idx_reflections_habit_id ON reflections(habit_id);
CREATE INDEX idx_reflections_created_at ON reflections(created_at DESC);