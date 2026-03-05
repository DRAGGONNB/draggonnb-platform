'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Plus, Loader2, Bed, DollarSign, Settings,
  Image as ImageIcon, ArrowLeft, Save, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Property {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  check_in_time: string
  check_out_time: string
  timezone: string
  currency: string
  status: string
  description: string | null
  star_rating: number | null
  amenities: string[]
  accommodation_units: Unit[]
}

interface Unit {
  id: string
  name: string
  type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  base_price_per_night: number
  status: string
  created_at: string
}

interface RatePlan {
  id: string
  name: string
  description: string | null
  price_basis: string
  meal_plan: string
  status: string
  is_default: boolean
  valid_from: string | null
  valid_to: string | null
  created_at: string
}

interface PropertyImage {
  id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
}

interface ConfigEntry {
  id: string
  config_key: string
  config_value: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const UNIT_TYPES = [
  { value: 'room', label: 'Room' },
  { value: 'suite', label: 'Suite' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'tent', label: 'Tent' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'villa', label: 'Villa' },
  { value: 'other', label: 'Other' },
]

const UNIT_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  occupied: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
}

const PRICE_BASIS_OPTIONS = [
  { value: 'per_person', label: 'Per Person' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_room', label: 'Per Room' },
]

const MEAL_PLAN_OPTIONS = [
  { value: 'room_only', label: 'Room Only' },
  { value: 'bed_and_breakfast', label: 'Bed & Breakfast' },
  { value: 'half_board', label: 'Half Board' },
  { value: 'full_board', label: 'Full Board' },
  { value: 'all_inclusive', label: 'All Inclusive' },
  { value: 'self_catering', label: 'Self Catering' },
]

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  guesthouse: 'Guesthouse',
  bnb: 'B&B',
  lodge: 'Lodge',
  apartment: 'Apartment',
  villa: 'Villa',
  resort: 'Resort',
  game_lodge: 'Game Lodge',
  vacation_rental: 'Vacation Rental',
  other: 'Other',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  // Core data
  const [property, setProperty] = useState<Property | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([])
  const [images, setImages] = useState<PropertyImage[]>([])
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([])

  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Unit form
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [newUnit, setNewUnit] = useState({
    name: '',
    type: 'room',
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    base_price_per_night: 0,
  })

  // Rate plan form
  const [showRateForm, setShowRateForm] = useState(false)
  const [creatingRate, setCreatingRate] = useState(false)
  const [newRate, setNewRate] = useState({
    name: '',
    description: '',
    price_basis: 'per_unit',
    meal_plan: 'room_only',
    base_price: 0,
  })

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    check_in_time: '14:00',
    check_out_time: '10:00',
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // ─── Fetch Functions ────────────────────────────────────────────────────

  const fetchProperty = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/properties/${propertyId}`)
      if (!res.ok) {
        setError('Property not found')
        return
      }
      const data = await res.json()
      setProperty(data.property)
      setSettingsForm({
        check_in_time: data.property.check_in_time || '14:00',
        check_out_time: data.property.check_out_time || '10:00',
        timezone: data.property.timezone || 'Africa/Johannesburg',
        currency: data.property.currency || 'ZAR',
      })
    } catch {
      setError('Failed to load property')
    }
  }, [propertyId])

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/units?property_id=${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setUnits(data.units || [])
      }
    } catch {
      // Non-critical - units tab will show empty
    }
  }, [propertyId])

  const fetchRatePlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/rate-plans?property_id=${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setRatePlans(data.ratePlans || [])
      }
    } catch {
      // Non-critical
    }
  }, [propertyId])

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/images?entity_type=property&entity_id=${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch {
      // Non-critical
    }
  }, [propertyId])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/property-config?property_id=${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setConfigEntries(data.config || [])
      }
    } catch {
      // Non-critical
    }
  }, [propertyId])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      await Promise.all([
        fetchProperty(),
        fetchUnits(),
        fetchRatePlans(),
        fetchImages(),
        fetchConfig(),
      ])
      setLoading(false)
    }
    loadAll()
  }, [fetchProperty, fetchUnits, fetchRatePlans, fetchImages, fetchConfig])

  // ─── Action Handlers ──────────────────────────────────────────────────

  const handleCreateUnit = async () => {
    if (!newUnit.name.trim()) return
    setCreatingUnit(true)
    try {
      const res = await fetch('/api/accommodation/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          ...newUnit,
        }),
      })
      if (res.ok) {
        setShowUnitForm(false)
        setNewUnit({
          name: '',
          type: 'room',
          bedrooms: 1,
          bathrooms: 1,
          max_guests: 2,
          base_price_per_night: 0,
        })
        await fetchUnits()
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to create unit')
      }
    } catch {
      setError('Failed to create unit')
    } finally {
      setCreatingUnit(false)
    }
  }

  const handleCreateRatePlan = async () => {
    if (!newRate.name.trim()) return
    setCreatingRate(true)
    try {
      const res = await fetch('/api/accommodation/rate-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          name: newRate.name,
          description: newRate.description || undefined,
          price_basis: newRate.price_basis,
          meal_plan: newRate.meal_plan,
        }),
      })
      if (res.ok) {
        setShowRateForm(false)
        setNewRate({
          name: '',
          description: '',
          price_basis: 'per_unit',
          meal_plan: 'room_only',
          base_price: 0,
        })
        await fetchRatePlans()
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to create rate plan')
      }
    } catch {
      setError('Failed to create rate plan')
    } finally {
      setCreatingRate(false)
    }
  }

  const handleToggleRatePlanStatus = async (ratePlan: RatePlan) => {
    const newStatus = ratePlan.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/accommodation/rate-plans/${ratePlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchRatePlans()
      }
    } catch {
      setError('Failed to update rate plan')
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsSaved(false)
    try {
      const res = await fetch(`/api/accommodation/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in_time: settingsForm.check_in_time,
          check_out_time: settingsForm.check_out_time,
          timezone: settingsForm.timezone,
          currency: settingsForm.currency,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setProperty(data.property)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 3000)
      } else {
        setError('Failed to save settings')
      }
    } catch {
      setError('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  // ─── Loading / Error States ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Link
          href="/accommodation/properties"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </Link>
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{error || 'Property not found.'}</p>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Back Link */}
      <Link
        href="/accommodation/properties"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center justify-between">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Property Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {property.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {PROPERTY_TYPE_LABELS[property.type] || formatLabel(property.type)}
              </Badge>
              <Badge
                className={
                  property.status === 'active'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                    : property.status === 'inactive'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    : 'bg-red-100 text-red-700 hover:bg-red-100'
                }
              >
                {formatLabel(property.status)}
              </Badge>
            </div>
            {(property.city || property.province) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                {[property.city, property.province].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units" className="gap-1.5">
            <Bed className="h-4 w-4" />
            Units
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            Rates
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5">
            <ImageIcon className="h-4 w-4" />
            Images
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Tab 1: Units                                                      */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <TabsContent value="units" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Accommodation Units</h2>
            <Button onClick={() => setShowUnitForm(!showUnitForm)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {showUnitForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">New Unit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                      placeholder="e.g., Room 1, Honeymoon Suite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newUnit.type}
                      onValueChange={(v) => setNewUnit({ ...newUnit, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newUnit.bedrooms}
                      onChange={(e) =>
                        setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newUnit.bathrooms}
                      onChange={(e) =>
                        setNewUnit({ ...newUnit, bathrooms: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Guests</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newUnit.max_guests}
                      onChange={(e) =>
                        setNewUnit({ ...newUnit, max_guests: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Price / Night (ZAR)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newUnit.base_price_per_night}
                      onChange={(e) =>
                        setNewUnit({
                          ...newUnit,
                          base_price_per_night: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateUnit} disabled={creatingUnit}>
                    {creatingUnit ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Unit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowUnitForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {units.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Bed className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No units yet. Add your first unit to this property.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Bedrooms</TableHead>
                    <TableHead className="text-center">Bathrooms</TableHead>
                    <TableHead className="text-center">Max Guests</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{formatLabel(unit.type)}</TableCell>
                      <TableCell className="text-center">{unit.bedrooms}</TableCell>
                      <TableCell className="text-center">{unit.bathrooms}</TableCell>
                      <TableCell className="text-center">{unit.max_guests}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(unit.base_price_per_night)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            UNIT_STATUS_COLORS[unit.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {formatLabel(unit.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Tab 2: Rates                                                      */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <TabsContent value="rates" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Rate Plans</h2>
            <Button onClick={() => setShowRateForm(!showRateForm)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Rate Plan
            </Button>
          </div>

          {showRateForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">New Rate Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newRate.name}
                      onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                      placeholder="e.g., Standard Rate, Peak Season"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newRate.description}
                      onChange={(e) =>
                        setNewRate({ ...newRate, description: e.target.value })
                      }
                      placeholder="Brief description of this rate plan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Basis</Label>
                    <Select
                      value={newRate.price_basis}
                      onValueChange={(v) => setNewRate({ ...newRate, price_basis: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_BASIS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Plan</Label>
                    <Select
                      value={newRate.meal_plan}
                      onValueChange={(v) => setNewRate({ ...newRate, meal_plan: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_PLAN_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateRatePlan} disabled={creatingRate}>
                    {creatingRate ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Rate Plan
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {ratePlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No rate plans yet. Add your first rate plan for this property.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratePlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {plan.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={plan.status === 'active'}
                          onCheckedChange={() => handleToggleRatePlanStatus(plan)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatLabel(plan.price_basis)}</Badge>
                      <Badge variant="outline">{formatLabel(plan.meal_plan)}</Badge>
                      {plan.is_default && <Badge>Default</Badge>}
                    </div>
                    {(plan.valid_from || plan.valid_to) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {plan.valid_from && `From: ${plan.valid_from}`}
                        {plan.valid_from && plan.valid_to && ' | '}
                        {plan.valid_to && `To: ${plan.valid_to}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Tab 3: Settings                                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check-in / Check-out / Timezone / Currency */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in Time</Label>
                    <Input
                      type="time"
                      value={settingsForm.check_in_time}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, check_in_time: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out Time</Label>
                    <Input
                      type="time"
                      value={settingsForm.check_out_time}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, check_out_time: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settingsForm.timezone}
                    onValueChange={(v) =>
                      setSettingsForm({ ...settingsForm, timezone: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Johannesburg">
                        Africa/Johannesburg (SAST)
                      </SelectItem>
                      <SelectItem value="Africa/Cape_Town">
                        Africa/Cape_Town
                      </SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={settingsForm.currency}
                    onValueChange={(v) =>
                      setSettingsForm({ ...settingsForm, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                  {settingsSaved && (
                    <span className="text-sm text-green-600">Settings saved successfully.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="text-sm">
                      {[property.address, property.city, property.province, property.postal_code]
                        .filter(Boolean)
                        .join(', ') || 'Not specified'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Email</Label>
                    <p className="text-sm">{property.contact_email || 'Not specified'}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                    <p className="text-sm">{property.contact_phone || 'Not specified'}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Website</Label>
                    <p className="text-sm">
                      {property.website ? (
                        <a
                          href={property.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {property.website}
                        </a>
                      ) : (
                        'Not specified'
                      )}
                    </p>
                  </div>
                  {property.star_rating && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Star Rating</Label>
                        <p className="text-sm">{property.star_rating} Star</p>
                      </div>
                    </>
                  )}
                </div>

                {configEntries.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Custom Configuration
                      </Label>
                      <div className="space-y-2">
                        {configEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {formatLabel(entry.config_key)}
                            </span>
                            <span>{entry.config_value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Tab 4: Images                                                     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <TabsContent value="images" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Property Images</h2>
          </div>

          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No images uploaded yet.</p>
              <p className="text-xs mt-1">
                Image upload functionality will be available soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.alt_text || 'Property image'}
                      className="object-cover w-full h-full"
                    />
                    {image.is_primary && (
                      <Badge className="absolute top-2 left-2 text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground truncate">
                      {image.alt_text || 'No description'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
