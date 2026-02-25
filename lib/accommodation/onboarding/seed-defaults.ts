/**
 * Accommodation Module - Default Data Seeding
 * Seeds default templates and policies when a new accommodation org is created.
 * Used during self-serve signup (single-Supabase multi-tenant model).
 */

import { createAdminClient } from '@/lib/supabase/admin'

interface SeedResult {
  success: boolean
  error?: string
  seeded: string[]
}

/**
 * Seed all default data for a new accommodation organization.
 * Call this after create_user_with_organization() completes.
 */
export async function seedAccommodationDefaults(organizationId: string): Promise<SeedResult> {
  const supabase = createAdminClient()
  const seeded: string[] = []

  try {
    // 1. Default checklist templates
    const checklistTemplates = [
      {
        organization_id: organizationId,
        name: 'Standard Turnover Clean',
        checklist_type: 'turnover',
        items: JSON.stringify([
          { label: 'Strip all beds', requires_photo: false, order: 1 },
          { label: 'Replace linen and towels', requires_photo: false, order: 2 },
          { label: 'Clean bathrooms (toilet, basin, shower)', requires_photo: false, order: 3 },
          { label: 'Vacuum/sweep all floors', requires_photo: false, order: 4 },
          { label: 'Mop hard floors', requires_photo: false, order: 5 },
          { label: 'Wipe all surfaces and countertops', requires_photo: false, order: 6 },
          { label: 'Empty all bins', requires_photo: false, order: 7 },
          { label: 'Restock toiletries', requires_photo: false, order: 8 },
          { label: 'Check all lights and switches', requires_photo: false, order: 9 },
          { label: 'Final walk-through inspection', requires_photo: true, order: 10 },
        ]),
        requires_photo: false,
        estimated_minutes: 60,
        status: 'active',
      },
      {
        organization_id: organizationId,
        name: 'Deep Clean',
        checklist_type: 'deep_clean',
        items: JSON.stringify([
          { label: 'All turnover clean items', requires_photo: false, order: 1 },
          { label: 'Clean inside all cupboards and drawers', requires_photo: false, order: 2 },
          { label: 'Clean oven and hob', requires_photo: false, order: 3 },
          { label: 'Clean fridge inside and out', requires_photo: false, order: 4 },
          { label: 'Wash windows inside', requires_photo: false, order: 5 },
          { label: 'Clean extractor fans', requires_photo: false, order: 6 },
          { label: 'Flip/rotate mattresses', requires_photo: false, order: 7 },
          { label: 'Deep clean carpets/rugs', requires_photo: false, order: 8 },
          { label: 'Check for maintenance issues', requires_photo: true, order: 9 },
        ]),
        requires_photo: true,
        estimated_minutes: 120,
        status: 'active',
      },
      {
        organization_id: organizationId,
        name: 'Pre-Arrival Inspection',
        checklist_type: 'inspection',
        items: JSON.stringify([
          { label: 'Unit is clean and tidy', requires_photo: true, order: 1 },
          { label: 'All lights working', requires_photo: false, order: 2 },
          { label: 'Hot water running', requires_photo: false, order: 3 },
          { label: 'WiFi connected and working', requires_photo: false, order: 4 },
          { label: 'Welcome amenities placed', requires_photo: true, order: 5 },
          { label: 'Gate/door access working', requires_photo: false, order: 6 },
          { label: 'No maintenance issues visible', requires_photo: false, order: 7 },
        ]),
        requires_photo: true,
        estimated_minutes: 15,
        status: 'active',
      },
    ]

    const { error: checklistError } = await supabase
      .from('accommodation_checklist_templates')
      .insert(checklistTemplates)

    if (checklistError) throw new Error(`Checklist templates: ${checklistError.message}`)
    seeded.push('checklist_templates')

    // 2. Default email templates
    const emailTemplates = [
      {
        organization_id: organizationId,
        trigger_type: 'booking_confirmed',
        subject: 'Booking Confirmed - {{booking_ref}}',
        body: 'Dear {{guest_name}},\n\nThank you for your booking!\n\nBooking Reference: {{booking_ref}}\nProperty: {{property_name}}\nCheck-in: {{check_in_date}} at {{check_in_time}}\nCheck-out: {{check_out_date}} at {{check_out_time}}\nGuests: {{total_guests}}\nTotal: {{currency}} {{grand_total}}\n\nWe look forward to welcoming you.\n\nKind regards,\n{{property_name}}',
        is_active: true,
        send_days_offset: 0,
      },
      {
        organization_id: organizationId,
        trigger_type: 'deposit_reminder',
        subject: 'Deposit Reminder - {{booking_ref}}',
        body: 'Dear {{guest_name}},\n\nThis is a friendly reminder that your deposit of {{currency}} {{deposit_amount}} for booking {{booking_ref}} is due by {{due_date}}.\n\nPlease use the following link to make your payment:\n{{payment_link}}\n\nIf you have already paid, please disregard this message.\n\nKind regards,\n{{property_name}}',
        is_active: true,
        send_days_offset: -3,
      },
      {
        organization_id: organizationId,
        trigger_type: 'pre_arrival',
        subject: 'Your Stay is Coming Up - {{property_name}}',
        body: 'Dear {{guest_name}},\n\nWe are looking forward to welcoming you on {{check_in_date}}!\n\nYour guest portal is now available with all the information you need for your stay:\n{{portal_link}}\n\nHere you can find:\n- Check-in instructions and directions\n- WiFi details\n- House rules\n- Available add-on services\n\nSafe travels!\n\nKind regards,\n{{property_name}}',
        is_active: true,
        send_days_offset: -1,
      },
      {
        organization_id: organizationId,
        trigger_type: 'check_out',
        subject: 'Thank You for Staying with Us - {{property_name}}',
        body: 'Dear {{guest_name}},\n\nThank you for staying at {{property_name}}. We hope you had a wonderful experience.\n\nIf you enjoyed your stay, we would appreciate a review. Your feedback helps us improve and helps other travellers find us.\n\nWe hope to welcome you back soon!\n\nKind regards,\n{{property_name}}',
        is_active: true,
        send_days_offset: 1,
      },
      {
        organization_id: organizationId,
        trigger_type: 'review_request',
        subject: 'How Was Your Stay? - {{property_name}}',
        body: 'Dear {{guest_name}},\n\nWe hope you enjoyed your recent stay at {{property_name}}.\n\nWould you take a moment to share your experience? Your review helps us serve future guests better.\n\nThank you for choosing {{property_name}}.\n\nKind regards,\n{{property_name}}',
        is_active: true,
        send_days_offset: 3,
      },
    ]

    const { error: emailError } = await supabase
      .from('accommodation_email_templates')
      .insert(emailTemplates)

    if (emailError) throw new Error(`Email templates: ${emailError.message}`)
    seeded.push('email_templates')

    // 3. Default deposit policy
    const { error: depositError } = await supabase
      .from('accommodation_deposit_policies')
      .insert({
        organization_id: organizationId,
        name: 'Standard Deposit (50%)',
        deposit_type: 'percentage',
        value: 50,
        due_days_before_arrival: 7,
        is_default: true,
      })

    if (depositError) throw new Error(`Deposit policy: ${depositError.message}`)
    seeded.push('deposit_policy')

    // 4. Default cancellation policy
    const { error: cancelError } = await supabase
      .from('accommodation_cancellation_policies')
      .insert({
        organization_id: organizationId,
        name: 'Standard Cancellation',
        description: 'Free cancellation 14+ days before arrival. 50% refund 7-14 days. No refund within 7 days.',
        tiers: JSON.stringify([
          { days_before: 14, refund_percentage: 100 },
          { days_before: 7, refund_percentage: 50 },
          { days_before: 0, refund_percentage: 0 },
        ]),
        no_show_charge_percentage: 100,
        is_default: true,
      })

    if (cancelError) throw new Error(`Cancellation policy: ${cancelError.message}`)
    seeded.push('cancellation_policy')

    return { success: true, seeded }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during seeding',
      seeded,
    }
  }
}
