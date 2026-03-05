'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react'
import type { EmailTemplate, TemplateCategory } from '@/lib/email/types'

const categoryColors: Record<TemplateCategory, string> = {
  welcome: 'bg-green-500/10 text-green-500',
  newsletter: 'bg-blue-500/10 text-blue-500',
  promotional: 'bg-purple-500/10 text-purple-500',
  transactional: 'bg-orange-500/10 text-orange-500',
  general: 'bg-gray-500/10 text-gray-500',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setTemplates(data)
    }
    setIsLoading(false)
  }

  async function deleteTemplate(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    }
  }

  async function duplicateTemplate(template: EmailTemplate) {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) return

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single()

    if (!user?.organization_id) return

    const { error } = await supabase.from('email_templates').insert({
      organization_id: user.organization_id,
      name: `${template.name} (Copy)`,
      subject: template.subject,
      description: template.description,
      html_content: template.html_content,
      text_content: template.text_content,
      editor_json: template.editor_json,
      variables: template.variables,
      category: template.category,
      is_active: true,
    })

    if (!error) {
      loadTemplates()
    }
  }

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage reusable email templates
          </p>
        </div>
        <Link href="/email/templates/editor">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Templates</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No templates match your search' : 'No templates yet'}
              </p>
              {!searchQuery && (
                <Link href="/email/templates/editor">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first template
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {template.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={categoryColors[template.category]}
                      >
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(template.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/email/templates/editor?id=${template.id}`}>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/email/templates/${template.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
