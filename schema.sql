-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create challenges table
CREATE TABLE challenges (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sector TEXT NOT NULL,
  significance INTEGER CHECK (significance BETWEEN 1 AND 3),
  complexity INTEGER CHECK (complexity BETWEEN 1 AND 3),
  readiness INTEGER CHECK (readiness BETWEEN 1 AND 3),
  date_added DATE,
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create challenge capabilities junction table
CREATE TABLE challenge_capabilities (
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  capability_id TEXT,
  PRIMARY KEY (challenge_id, capability_id)
);

-- Create user ratings table
CREATE TABLE user_ratings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  significance_rating INTEGER CHECK (significance_rating BETWEEN 1 AND 3),
  complexity_rating INTEGER CHECK (complexity_rating BETWEEN 1 AND 3),
  readiness_rating INTEGER CHECK (readiness_rating BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Create aggregated ratings view
CREATE OR REPLACE VIEW challenge_ratings_aggregate AS
SELECT 
  c.id,
  c.number,
  c.title,
  c.description,
  c.sector,
  c.significance as original_significance,
  c.complexity as original_complexity,
  c.readiness as original_readiness,
  c.date_added,
  c.last_updated,
  COUNT(DISTINCT ur.user_id) as total_ratings,
  ROUND(COALESCE(AVG(ur.significance_rating), c.significance)::numeric, 2) as avg_significance,
  ROUND(COALESCE(AVG(ur.complexity_rating), c.complexity)::numeric, 2) as avg_complexity,
  ROUND(COALESCE(AVG(ur.readiness_rating), c.readiness)::numeric, 2) as avg_readiness
FROM challenges c
LEFT JOIN user_ratings ur ON c.id = ur.challenge_id
GROUP BY c.id, c.number, c.title, c.description, c.sector, 
         c.significance, c.complexity, c.readiness, c.date_added, c.last_updated;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Challenges policies (read-only for everyone)
CREATE POLICY "Challenges are viewable by everyone" 
  ON challenges FOR SELECT 
  USING (true);

-- Challenge capabilities policies
CREATE POLICY "Challenge capabilities are viewable by everyone" 
  ON challenge_capabilities FOR SELECT 
  USING (true);

-- User ratings policies
CREATE POLICY "Ratings are viewable by everyone" 
  ON user_ratings FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own ratings" 
  ON user_ratings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" 
  ON user_ratings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings" 
  ON user_ratings FOR DELETE 
  USING (auth.uid() = user_id);