/**
 * Test script to verify date parsing works correctly
 * Run with: node test_date_parsing.js
 */

import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';

// Copy the parseWhenToRange function for testing
function parseWhenToRange(text, tz = 'Asia/Colombo', defaultDurMins = 45) {
    // Use current date as reference to ensure we get current year
    const now = new Date();
    const currentYear = DateTime.now().year;
    
    // Parse the text with chrono
    const parsed = chrono.parse(text, now, { 
        forwardDate: true,
        timezone: tz,
        instant: now
    })[0];
    
    if (!parsed) return null;
    
    const startJS = parsed.date();
    const start = DateTime.fromJSDate(startJS).setZone(tz);
    
    // If the parsed year is in the past, adjust to current year or next occurrence
    let adjustedStart = start;
    if (start.year < currentYear) {
        // Try to move to current year first
        adjustedStart = start.set({ year: currentYear });
        
        // If that's still in the past, move to next occurrence
        if (adjustedStart < DateTime.now().setZone(tz)) {
            adjustedStart = start.plus({ years: 1 });
        }
    }
    
    // Final validation: ensure the date is in the future
    if (adjustedStart < DateTime.now().setZone(tz)) {
        // If still in the past, try to move to next week
        adjustedStart = adjustedStart.plus({ weeks: 1 });
    }
    
    const end = adjustedStart.plus({ minutes: defaultDurMins });
    return { startISO: adjustedStart.toISO(), endISO: end.toISO() };
}

// Test cases
const testCases = [
    "next Tuesday at 3pm",
    "next Tuesday at 3:00pm",
    "next Tuesday 3pm",
    "tomorrow at 2pm",
    "today at 4pm",
    "next week Tuesday at 3pm",
    "Tuesday at 3pm",
    "next Monday at 10am",
    "next Friday at 2:30pm",
    "next Wednesday 9am",
    "next Thursday at 5pm",
    "next Saturday at 11am",
    "next Sunday at 1pm"
];

console.log('🧪 Testing Date Parsing...\n');

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase}"`);
    
    try {
        const result = parseWhenToRange(testCase);
        
        if (result) {
            const startDate = new Date(result.startISO);
            const endDate = new Date(result.endISO);
            
            console.log(`  ✅ Parsed successfully`);
            console.log(`  📅 Start: ${startDate.toLocaleString()}`);
            console.log(`  📅 End: ${endDate.toLocaleString()}`);
            console.log(`  📅 Year: ${startDate.getFullYear()}`);
            
            // Check if the year is current year
            const currentYear = new Date().getFullYear();
            if (startDate.getFullYear() === currentYear) {
                console.log(`  ✅ Year is correct (${currentYear})`);
            } else {
                console.log(`  ❌ Year is incorrect (${startDate.getFullYear()}, expected ${currentYear})`);
            }
            
            // Check if the date is in the future
            const now = new Date();
            if (startDate > now) {
                console.log(`  ✅ Date is in the future`);
            } else {
                console.log(`  ❌ Date is in the past`);
            }
        } else {
            console.log(`  ❌ Failed to parse`);
        }
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
});

console.log('📊 Date Parsing Test Complete');
console.log('If any tests show incorrect years or past dates, the parsing needs improvement.');
