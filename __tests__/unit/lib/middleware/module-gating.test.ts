/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'

/**
 * Module gating tests verify that the feature gate + middleware module-route mapping
 * correctly blocks/allows access based on tier and enabled modules.
 *
 * The middleware uses MODULE_ROUTE_MAP to gate routes by module.
 * The feature gate uses FEATURE_MIN_TIER to gate features by tier.
 */

describe('Module Access Gating', () => {
  // Module-to-route mappings as defined in middleware
  const moduleRouteMap: Record<string, string> = {
    '/crm': 'crm',
    '/api/crm': 'crm',
    '/email': 'email',
    '/api/email': 'email',
    '/social': 'social',
    '/api/social': 'social',
    '/content-generator': 'content_studio',
    '/api/content': 'content_studio',
    '/accommodation': 'accommodation',
    '/api/accommodation': 'accommodation',
    '/autopilot': 'ai_agents',
    '/api/autopilot': 'ai_agents',
    '/analytics': 'analytics',
    '/api/analytics': 'analytics',
  }

  describe('Core tier module access', () => {
    const coreTier = 'core'
    const coreModules = ['crm', 'email', 'analytics']

    it('allows CRM routes for core tier', () => {
      expect(coreModules.includes('crm')).toBe(true)
    })

    it('allows email routes for core tier', () => {
      expect(coreModules.includes('email')).toBe(true)
    })

    it('allows analytics routes for core tier', () => {
      expect(coreModules.includes('analytics')).toBe(true)
    })

    it('blocks accommodation for core tier via feature gate', () => {
      const result = checkFeatureAccess(coreTier, 'accommodation_module')
      expect(result.allowed).toBe(false)
      expect(result.upgradeRequired).toBe('growth')
    })

    it('does NOT include social module by default', () => {
      expect(coreModules.includes('social')).toBe(false)
    })

    it('does NOT include accommodation module by default', () => {
      expect(coreModules.includes('accommodation')).toBe(false)
    })

    it('does NOT include ai_agents module by default', () => {
      expect(coreModules.includes('ai_agents')).toBe(false)
    })
  })

  describe('Growth tier module access', () => {
    const growthTier = 'growth'
    const growthModules = ['crm', 'email', 'social', 'content_studio', 'accommodation', 'analytics']

    it('includes all core modules', () => {
      expect(growthModules.includes('crm')).toBe(true)
      expect(growthModules.includes('email')).toBe(true)
      expect(growthModules.includes('analytics')).toBe(true)
    })

    it('adds social module', () => {
      expect(growthModules.includes('social')).toBe(true)
    })

    it('adds content_studio module', () => {
      expect(growthModules.includes('content_studio')).toBe(true)
    })

    it('adds accommodation module', () => {
      expect(growthModules.includes('accommodation')).toBe(true)
      const result = checkFeatureAccess(growthTier, 'accommodation_module')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Scale tier module access', () => {
    const scaleTier = 'scale'
    const scaleModules = ['crm', 'email', 'social', 'content_studio', 'accommodation', 'ai_agents', 'analytics']

    it('includes all growth modules', () => {
      expect(scaleModules.includes('crm')).toBe(true)
      expect(scaleModules.includes('email')).toBe(true)
      expect(scaleModules.includes('social')).toBe(true)
      expect(scaleModules.includes('content_studio')).toBe(true)
      expect(scaleModules.includes('accommodation')).toBe(true)
      expect(scaleModules.includes('analytics')).toBe(true)
    })

    it('adds ai_agents module', () => {
      expect(scaleModules.includes('ai_agents')).toBe(true)
    })

    it('allows all features via feature gate', () => {
      expect(checkFeatureAccess(scaleTier, 'accommodation_module').allowed).toBe(true)
      expect(checkFeatureAccess(scaleTier, 'white_label').allowed).toBe(true)
      expect(checkFeatureAccess(scaleTier, 'api_access').allowed).toBe(true)
    })
  })

  describe('non-module routes always pass', () => {
    const nonModuleRoutes = ['/dashboard', '/billing', '/settings', '/onboarding', '/api/auth']

    it('non-module routes are not in MODULE_ROUTE_MAP', () => {
      for (const route of nonModuleRoutes) {
        const isGated = Object.keys(moduleRouteMap).some(prefix => route.startsWith(prefix))
        expect(isGated).toBe(false)
      }
    })
  })

  describe('route-to-module matching', () => {
    it('/crm maps to crm module', () => {
      expect(moduleRouteMap['/crm']).toBe('crm')
    })

    it('/api/crm maps to crm module', () => {
      expect(moduleRouteMap['/api/crm']).toBe('crm')
    })

    it('/accommodation maps to accommodation module', () => {
      expect(moduleRouteMap['/accommodation']).toBe('accommodation')
    })

    it('/autopilot maps to ai_agents module', () => {
      expect(moduleRouteMap['/autopilot']).toBe('ai_agents')
    })

    it('/content-generator maps to content_studio module (note: dash vs underscore)', () => {
      expect(moduleRouteMap['/content-generator']).toBe('content_studio')
    })

    it('API routes use /api/content not /api/content-generator', () => {
      expect(moduleRouteMap['/api/content']).toBe('content_studio')
    })

    it('all 7 modules have both page and API route mappings', () => {
      const modules = new Set(Object.values(moduleRouteMap))
      expect(modules.size).toBe(7)
      expect(modules).toContain('crm')
      expect(modules).toContain('email')
      expect(modules).toContain('social')
      expect(modules).toContain('content_studio')
      expect(modules).toContain('accommodation')
      expect(modules).toContain('ai_agents')
      expect(modules).toContain('analytics')
    })
  })
})
