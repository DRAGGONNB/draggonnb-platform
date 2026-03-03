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
  Mail,
  Phone,
  Building,
  Trash2,
  Edit,
  MoreHorizontal,
  Users,
  Filter,
  Download,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  job_title: string | null
  status: string
  created_at: string
}

const MOCK_CONTACTS: Contact[] = [
  { id: '1', first_name: 'Sarah', last_name: 'van der Berg', email: 'sarah@techcorp.co.za', phone: '+27 82 345 6789', company: 'TechCorp SA', job_title: 'Marketing Director', status: 'active', created_at: '2026-02-25T10:00:00Z' },
  { id: '2', first_name: 'James', last_name: 'Nkosi', email: 'james.nkosi@innovate.co.za', phone: '+27 83 456 7890', company: 'Innovate Group', job_title: 'CEO', status: 'customer', created_at: '2026-02-22T09:00:00Z' },
  { id: '3', first_name: 'Lerato', last_name: 'Molefe', email: 'lerato@greenfields.co.za', phone: '+27 84 567 8901', company: 'Greenfields Hospitality', job_title: 'Operations Manager', status: 'lead', created_at: '2026-02-20T14:00:00Z' },
  { id: '4', first_name: 'Pieter', last_name: 'du Plessis', email: 'pieter@bluewavetech.co.za', phone: null, company: 'BlueWave Tech', job_title: 'CTO', status: 'active', created_at: '2026-02-18T11:00:00Z' },
  { id: '5', first_name: 'Amina', last_name: 'Patel', email: 'amina@solarcape.co.za', phone: '+27 71 678 9012', company: 'SolarCape Energy', job_title: 'Business Dev Lead', status: 'customer', created_at: '2026-02-15T08:00:00Z' },
  { id: '6', first_name: 'Thabo', last_name: 'Mthembu', email: 'thabo@buildright.co.za', phone: '+27 82 789 0123', company: 'BuildRight Construction', job_title: 'Project Manager', status: 'lead', created_at: '2026-02-12T16:00:00Z' },
  { id: '7', first_name: 'Emma', last_name: 'Joubert', email: 'emma@creativeedge.co.za', phone: '+27 83 890 1234', company: 'Creative Edge Studio', job_title: 'Creative Director', status: 'inactive', created_at: '2026-02-10T13:00:00Z' },
  { id: '8', first_name: 'Sipho', last_name: 'Dlamini', email: 'sipho@finserve.co.za', phone: '+27 84 901 2345', company: 'FinServe Advisory', job_title: 'Financial Advisor', status: 'active', created_at: '2026-02-08T10:00:00Z' },
]

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700 hover:bg-green-50' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
  lead: { label: 'Lead', className: 'bg-blue-50 text-blue-700 hover:bg-blue-50' },
  customer: { label: 'Customer', className: 'bg-purple-50 text-purple-700 hover:bg-purple-50' },
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [useMockData, setUseMockData] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
  })

  useEffect(() => {
    loadContacts()
  }, [search])

  async function loadContacts() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/crm/contacts?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        const fetched = data.contacts || []
        if (fetched.length === 0) {
          setContacts(MOCK_CONTACTS)
          setTotal(MOCK_CONTACTS.length)
          setUseMockData(true)
        } else {
          setContacts(fetched)
          setTotal(data.total || 0)
          setUseMockData(false)
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts(MOCK_CONTACTS)
      setTotal(MOCK_CONTACTS.length)
      setUseMockData(true)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setFormData({ first_name: '', last_name: '', email: '', phone: '', company: '', job_title: '' })
        loadContacts()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create contact')
      }
    } catch (error) {
      console.error('Create error:', error)
      alert('Failed to create contact')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (useMockData) return
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const res = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadContacts()
      } else {
        alert('Failed to delete contact')
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const filteredContacts = statusFilter
    ? contacts.filter((c) => c.status === statusFilter)
    : contacts

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
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {total} total contacts in your CRM
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
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
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Contact
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
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Contacts Table */}
      <Card className="shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No contacts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first contact'}
            </p>
            {!search && !statusFilter && (
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Last Contact</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const statusInfo = STATUS_CONFIG[contact.status] || STATUS_CONFIG.active
                  return (
                    <TableRow key={contact.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </div>
                            {contact.job_title && (
                              <div className="text-xs text-gray-500">{contact.job_title}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {contact.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Building className="h-3.5 w-3.5 text-gray-400" />
                            {contact.company}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
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
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(contact.id)}
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
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {filteredContacts.length} of {total} contacts
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
