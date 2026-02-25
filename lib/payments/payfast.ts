import crypto from 'crypto'

/**
 * PayFast API Types
 */
export interface PayFastSubscriptionRequest {
  organizationId: string
  organizationName: string
  email: string
  amount: number // in ZAR (e.g., 1500 for R1,500.00)
  description: string
  subscriptionType: '1' // 1 = monthly, 2 = quarterly, 3 = biannual, 4 = annual, 5 = ad hoc, 6 = once-off
  billingDate: string // YYYY-MM-DD
  recurringAmount: number // in ZAR
  cycles: '0' // 0 = until cancelled
  metadata?: {
    planTier?: string
    billingCycle?: 'monthly' | 'annual'
    [key: string]: string | undefined
  }
}

export interface PayFastITNData {
  m_payment_id: string
  pf_payment_id: string
  payment_status: 'COMPLETE' | 'FAILED' | 'PENDING' | 'CANCELLED'
  item_name: string
  item_description: string
  amount_gross: string
  amount_fee: string
  amount_net: string
  custom_str1?: string // organizationId
  custom_str2?: string // planTier
  custom_str3?: string // metadata
  name_first?: string
  name_last?: string
  email_address: string
  merchant_id: string
  signature: string
  [key: string]: string | undefined
}

export interface PayFastFormData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  name_first: string
  name_last: string
  email_address: string
  m_payment_id: string
  amount: string
  item_name: string
  item_description: string
  custom_str1: string // organizationId
  custom_str2: string // planTier
  subscription_type: '1' | '2' | '3' | '4' | '5' | '6'
  billing_date: string
  recurring_amount: string
  frequency: '3' | '4' | '5' | '6' // 3 = monthly, 4 = quarterly, 5 = biannual, 6 = annual
  cycles: '0' // 0 = until cancelled
  signature: string
}

/**
 * Pricing tiers configuration
 */
export interface PricingTier {
  name: string
  price: number // in ZAR
  currency: string
  frequency: 'monthly' | 'annual'
  features: string[]
  payfast_item_code: string
  limits: {
    social_posts: number
    ai_generations: number
    email_sends: number
    social_accounts: number
    team_users: number
    custom_automations: number
    ai_agents: number
    agent_invocations: number
  }
}

export const TIER_MAP: Record<string, string> = {
  starter: 'core',
  professional: 'growth',
  enterprise: 'scale',
}

export function getCanonicalTierName(tier: string): string {
  return TIER_MAP[tier] || tier
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  // Legacy tier names (kept for backwards compatibility)
  starter: {
    name: 'Starter',
    price: 1500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      '30 social posts per month',
      '50 AI content generations',
      '3 social accounts',
      '2 team users',
      'Basic CRM (500 contacts)',
      'Email support',
      'Weekly analytics reports',
    ],
    payfast_item_code: 'DRG-STARTER',
    limits: { social_posts: 30, ai_generations: 50, email_sends: 1000, social_accounts: 3, team_users: 2, custom_automations: 1, ai_agents: 0, agent_invocations: 0 },
  },
  professional: {
    name: 'Professional',
    price: 3500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      '100 social posts per month',
      '200 AI content generations',
      '10 social accounts',
      '5 team users',
      'Full CRM (unlimited contacts)',
      'Approval workflows',
      'Custom content templates',
      'Priority WhatsApp support',
      'Daily analytics + insights',
    ],
    payfast_item_code: 'DRG-PROFESSIONAL',
    limits: { social_posts: 100, ai_generations: 200, email_sends: 10000, social_accounts: 10, team_users: 5, custom_automations: 3, ai_agents: 0, agent_invocations: 0 },
  },
  enterprise: {
    name: 'Enterprise',
    price: 7500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Unlimited social posts',
      'Unlimited AI generations',
      'Unlimited social accounts',
      'Unlimited team users',
      'White label (custom branding)',
      'API access',
      'Custom integrations',
      'Dedicated support (phone/WhatsApp)',
      'Advanced analytics & reporting',
      'SEO optimization module',
      'Industry-specific features',
    ],
    payfast_item_code: 'DRG-ENTERPRISE',
    limits: { social_posts: Infinity, ai_generations: Infinity, email_sends: Infinity, social_accounts: Infinity, team_users: Infinity, custom_automations: Infinity, ai_agents: 3, agent_invocations: 1000 },
  },
  // New canonical tier names
  core: {
    name: 'Core',
    price: 1500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Social CRM (contacts, companies, deals pipeline)',
      'Complete email management (campaigns, sequences, templates, tracking)',
      '1 custom business automation',
      '30 social posts per month',
      '50 AI content generations',
      '1,000 emails per month',
      '3 social accounts',
      '2 team users',
    ],
    payfast_item_code: 'DRG-CORE',
    limits: { social_posts: 30, ai_generations: 50, email_sends: 1000, social_accounts: 3, team_users: 2, custom_automations: 1, ai_agents: 0, agent_invocations: 0 },
  },
  growth: {
    name: 'Growth',
    price: 3500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Everything in Core, plus:',
      '3+ business automations from template library',
      'AI content generation for all channels',
      'Advanced email automation (behavioral triggers, A/B testing, smart segmentation)',
      'Smart lead pipeline (social engagement to CRM to automated nurture)',
      '100 social posts per month',
      '200 AI content generations',
      '10,000 emails per month',
      '10 social accounts',
      '5 team users',
    ],
    payfast_item_code: 'DRG-GROWTH',
    limits: { social_posts: 100, ai_generations: 200, email_sends: 10000, social_accounts: 10, team_users: 5, custom_automations: 3, ai_agents: 0, agent_invocations: 0 },
  },
  scale: {
    name: 'Scale',
    price: 7500,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Everything in Growth, plus:',
      'White label (custom domain, branding, remove DraggonnB branding)',
      'AI agents for client operations (customer support bot, lead responder, content autopilot)',
      'Unlimited social posts, AI generations, emails',
      'Unlimited social accounts and team users',
      'API access and custom integrations',
      '3 AI agents included (1,000 invocations/month)',
    ],
    payfast_item_code: 'DRG-SCALE',
    limits: { social_posts: Infinity, ai_generations: Infinity, email_sends: Infinity, social_accounts: Infinity, team_users: Infinity, custom_automations: Infinity, ai_agents: 3, agent_invocations: 1000 },
  },
  // Accommodation standalone tiers
  accommodation_starter: {
    name: 'Accommodation Starter',
    price: 399,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      '1 property, up to 5 units',
      'Booking management with calendar view',
      'Guest portal (access pack, waivers, payments)',
      'Rate plans with per-unit and per-person pricing',
      'Operations: tasks, checklists, fault reporting',
      'PayFast payment integration',
      '50 bookings per month',
      '500 emails per month',
      'Email support',
    ],
    payfast_item_code: 'DRG-ACCOM-STARTER',
    limits: { social_posts: 0, ai_generations: 10, email_sends: 500, social_accounts: 0, team_users: 2, custom_automations: 0, ai_agents: 0, agent_invocations: 0 },
  },
  accommodation_growth: {
    name: 'Accommodation Growth',
    price: 699,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Up to 3 properties, 15 units',
      'Everything in Starter, plus:',
      'WhatsApp AI guest concierge (500 messages/mo)',
      'Telegram staff operations bot',
      'Automated booking confirmations and reminders',
      'iCal sync with Airbnb and Booking.com',
      'Advanced reporting (occupancy, revenue)',
      '200 bookings per month',
      '2,000 emails per month',
      'Priority support',
    ],
    payfast_item_code: 'DRG-ACCOM-GROWTH',
    limits: { social_posts: 0, ai_generations: 50, email_sends: 2000, social_accounts: 0, team_users: 5, custom_automations: 1, ai_agents: 1, agent_invocations: 20 },
  },
  accommodation_safari: {
    name: 'Safari Lodge',
    price: 1299,
    currency: 'ZAR',
    frequency: 'monthly',
    features: [
      'Up to 10 properties, 50 units',
      'Everything in Growth, plus:',
      'Room assignment and game lodge management',
      'Safari activity manager (game drives, bush walks)',
      'WhatsApp AI concierge (2,000 messages/mo)',
      'Load shedding intelligence and guest alerts',
      'Community overflow network',
      'TGCSA compliance tracker',
      'Unlimited bookings',
      'Unlimited emails',
      'Dedicated support',
    ],
    payfast_item_code: 'DRG-ACCOM-SAFARI',
    limits: { social_posts: 0, ai_generations: 200, email_sends: Infinity, social_accounts: 0, team_users: Infinity, custom_automations: 3, ai_agents: 3, agent_invocations: 100 },
  },
}

/**
 * Get PayFast configuration
 */
export function getPayFastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const mode = process.env.PAYFAST_MODE || 'sandbox'

  if (!merchantId || !merchantKey) {
    throw new Error('Missing PayFast credentials (PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY)')
  }

  // Warn if production mode is enabled but passphrase is missing
  if (mode === 'production' && !passphrase) {
    console.warn(
      '[PayFast] WARNING: PAYFAST_PASSPHRASE is not set but PAYFAST_MODE is production. ' +
      'Signature validation will fail. Set PAYFAST_PASSPHRASE in your environment variables.'
    )
  }

  return {
    merchantId,
    merchantKey,
    passphrase,
    mode,
    baseUrl: mode === 'production'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process',
  }
}

/**
 * Generate MD5 signature for PayFast
 * PayFast uses MD5 hash of parameter string + passphrase
 */
export function generatePayFastSignature(data: Record<string, string>, passphrase?: string): string {
  // Create parameter string
  const paramString = Object.keys(data)
    .sort()
    .filter(key => key !== 'signature') // Exclude signature field
    .map(key => `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}`)
    .join('&')

  // Add passphrase if provided
  const stringToHash = passphrase ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}` : paramString

  // Generate MD5 hash
  return crypto.createHash('md5').update(stringToHash).digest('hex')
}

/**
 * Validate PayFast ITN (Instant Transaction Notification) signature
 */
export function validatePayFastSignature(
  itnData: Record<string, string>,
  passphrase?: string
): boolean {
  const receivedSignature = itnData.signature

  if (!receivedSignature) {
    console.error('No signature provided in ITN data')
    return false
  }

  // Generate expected signature
  const expectedSignature = generatePayFastSignature(itnData, passphrase)

  // Compare signatures
  return receivedSignature === expectedSignature
}

/**
 * Create PayFast subscription form data
 * This generates the form fields needed to redirect to PayFast
 */
export function createPayFastSubscription(
  request: PayFastSubscriptionRequest
): PayFastFormData {
  const config = getPayFastConfig()

  // Calculate billing date (today + 1 month for recurring)
  const billingDate = request.billingDate || getNextBillingDate()

  // Generate unique payment ID
  const paymentId = `${request.organizationId}-${Date.now()}`

  // Prepare form data
  const formData: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${process.env.PAYFAST_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`}?tier=${encodeURIComponent(request.metadata?.planTier || '')}`,
    cancel_url: process.env.PAYFAST_CANCEL_URL || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    notify_url: process.env.PAYFAST_NOTIFY_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payfast`,
    name_first: request.organizationName.split(' ')[0] || 'Customer',
    name_last: request.organizationName.split(' ').slice(1).join(' ') || 'Account',
    email_address: request.email,
    m_payment_id: paymentId,
    amount: request.amount.toFixed(2),
    item_name: `DraggonnB CRMM - ${
      request.metadata?.planTier && PRICING_TIERS[request.metadata.planTier]
        ? PRICING_TIERS[request.metadata.planTier].name
        : 'Subscription'
    } Plan`,
    item_description: request.description,
    custom_str1: request.organizationId,
    custom_str2: request.metadata?.planTier || '',
    subscription_type: request.subscriptionType,
    billing_date: billingDate,
    recurring_amount: request.recurringAmount.toFixed(2),
    frequency: '3', // 3 = monthly
    cycles: request.cycles,
  }

  // Generate signature
  const signature = generatePayFastSignature(formData, config.passphrase)

  return {
    ...formData,
    signature,
  } as PayFastFormData
}

/**
 * Get next billing date (1 month from today)
 */
function getNextBillingDate(): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return nextMonth.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Verify PayFast payment via server-to-server confirmation
 * This is recommended by PayFast for security
 */
export async function verifyPayFastPayment(itnData: PayFastITNData): Promise<boolean> {
  const config = getPayFastConfig()

  try {
    const validateUrl = config.mode === 'production'
      ? 'https://www.payfast.co.za/eng/query/validate'
      : 'https://sandbox.payfast.co.za/eng/query/validate'

    // Build parameter string
    const paramString = Object.keys(itnData)
      .filter(key => key !== 'signature')
      .map(key => `${key}=${encodeURIComponent(itnData[key] || '')}`)
      .join('&')

    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paramString,
    })

    const result = await response.text()
    return result === 'VALID'
  } catch (error) {
    console.error('Failed to verify PayFast payment:', error)
    return false
  }
}

/**
 * Check if payment amount matches expected amount
 * Prevents amount tampering
 */
export function validatePaymentAmount(
  receivedAmount: string,
  expectedAmount: number
): boolean {
  const received = parseFloat(receivedAmount)
  const expected = expectedAmount

  // Allow 0.01 difference for rounding
  return Math.abs(received - expected) < 0.01
}

/**
 * Get subscription tier by item code
 */
export function getTierByItemCode(itemCode: string): string | null {
  const tier = Object.entries(PRICING_TIERS).find(
    ([_, tier]) => tier.payfast_item_code === itemCode
  )
  return tier ? tier[0] : null
}
