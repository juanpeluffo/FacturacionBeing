/**
 * Talo Pay API client
 * Documentation: https://docs.talopay.com.ar
 */

const TALO_API_KEY = process.env.TALO_API_KEY!
const TALO_BASE_URL = process.env.TALO_BASE_URL || 'https://api.talopay.com.ar'

interface TaloHeaders {
  'Content-Type': string
  Authorization: string
}

function getHeaders(): TaloHeaders {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TALO_API_KEY}`,
  }
}

export interface TaloCVUAccount {
  id: string
  cvu: string
  alias?: string
  label?: string
  balance?: number
}

export interface TaloTransaction {
  id: string
  amount: number
  currency: string
  date: string
  description?: string
  senderCuit?: string
  senderName?: string
  status: string
  reference?: string
  type: 'credit' | 'debit'
}

export interface TaloWebhookPayload {
  event: string
  data: {
    transaction_id: string
    cvu_id: string
    cvu: string
    amount: number
    currency: string
    date: string
    sender_name?: string
    sender_cuit?: string
    description?: string
    reference?: string
  }
}

/**
 * Create a new CVU account for a client
 */
export async function createCVUAccount(label: string, clientExternalId?: string): Promise<TaloCVUAccount> {
  const response = await fetch(`${TALO_BASE_URL}/v1/cvu`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      label,
      external_id: clientExternalId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Talo Pay error creating CVU: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    cvu: data.cvu,
    alias: data.alias,
    label: data.label,
    balance: data.balance,
  }
}

/**
 * Get CVU account details
 */
export async function getCVUAccount(cvuId: string): Promise<TaloCVUAccount> {
  const response = await fetch(`${TALO_BASE_URL}/v1/cvu/${cvuId}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Talo Pay error fetching CVU: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * List transactions for a CVU account
 */
export async function listTransactions(
  cvuId: string,
  options: {
    from?: string
    to?: string
    limit?: number
    cursor?: string
  } = {}
): Promise<{ transactions: TaloTransaction[]; nextCursor?: string }> {
  const params = new URLSearchParams()
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  if (options.limit) params.set('limit', String(options.limit))
  if (options.cursor) params.set('cursor', options.cursor)

  const url = `${TALO_BASE_URL}/v1/cvu/${cvuId}/transactions?${params.toString()}`
  const response = await fetch(url, { headers: getHeaders() })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Talo Pay error listing transactions: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    transactions: (data.transactions || data.data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      amount: t.amount as number,
      currency: (t.currency as string) || 'ARS',
      date: (t.date || t.created_at) as string,
      description: t.description as string | undefined,
      senderCuit: (t.sender_cuit || t.payer_cuit) as string | undefined,
      senderName: (t.sender_name || t.payer_name) as string | undefined,
      status: (t.status as string) || 'completed',
      reference: t.reference as string | undefined,
      type: (t.type as 'credit' | 'debit') || 'credit',
    })),
    nextCursor: data.next_cursor,
  }
}

/**
 * Verify webhook signature from Talo Pay
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Talo Pay typically uses HMAC-SHA256 for webhook verification
  // Implementation depends on their specific signature scheme
  try {
    const crypto = require('crypto')
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return signature === expectedSig || signature === `sha256=${expectedSig}`
  } catch {
    return false
  }
}

/**
 * Check if Talo Pay is configured
 */
export function isTaloConfigured(): boolean {
  return !!(TALO_API_KEY && TALO_BASE_URL)
}
