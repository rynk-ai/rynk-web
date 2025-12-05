import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Get D1 database binding
const getDB = () => {
  return getCloudflareContext().env.DB
}

export interface SubscriptionStatus {
  tier: 'free' | 'standard' | 'standard_plus'
  status: 'none' | 'active' | 'canceled' | 'past_due'
  credits: number
  carryoverCredits: number
  creditsResetAt: string | null
  polarCustomerId: string | null
  polarSubscriptionId: string | null
}

export async function GET() {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDB()

    // Fetch subscription info from database
    const user = await db.prepare(`
      SELECT 
        subscriptionTier,
        subscriptionStatus,
        credits,
        carryoverCredits,
        creditsResetAt,
        polarCustomerId,
        polarSubscriptionId
      FROM users 
      WHERE id = ?
    `).bind(session.user.id).first()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subscriptionStatus: SubscriptionStatus = {
      tier: (user.subscriptionTier as SubscriptionStatus['tier']) || 'free',
      status: (user.subscriptionStatus as SubscriptionStatus['status']) || 'none',
      credits: (user.credits as number) || 0,
      carryoverCredits: (user.carryoverCredits as number) || 0,
      creditsResetAt: user.creditsResetAt as string | null,
      polarCustomerId: user.polarCustomerId as string | null,
      polarSubscriptionId: user.polarSubscriptionId as string | null
    }

    return NextResponse.json(subscriptionStatus)

  } catch (error: any) {
    console.error('❌ [Subscription Status] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get subscription status' }, { status: 500 })
  }
}
