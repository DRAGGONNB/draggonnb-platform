-- Migration: Add new bolt-on module stubs to module_registry
-- These are registry entries only -- no tables or routes are built yet.
-- They enable the provisioning system to offer these packages to new clients.

INSERT INTO module_registry (id, display_name, description, min_tier, routes, tables) VALUES
  ('restaurant', 'Restaurant Management', 'Menu management, table reservations, order tracking, kitchen display', 'growth',
   ARRAY['/restaurant', '/api/restaurant'], ARRAY['menus', 'menu_items', 'reservations', 'orders', 'kitchen_tickets']),
  ('events', 'Events & Functions', 'Event bookings, venue management, ticketing, catering packages', 'growth',
   ARRAY['/events', '/api/events'], ARRAY['events', 'event_bookings', 'venues', 'event_tickets', 'catering_packages']),
  ('security_ops', 'Security Operations', 'Guard scheduling, patrol tracking, incident reporting, access control', 'core',
   ARRAY['/security', '/api/security'], ARRAY['guards', 'patrols', 'incidents', 'access_logs', 'security_zones'])
ON CONFLICT (id) DO NOTHING;

-- Add module package definitions for rapid onboarding
-- These are stored as a new table that maps package names to module bundles
CREATE TABLE IF NOT EXISTS module_packages (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  min_tier TEXT NOT NULL DEFAULT 'core',
  module_ids TEXT[] NOT NULL,
  target_industry TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE module_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_packages FORCE ROW LEVEL SECURITY;

CREATE POLICY "module_packages_public_read" ON module_packages
  FOR SELECT USING (true);
CREATE POLICY "module_packages_service_role" ON module_packages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

INSERT INTO module_packages (id, display_name, description, min_tier, module_ids, target_industry) VALUES
  ('accommodation_suite', 'Accommodation Suite', 'Complete hospitality management with bookings, guests, and automation', 'growth',
   ARRAY['accommodation', 'email', 'crm', 'ai_agents'], 'hospitality'),
  ('restaurant_events', 'Restaurant + Events', 'Restaurant management with event booking capabilities', 'growth',
   ARRAY['restaurant', 'events', 'email', 'crm'], 'food_beverage'),
  ('security_operations', 'Security Operations', 'Guard management, patrol tracking, and incident reporting', 'core',
   ARRAY['security_ops', 'crm', 'email'], 'security'),
  ('professional_services', 'Professional Services', 'CRM, marketing, and analytics for consultants and agencies', 'core',
   ARRAY['crm', 'email', 'content_studio', 'analytics'], 'professional'),
  ('full_stack', 'Full Stack Business OS', 'Every module enabled for maximum capability', 'scale',
   ARRAY['crm', 'email', 'social', 'content_studio', 'accommodation', 'ai_agents', 'analytics'], 'enterprise')
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_module_packages_updated_at BEFORE UPDATE ON module_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
