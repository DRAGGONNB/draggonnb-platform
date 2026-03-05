'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  ArrowLeft,
  Loader2,
  Building2,
  Globe,
  Users,
  Trash2,
  MoreHorizontal,
  Filter,
  ExternalLink,
  Briefcase,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Company {
  id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  city: string | null
  country: string | null
  employee_count: number | null
  contacts_count?: number
  deals_value?: number
  status?: string
  created_at: string
}

const MOCK_COMPANIES: Company[] = [
  { id: '1', name: 'TechCorp SA', industry: 'Technology', website: 'https://techcorp.co.za', phone: '+27 21 555 0100', city: 'Cape Town', country: 'South Africa', employee_count: 120, contacts_count: 4, deals_value: 85000, status: 'active', created_at: '2026-01-15T10:00:00Z' },
  { id: '2', name: 'Innovate Group', industry: 'Consulting', website: 'https://innovategroup.co.za', phone: '+27 11 555 0200', city: 'Johannesburg', country: 'South Africa', employee_count: 45, contacts_count: 2, deals_value: 120000, status: 'active', created_at: '2026-01-20T09:00:00Z' },
  { id: '3', name: 'Greenfields Hospitality', industry: 'Hospitality', website: 'https://greenfields.co.za', phone: '+27 21 555 0300', city: 'Stellenbosch', country: 'South Africa', employee_count: 200, contacts_count: 3, deals_value: 55000, status: 'active', created_at: '2026-02-01T14:00:00Z' },
  { id: '4', name: 'BlueWave Tech', industry: 'Software', website: 'https://bluewavetech.co.za', phone: null, city: 'Durban', country: 'South Africa', employee_count: 30, contacts_count: 1, deals_value: 0, status: 'prospect', created_at: '2026-02-05T11:00:00Z' },
  { id: '5', name: 'SolarCape Energy', industry: 'Renewable Energy', website: 'https://solarcape.co.za', phone: '+27 21 555 0500', city: 'Cape Town', country: 'South Africa', employee_count: 85, contacts_count: 2, deals_value: 250000, status: 'active', created_at: '2026-02-10T08:00:00Z' },
  { id: '6', name: 'BuildRight Construction', industry: 'Construction', website: null, phone: '+27 11 555 0600', city: 'Pretoria', country: 'South Africa', employee_count: 350, contacts_count: 1, deals_value: 45000, status: 'prospect', created_at: '2026-02-14T16:00:00Z' },
  { id: '7', name: 'Creative Edge Studio', industry: 'Marketing', website: 'https://creativeedge.co.za', phone: '+27 21 555 0700', city: 'Cape Town', country: 'South Africa', employee_count: 15, contacts_count: 1, deals_value: 0, status: 'inactive', created_at: '2026-02-18T13:00:00Z' },
  { id: '8', name: 'FinServe Advisory', industry: 'Financial Services', website: 'https://finserve.co.za', phone: '+27 11 555 0800', city: 'Sandton', country: 'South Africa', employee_count: 60, contacts_count: 3, deals_value: 180000, status: 'active', created_at: '2026-02-22T10:00:00Z' },
]

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700 hover:bg-green-50' },
  prospect: { label: 'Prospect', className: 'bg-blue-50 text-blue-700 hover:bg-blue-50' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [useMockData, setUseMockData] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    city: '',
    country: 'South Africa',
    employee_count: '',
  })

  useEffect(() => {
    loadCompanies()
  }, [search])

  async function loadCompanies() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/crm/companies?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        const fetched = data.companies || []
        if (fetched.length === 0) {
          setCompanies(MOCK_COMPANIES)
          setTotal(MOCK_COMPANIES.length)
          setUseMockData(true)
        } else {
          setCompanies(fetched)
          setTotal(data.total || 0)
          setUseMockData(false)
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
      setCompanies(MOCK_COMPANIES)
      setTotal(MOCK_COMPANIES.length)
      setUseMockData(true)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch('/api/crm/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        }),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setFormData({ name: '', industry: '', website: '', phone: '', city: '', country: 'South Africa', employee_count: '' })
        loadCompanies()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create company')
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (useMockData) return
    if (!confirm('Are you sure you want to delete this company?')) return

    try {
      const res = await fetch(`/api/crm/companies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadCompanies()
      } else {
        alert('Failed to delete company')
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const industries = [...new Set(companies.map((c) => c.industry).filter(Boolean))]
  const filteredCompanies = industryFilter
    ? companies.filter((c) => c.industry === industryFilter)
    : companies

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {total} companies in your CRM
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_count">Employees</Label>
                  <Input
                    id="employee_count"
                    type="number"
                    value={formData.employee_count}
                    onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
                    placeholder="e.g., 50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Company
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar */}
      <Card className="shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Industries</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind!} value={ind!}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Companies Table */}
      <Card className="shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No companies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || industryFilter
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first company'}
            </p>
            {!search && !industryFilter && (
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Company Name</TableHead>
                  <TableHead className="font-semibold">Industry</TableHead>
                  <TableHead className="font-semibold">Contacts</TableHead>
                  <TableHead className="font-semibold">Deals Value</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => {
                  const statusInfo = STATUS_CONFIG[company.status || 'active'] || STATUS_CONFIG.active
                  return (
                    <TableRow key={company.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Building2 className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            {company.website && (
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Globe className="h-3 w-3" />
                                {company.website.replace(/^https?:\/\//, '').split('/')[0]}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.industry ? (
                          <span className="text-sm text-gray-700">{company.industry}</span>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {company.contacts_count ?? (company.employee_count ? Math.min(company.employee_count, 5) : 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(company.deals_value ?? 0) > 0 ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                            R{(company.deals_value ?? 0).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">R0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              View Contacts
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(company.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Table Footer */}
        {filteredCompanies.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {filteredCompanies.length} of {total} companies
              {useMockData && (
                <span className="ml-2 text-xs text-amber-600">(sample data)</span>
              )}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
