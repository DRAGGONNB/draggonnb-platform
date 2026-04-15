import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeadQualifierAgent } from '@/lib/agents/lead-qualifier'
import { ProposalGeneratorAgent } from '@/lib/agents/proposal-generator'
import type { QualificationResult } from '@/lib/agents/types'

/**
 * POST /api/leads/[id]/qualify
 * Internal endpoint. Runs Lead Qualifier agent, then triggers proposal generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    // Simple internal auth check
    const internalSecret = request.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_API_SECRET

    if (expectedSecret && internalSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Fetch lead data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // The `leads` table only has: id, name, company, email, phone, status, custom_fields.
    // All qualification state lives inside custom_fields jsonb.
    const cf: Record<string, unknown> = (lead.custom_fields as Record<string, unknown>) || {}
    const currentQualStatus = (cf.qualification_status as string | undefined) ?? 'pending'

    // Don't re-qualify already qualified leads
    if (currentQualStatus !== 'pending') {
      return NextResponse.json({
        success: true,
        message: `Lead already ${currentQualStatus}`,
        qualification: cf.qualification_score,
      })
    }

    // Mark as qualifying (merge into custom_fields)
    await supabase
      .from('leads')
      .update({ custom_fields: { ...cf, qualification_status: 'qualifying' } })
      .eq('id', leadId)

    // Run Lead Qualifier Agent
    const qualifier = new LeadQualifierAgent()
    let qualificationResult: QualificationResult

    try {
      const agentResult = await qualifier.qualifyLead({
        id: lead.id,
        company_name: lead.company || (cf.company_name as string | undefined) || '',
        contact_name: (cf.contact_name as string | undefined) || lead.name,
        email: lead.email,
        website: cf.website as string | undefined,
        industry: cf.industry as string | undefined,
        company_size: cf.company_size as string | undefined,
        business_issues: (cf.business_issues as string[] | undefined) || [],
      })

      if (!agentResult.result) {
        throw new Error('Qualification agent returned no result')
      }
      qualificationResult = agentResult.result as QualificationResult
    } catch (agentError) {
      console.error('Lead qualification agent failed:', agentError)

      // Mark as pending again so it can be retried
      await supabase
        .from('leads')
        .update({ custom_fields: { ...cf, qualification_status: 'pending' } })
        .eq('id', leadId)

      return NextResponse.json(
        { error: 'Qualification failed. Will retry.' },
        { status: 500 }
      )
    }

    // Update lead with qualification results (all into custom_fields)
    await supabase
      .from('leads')
      .update({
        custom_fields: {
          ...cf,
          qualification_status: qualificationResult.qualification_status,
          qualification_score: qualificationResult.score,
          recommended_tier: qualificationResult.recommended_tier,
          solution_blueprint: {
            automatable_processes: qualificationResult.automatable_processes,
            suggested_templates: qualificationResult.suggested_templates,
            reasoning: qualificationResult.reasoning,
          },
        },
      })
      .eq('id', leadId)

    console.log(
      `Lead ${leadId} qualified: ${qualificationResult.qualification_status} ` +
      `(score: ${qualificationResult.score.overall}, tier: ${qualificationResult.recommended_tier})`
    )

    // If qualified, generate proposal in background
    if (qualificationResult.qualification_status === 'qualified') {
      generateProposalAsync(lead, cf, qualificationResult).catch((err) =>
        console.error('Async proposal generation failed:', err)
      )
    }

    return NextResponse.json({
      success: true,
      qualification: qualificationResult,
    })
  } catch (error) {
    console.error('Lead qualification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate proposal asynchronously after qualification
 */
async function generateProposalAsync(
  lead: Record<string, unknown>,
  cf: Record<string, unknown>,
  qualification: QualificationResult
): Promise<void> {
  try {
    const proposalAgent = new ProposalGeneratorAgent()
    await proposalAgent.generateProposal(
      {
        id: lead.id as string,
        company_name: (lead.company as string) || (cf.company_name as string) || '',
        contact_name: (cf.contact_name as string | undefined) || (lead.name as string | undefined),
        industry: cf.industry as string | undefined,
        company_size: cf.company_size as string | undefined,
        business_issues: (cf.business_issues as string[]) || [],
      },
      qualification
    )

    console.log(`Proposal generated for lead ${lead.id}`)
  } catch (error) {
    console.error(`Proposal generation failed for lead ${lead.id}:`, error)
  }
}
