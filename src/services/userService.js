// ---------------------------------------------------------------------------
// userService.js — User identity & Armory Operator profile management (FEATURE 6)
// Supports Supabase profiles table synchronization and persistent localStorage.
// ---------------------------------------------------------------------------

import { apiClient, IS_SUPABASE } from '../config/api'

const USER_IDENTIFIER_KEY = 'bore_barrel_user_id'
const USER_PROFILE_KEY = 'bore_barrel_user_profile'

/**
 * Check if a string is a valid UUID
 */
const isValidUUID = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)

/**
 * Generate a standard RFC4122 v4 UUID
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Return a stable, randomly-generated user identifier (UUID).
 * Compatible with Supabase PostgreSQL UUID foreign keys.
 */
export const getUserIdentifier = () => {
  try {
    let userId = localStorage.getItem(USER_IDENTIFIER_KEY)
    if (!userId || !isValidUUID(userId)) {
      userId = generateUUID()
      localStorage.setItem(USER_IDENTIFIER_KEY, userId)
    }
    return userId
  } catch {
    return generateUUID()
  }
}

/**
 * Default fallback profile
 */
const getDefaultProfile = (userId) => ({
  userId: userId || getUserIdentifier(),
  username: 'Operator Delta',
  bio: 'Lead armorer and certified weapons technician. Specializes in striker-fired sidearms and tactical carbine platforms.',
  avatar: null,
  contact_email: 'armory@boreandbarrel.com',
  contact_phone: '(555) 010-0100',
  station_address: '123 Range Road, Armory District',
  operating_hours: 'Tuesday to Saturday, 10:00 AM – 6:00 PM',
})

/**
 * Return the user profile object stored in localStorage or default
 */
export const getUserProfile = () => {
  const userId = getUserIdentifier()
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...getDefaultProfile(userId),
        ...parsed,
        userId,
      }
    }
  } catch {
    /* corrupted data — fallback */
  }
  return getDefaultProfile(userId)
}

/**
 * Fetch profile from Supabase with local fallback
 */
export const fetchRemoteProfile = async () => {
  const userId = getUserIdentifier()
  const localProfile = getUserProfile()

  if (IS_SUPABASE) {
    try {
      const data = await apiClient.get(`/rest/v1/profiles?user_id=eq.${userId}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        const remote = data[0]
        const merged = {
          ...localProfile,
          username: remote.username || localProfile.username,
          bio: remote.bio || localProfile.bio,
          avatar: remote.avatar || localProfile.avatar,
          contact_email: remote.contact_email || localProfile.contact_email,
          contact_phone: remote.contact_phone || localProfile.contact_phone,
        }
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(merged))
        return merged
      }
    } catch {
      // Supabase unavailable — continue with local
    }
  }
  return localProfile
}

/**
 * Persist an updated profile object (to Supabase & localStorage)
 */
export const saveUserProfile = async (profile) => {
  const userId = getUserIdentifier()
  const data = {
    ...getUserProfile(),
    ...profile,
    userId,
    updatedAt: new Date().toISOString(),
  }

  // 1. Always save locally first
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('profile-updated'))
  } catch (err) {
    console.warn('LocalStorage save error:', err)
  }

  // 2. Sync to Supabase if configured
  if (IS_SUPABASE) {
    try {
      const payload = {
        user_id: userId,
        username: data.username,
        bio: data.bio,
        avatar: data.avatar,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        updated_at: new Date().toISOString(),
      }

      await apiClient.post('/rest/v1/profiles', payload, {
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
      })
    } catch (err) {
      console.warn('Supabase profile sync failed (continuing with local persistence):', err)
    }
  }

  return { success: true, data }
}

export default {
  getUserIdentifier,
  getUserProfile,
  fetchRemoteProfile,
  saveUserProfile,
}
