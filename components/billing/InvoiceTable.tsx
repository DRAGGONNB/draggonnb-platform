'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number // cents
  status: string
  issuedAt: string
  paidAt?: string
}

interface InvoiceTableProps {
  invoices: Invoice[]
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200',
  },
  issued: {
    label: 'Issued',
    className: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200',
  },
}

function formatCents(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-gray-500">No invoices yet</p>
        <p className="text-xs text-gray-400">Invoices will appear here after your first billing cycle</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-medium text-gray-500">Invoice #</TableHead>
          <TableHead className="text-xs font-medium text-gray-500">Date</TableHead>
          <TableHead className="text-xs font-medium text-gray-500">Amount</TableHead>
          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
          <TableHead className="text-right text-xs font-medium text-gray-500">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const statusInfo = statusConfig[invoice.status] || statusConfig.draft
          return (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium text-gray-900">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell className="text-gray-600">
                {new Date(invoice.issuedAt).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              <TableCell className="font-medium text-gray-900">
                {formatCents(invoice.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
                  title="Download invoice"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="sr-only">Download</span>
                </button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
