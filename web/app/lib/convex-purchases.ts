import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud',
)

const recordPurchaseRef = makeFunctionReference<'mutation'>('purchases:record')

type PurchaseStatus = 'completed' | 'pending' | 'refunded' | 'failed'

export async function recordPurchaseInConvex(args: {
  stripeSessionId: string
  amount: number
  status: PurchaseStatus
  email?: string
  userId?: string
  currency?: string
  source?: string
  eventType?: string
}) {
  const safeSessionId = String(args.stripeSessionId || '').trim().slice(0, 180)
  if (!safeSessionId) return null

  return await convex.mutation(recordPurchaseRef, {
    stripeSessionId: safeSessionId,
    amount: Number.isFinite(args.amount) ? Math.max(0, Math.floor(args.amount)) : 0,
    status: args.status,
    email: args.email?.trim().toLowerCase() || undefined,
    userId: args.userId,
    currency: args.currency?.trim().toLowerCase() || undefined,
    source: args.source?.trim().slice(0, 120) || undefined,
    eventType: args.eventType?.trim().slice(0, 120) || undefined,
  } as any)
}
