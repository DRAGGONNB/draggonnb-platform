'use client'

import Link from 'next/link'
import { Sparkles, Mail, Share2, Wand2, Bot, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const studios = [
  {
    title: 'Email Content',
    description: 'Generate compelling email subject lines, body copy, and follow-up sequences with AI',
    icon: Mail,
    href: '/content-generator/email',
    features: ['5 subject line variants', 'Short & long body copy', 'Follow-up suggestions', 'Goal-specific templates'],
  },
  {
    title: 'Social Content',
    description: 'Create platform-optimized social media posts with 3 variants per platform',
    icon: Share2,
    href: '/content-generator/social',
    features: ['3 variants per platform', 'Platform-specific guidelines', 'Hashtag suggestions', 'Image prompts & scheduling'],
  },
]

export default function ContentStudioPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Content Studio
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered content generation for email campaigns and social media
        </p>
      </div>

      <Link href="/autopilot">
        <div className="mb-6 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-amber-50/30 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-semibold text-purple-900">Want content created automatically?</p>
                <p className="text-sm text-purple-600">Try Business Autopilot — AI generates your weekly content calendar</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-purple-400" />
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studios.map((studio) => (
          <Link key={studio.href} href={studio.href}>
            <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <studio.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{studio.title}</CardTitle>
                    <CardDescription>{studio.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {studio.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wand2 className="h-3 w-3 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
