/**
 * Timezone management utilities
 */

import { DateTime } from 'luxon';

/**
 * Get user's timezone with fallback options
 */
export function getUserTimezone(user) {
    // Priority order: user preference -> system detection -> default
    if (user?.timezone) {
        return user.timezone;
    }
    
    // Try to detect from system
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.warn('Could not detect system timezone:', error.message);
    }
    
    // Fallback to UTC
    return 'UTC';
}

/**
 * Get all available timezones
 */
export function getAvailableTimezones() {
    return [
        'UTC',
        'America/New_York',
        'America/Chicago', 
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Kolkata',
        'Asia/Colombo',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Pacific/Auckland'
    ];
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone) {
    try {
        DateTime.now().setZone(timezone);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Convert time between timezones
 */
export function convertTime(time, fromTz, toTz) {
    try {
        const dt = DateTime.fromISO(time).setZone(fromTz);
        return dt.setZone(toTz).toISO();
    } catch (error) {
        console.error('Timezone conversion error:', error);
        return time;
    }
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone) {
    try {
        return DateTime.now().setZone(timezone).toISO();
    } catch (error) {
        console.error('Error getting current time:', error);
        return new Date().toISOString();
    }
}

/**
 * Format time for display in user's timezone
 */
export function formatTimeForUser(time, timezone) {
    try {
        return DateTime.fromISO(time).setZone(timezone).toLocaleString(DateTime.DATETIME_FULL);
    } catch (error) {
        console.error('Error formatting time:', error);
        return time;
    }
}
