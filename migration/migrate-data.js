#!/usr/bin/env node

/**
 * Data Migration Script
 * Migrates challenges from data.json to Supabase PostgreSQL
 * 
 * Usage: node migrate-data.js
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY (not anon key - get from Settings > API)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing required environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function loadJsonData() {
    try {
        const dataPath = path.join(__dirname, '..', 'data.json');
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);
        return data.challenges || data;
    } catch (error) {
        console.error('Error loading data.json:', error);
        process.exit(1);
    }
}

async function clearExistingData() {
    console.log('Clearing existing data...');
    
    // Delete in correct order due to foreign key constraints
    const { error: capError } = await supabase
        .from('challenge_capabilities')
        .delete()
        .not('challenge_id', 'is', null);
    
    if (capError) console.warn('Error clearing capabilities:', capError);
    
    const { error: ratingsError } = await supabase
        .from('user_ratings')
        .delete()
        .not('challenge_id', 'is', null);
    
    if (ratingsError) console.warn('Error clearing ratings:', ratingsError);
    
    const { error: challengesError } = await supabase
        .from('challenges')
        .delete()
        .not('id', 'is', null);
    
    if (challengesError) console.warn('Error clearing challenges:', challengesError);
    
    console.log('Existing data cleared');
}

async function migrateChallenges(challenges) {
    console.log(`Migrating ${challenges.length} challenges...`);
    
    for (const challenge of challenges) {
        try {
            // Prepare challenge data
            const challengeData = {
                number: challenge.number,
                title: challenge.title,
                description: challenge.description,
                sector: challenge.sector,
                significance: challenge.significance,
                complexity: challenge.complexity,
                readiness: challenge.readiness,
                date_added: challenge.date_added,
                last_updated: challenge.last_updated
            };
            
            // Insert challenge
            const { data: insertedChallenge, error: challengeError } = await supabase
                .from('challenges')
                .insert(challengeData)
                .select()
                .single();
            
            if (challengeError) {
                console.error(`Error inserting challenge ${challenge.number}:`, challengeError);
                continue;
            }
            
            console.log(`✓ Challenge ${challenge.number}: ${challenge.title}`);
            
            // Insert capabilities if present
            if (challenge.capabilities && challenge.capabilities.length > 0) {
                const capabilitiesData = challenge.capabilities.map(cap => ({
                    challenge_id: insertedChallenge.id,
                    capability_id: cap
                }));
                
                const { error: capError } = await supabase
                    .from('challenge_capabilities')
                    .insert(capabilitiesData);
                
                if (capError) {
                    console.error(`Error inserting capabilities for challenge ${challenge.number}:`, capError);
                } else {
                    console.log(`  → Added ${challenge.capabilities.length} capabilities`);
                }
            }
            
        } catch (error) {
            console.error(`Error processing challenge ${challenge.number}:`, error);
        }
    }
}

async function verifyMigration() {
    console.log('\nVerifying migration...');
    
    // Count challenges
    const { count: challengeCount, error: countError } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('Error counting challenges:', countError);
        return;
    }
    
    console.log(`✓ Total challenges migrated: ${challengeCount}`);
    
    // Check a sample challenge with capabilities
    const { data: sampleChallenge, error: sampleError } = await supabase
        .from('challenges')
        .select(`
            *,
            challenge_capabilities (
                capability_id
            )
        `)
        .eq('number', 1)
        .single();
    
    if (!sampleError && sampleChallenge) {
        console.log('\n✓ Sample challenge verified:');
        console.log(`  Number: ${sampleChallenge.number}`);
        console.log(`  Title: ${sampleChallenge.title}`);
        console.log(`  Capabilities: ${sampleChallenge.challenge_capabilities.length}`);
    }
    
    // Test the aggregate view
    const { data: aggregateData, error: aggError } = await supabase
        .from('challenge_ratings_aggregate')
        .select('*')
        .limit(1);
    
    if (!aggError && aggregateData) {
        console.log('\n✓ Aggregate view is working');
    }
}

async function main() {
    console.log('Starting data migration to Supabase...\n');
    
    try {
        // Load data
        const challenges = await loadJsonData();
        console.log(`Loaded ${challenges.length} challenges from data.json`);
        
        // Clear existing data (optional - comment out if you want to append)
        const clearData = process.argv.includes('--clear');
        if (clearData) {
            await clearExistingData();
        }
        
        // Migrate challenges
        await migrateChallenges(challenges);
        
        // Verify migration
        await verifyMigration();
        
        console.log('\n✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
main();