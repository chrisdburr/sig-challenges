# Interactive Website Migration Plan

## Overview
This document outlines the plan to transition the AI-Enabled Digital Twin Assurance Challenges static website into an interactive application with user feedback capabilities.

## Architecture Changes
- **Current**: Static site with client-side data filtering
- **Target**: Full-stack application with:
  - Supabase PostgreSQL database
  - Authentication system
  - Real-time rating updates
  - Community feedback aggregation

## Phase 1: Database Setup & Authentication (Week 1-2)

### 1.1 Supabase Setup
- [x] Create Supabase project with Postgres hobby plan
- [x] Configure Row Level Security (RLS) policies
- [x] Set up connection pooling for concurrent users

### 1.2 Database Schema Design
```sql
-- Users table (managed by Supabase Auth)

-- User profiles extension
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Challenges table (migrate from data.json)
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

-- Challenge capabilities junction table
CREATE TABLE challenge_capabilities (
  challenge_id INTEGER REFERENCES challenges(id),
  capability_id TEXT,
  PRIMARY KEY (challenge_id, capability_id)
);

-- User ratings table
CREATE TABLE user_ratings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  challenge_id INTEGER REFERENCES challenges(id) NOT NULL,
  significance_rating INTEGER CHECK (significance_rating BETWEEN 1 AND 3),
  complexity_rating INTEGER CHECK (complexity_rating BETWEEN 1 AND 3),
  readiness_rating INTEGER CHECK (readiness_rating BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Aggregated ratings view
CREATE VIEW challenge_ratings_aggregate AS
SELECT
  c.id,
  c.number,
  c.significance as original_significance,
  c.complexity as original_complexity,
  c.readiness as original_readiness,
  COUNT(DISTINCT ur.user_id) as total_ratings,
  COALESCE(AVG(ur.significance_rating), c.significance) as avg_significance,
  COALESCE(AVG(ur.complexity_rating), c.complexity) as avg_complexity,
  COALESCE(AVG(ur.readiness_rating), c.readiness) as avg_readiness
FROM challenges c
LEFT JOIN user_ratings ur ON c.id = ur.challenge_id
GROUP BY c.id, c.number, c.significance, c.complexity, c.readiness;
```

### 1.3 Authentication Implementation
- [ ] Implement Supabase Auth with email/password
- [ ] Create signup/login UI components
- [ ] Add password reset functionality
- [ ] Implement session management
- [ ] Add logout functionality

### 1.4 Data Migration Script
- [ ] Create Node.js script to migrate data.json to Postgres
- [ ] Preserve all existing challenge data
- [ ] Populate challenge_capabilities junction table
- [ ] Verify data integrity after migration

## Phase 2: Backend API Development (Week 2-3)

### 2.1 Supabase Client Setup
- [ ] Initialize Supabase JavaScript client
- [ ] Configure environment variables
- [ ] Set up API key management

### 2.2 API Endpoints (using Supabase client)
```javascript
// Authentication
- supabase.auth.signUp()
- supabase.auth.signIn()
- supabase.auth.signOut()
- supabase.auth.onAuthStateChange()

// Challenges
- supabase.from('challenges').select()
- supabase.from('challenge_ratings_aggregate').select()

// User Ratings
- supabase.from('user_ratings').insert()
- supabase.from('user_ratings').update()
- supabase.from('user_ratings').select()

// Real-time subscriptions
- supabase.from('user_ratings').on('*', callback).subscribe()
```

### 2.3 Security Implementation
- [ ] Configure Row Level Security policies
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Set up CORS policies

## Phase 3: Frontend Interactivity (Week 3-4)

### 3.1 Authentication UI
- [ ] Create modal for login/signup
- [ ] Add user profile dropdown
- [ ] Show authentication state in header
- [ ] Implement protected routes

### 3.2 Interactive Rating System
```javascript
// New RatingWidget class
class RatingWidget {
  constructor(challengeId, ratingType, currentValue, userRating, avgRating) {
    this.challengeId = challengeId;
    this.ratingType = ratingType; // 'significance', 'complexity', 'readiness'
    this.currentValue = currentValue;
    this.userRating = userRating;
    this.avgRating = avgRating;
    this.isAuthenticated = false;
  }

  render() {
    // Interactive stars with:
    // - Hover effects
    // - Click to rate (if authenticated)
    // - Visual indicators for user rating vs. community average
    // - Tooltip showing rating count
  }

  async submitRating(value) {
    // Submit to Supabase
    // Update UI optimistically
    // Handle errors
  }
}
```

### 3.3 UI Enhancements
- [ ] Add hover effects to star ratings
- [ ] Show user's rating with distinct styling
- [ ] Display community average as overlay
- [ ] Add rating count indicator
- [ ] Implement loading states
- [ ] Add success/error notifications

### 3.4 Real-time Updates
- [ ] Subscribe to rating changes
- [ ] Update cards dynamically when ratings change
- [ ] Show "live" indicator when updates occur
- [ ] Implement optimistic UI updates

### 3.5 Code Refactoring
- [ ] Extend Card class to support interactive ratings
- [ ] Update CardReader to fetch from Supabase
- [ ] Maintain backward compatibility during transition
- [ ] Add error boundaries and fallbacks

## Phase 4: Deployment & Migration (Week 4-5)

### 4.1 Environment Setup
- [ ] Configure production environment variables
- [ ] Set up GitHub secrets for deployment
- [ ] Configure custom domain (if needed)

### 4.2 Progressive Migration
- [ ] Deploy with feature flags
- [ ] Enable authentication for beta users
- [ ] Gradually enable interactive features
- [ ] Monitor performance and errors

### 4.3 GitHub Pages Compatibility
Since GitHub Pages only serves static files, we'll need to:
- [ ] Keep all API calls client-side through Supabase JS SDK
- [ ] Use Supabase's built-in authentication UI or build custom
- [ ] Ensure no server-side code requirements
- [ ] Configure CORS for Supabase project

### 4.4 Testing & QA
- [ ] Test authentication flow
- [ ] Verify rating submissions
- [ ] Test real-time updates
- [ ] Check mobile responsiveness
- [ ] Performance testing
- [ ] Security audit

## Technical Considerations

### Performance
- Implement pagination for large datasets
- Use connection pooling
- Cache aggregated ratings
- Optimize real-time subscriptions

### Security
- All data access through RLS policies
- No exposed API keys (use anon key)
- Rate limiting on rating submissions
- Input sanitization

### User Experience
- Graceful degradation for non-authenticated users
- Clear visual feedback for all actions
- Preserve existing filtering functionality
- Mobile-first responsive design

## File Structure Changes
```
/sig-challenges/
├── index.html              # Updated with auth UI
├── css/
│   └── style.css          # Enhanced with interactive styles
├── js/
│   ├── main.js            # Updated with Supabase integration
│   ├── auth.js            # New: Authentication logic
│   ├── rating-widget.js   # New: Interactive rating component
│   └── supabase-client.js # New: Supabase configuration
├── .env.example           # New: Environment variables template
└── migration/
    └── migrate-data.js    # New: Data migration script
```

## Success Metrics
- User registration and active users
- Number of ratings submitted
- Rating participation rate
- Page load performance
- Error rates
- User feedback

## Rollback Plan
- Maintain original static functionality
- Feature flags for gradual rollout
- Database backups before migration
- Ability to revert to static data.json
