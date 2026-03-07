# Agent Build Spec

## Adding a New Agent

1. Create agent file in `lib/agents/` (e.g., `content-writer.ts`)
2. Add the agent type to the `AgentType` union in `lib/agents/types.ts`
3. Extend `BaseAgent` from `lib/agents/base-agent.ts`
4. Implement `parseResponse(response: string): unknown` for structured output

## Architecture

- **BaseAgent** (`base-agent.ts`): Handles Anthropic API calls, session persistence, token tracking, error handling
- **Types** (`types.ts`): All agent interfaces -- `AgentType`, `AgentConfig`, `AgentRunOptions`, `AgentRunResult`
- **Sessions**: Stored in `agent_sessions` table (Supabase). Each run creates or resumes a session.
- **Token tracking**: `tokens_used` accumulated per session (input + output tokens)

## Agent Pattern

```typescript
import { BaseAgent } from './base-agent'
import type { AgentConfig } from './types'

const CONFIG: AgentConfig = {
  agentType: 'your_agent_type',  // must match AgentType union
  systemPrompt: `Your system prompt here`,
  // model defaults to claude-sonnet-4-5-20250929
  // maxTokens defaults to 4096
  // temperature defaults to 0.7
}

export class YourAgent extends BaseAgent {
  constructor() {
    super(CONFIG)
  }

  protected parseResponse(response: string): YourResultType {
    // Parse Claude's text response into structured data
    // Throw if parsing fails -- BaseAgent catches and stores raw response
    return JSON.parse(response)
  }
}
```

## Calling an Agent

```typescript
const agent = new YourAgent()
const result = await agent.run({
  organizationId: 'org-uuid',    // optional, links session to org
  leadId: 'lead-uuid',           // optional, links session to lead
  sessionId: 'existing-id',      // optional, resumes session
  input: 'User message',
  context: { key: 'value' },     // optional, prepended to input
})
// result: { sessionId, response, tokensUsed, result, status }
```

## Existing Agents

- `LeadQualifierAgent` (`lead-qualifier.ts`): Scores leads on fit/urgency/size, recommends tier, identifies automatable processes
- `ProposalGeneratorAgent` (`proposal-generator.ts`): Generates proposals with pain points, solutions, pricing, timeline

### Accommodation AI Agents (lib/accommodation/agents/)

Four specialized agents for accommodation operations, all extending `BaseAgent`:

- `QuoterAgent` (`quoter-agent.ts`): Receives inquiry details, checks availability + rates, generates personalized quote email. Tools: `checkAvailability`, `calculateRate`, `getPropertyInfo`, `generateQuoteEmail`
- `ConciergeAgent` (`concierge-agent.ts`): Answers guest questions about property, area, activities via WhatsApp. Tools: `getPropertyDetails`, `getActivities`, `getLocalInfo`, `composeResponse`
- `ReviewerAgent` (`reviewer-agent.ts`): Analyzes guest reviews, generates response drafts, extracts sentiment/action items. Tools: `analyzeReview`, `generateResponse`, `extractActionItems`
- `PricerAgent` (`pricer-agent.ts`): Analyzes occupancy patterns, suggests rate adjustments. Tools: `getOccupancyData`, `getCompetitorRates`, `suggestPricing`, `generateReport`

Agent configs stored in `accommodation_ai_configs` table (per-org, per-agent-type). API routes at `app/api/accommodation/ai-configs/` and `app/api/accommodation/ai/`.

## Requirements

- `ANTHROPIC_API_KEY` env var must be set
- Agent type must be registered in `AgentType` union before use
- Admin Supabase client used for session storage (service role, bypasses RLS)
