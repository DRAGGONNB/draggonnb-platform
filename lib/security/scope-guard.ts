/**
 * Scope Guard — Reusable scope enforcement for external M2M API endpoints.
 *
 * External routes (under /api/external/*) are authenticated by middleware,
 * which injects x-organization-id and x-api-key-scopes headers. This utility
 * checks that the API key's scopes satisfy what the endpoint requires.
 */

import { NextRequest, NextResponse } from 'next/server'

interface ScopeCheckResult {
  authorized: boolean
  response?: NextResponse
}

/**
 * Verify the request's API key has all required scopes.
 *
 * Reads x-api-key-scopes header (comma-separated, set by middleware)
 * and checks every required scope is present.
 *
 * @param request  - The incoming NextRequest
 * @param requiredScopes - One or more scope strings that must ALL be present
 * @returns { authorized: true } or { authorized: false, response: 403 NextResponse }
 */
export function requireScopes(
  request: NextRequest,
  ...requiredScopes: string[]
): ScopeCheckResult {
  const scopeHeader = request.headers.get('x-api-key-scopes') || ''
  const grantedScopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopes.includes(scope)
  )

  if (missingScopes.length > 0) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Insufficient scopes',
          required: requiredScopes,
          granted: grantedScopes,
        },
        { status: 403 }
      ),
    }
  }

  return { authorized: true }
}

/**
 * Read the organization ID injected by middleware from the API key lookup.
 *
 * @param request - The incoming NextRequest
 * @returns The organization_id string, or null if header is missing
 */
export function getOrganizationId(request: NextRequest): string | null {
  return request.headers.get('x-organization-id') || null
}
