/**
 * Cloudflare Cron Worker for Monthly Credit Resets
 * 
 * This worker runs daily at midnight UTC and resets credits for users
 * whose creditsResetAt timestamp has passed.
 * 
 * To deploy:
 * 1. Add cron trigger to wrangler.toml:
 *    [triggers]
 *    crons = ["0 0 * * *"]
 * 
 * 2. The scheduled handler will be called by Cloudflare at the specified time.
 */

import { cloudDb } from '@/lib/services/cloud-db'

export async function handleCreditReset() {
  console.log('🕐 [Credit Reset Worker] Starting monthly credit reset job...')
  
  try {
    // Get all users due for credit reset
    const usersDueForReset = await cloudDb.getUsersDueForReset()
    
    console.log(`📊 [Credit Reset Worker] Found ${usersDueForReset.length} users due for reset`)
    
    for (const user of usersDueForReset) {
      try {
        await cloudDb.resetUserCredits(user.id, user.subscriptionTier)
        console.log(`✅ [Credit Reset Worker] Reset credits for user ${user.id} (${user.subscriptionTier})`)
      } catch (error) {
        console.error(`❌ [Credit Reset Worker] Failed to reset credits for user ${user.id}:`, error)
      }
    }
    
    console.log('✅ [Credit Reset Worker] Credit reset job completed')
    return { success: true, usersProcessed: usersDueForReset.length }
  } catch (error) {
    console.error('❌ [Credit Reset Worker] Credit reset job failed:', error)
    return { success: false, error: String(error) }
  }
}

// For testing purposes - can be called via API
export async function handleManualCreditReset(userId: string) {
  console.log(`🔧 [Credit Reset Worker] Manual reset triggered for user ${userId}`)
  
  const subscription = await cloudDb.getSubscription(userId)
  if (!subscription) {
    throw new Error('User not found')
  }
  
  await cloudDb.resetUserCredits(userId, subscription.tier)
  return { success: true, tier: subscription.tier }
}
