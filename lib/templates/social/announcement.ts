import type { SocialTemplate } from '../types'

interface AnnouncementData {
  headline: string
  description: string
  url: string
  clientName?: string
}

export function announcementLinkedIn(data: AnnouncementData): SocialTemplate {
  const hook = data.clientName
    ? `Excited to welcome ${data.clientName} to the DraggonnB family.`
    : `Big news from DraggonnB OS.`

  return {
    platform: 'linkedin',
    caption: `${hook}

${data.headline}

${data.description}

Built for South African businesses that are ready to grow smarter, not harder.

What is the one tool your business cannot do without? Let us know in the comments.

${data.url}`,
    hashtags: [
      '#DraggonnB',
      '#SouthAfricanBusiness',
      '#CRM',
      '#MarketingAutomation',
      '#GrowthTools',
    ],
  }
}

export function announcementFacebook(data: AnnouncementData): SocialTemplate {
  const hook = data.clientName
    ? `Welcome aboard, ${data.clientName}!`
    : `Something new just dropped.`

  return {
    platform: 'facebook',
    caption: `${hook}

${data.headline} -- ${data.description}

Check it out: ${data.url}`,
    hashtags: ['#DraggonnB', '#MadeInSA', '#BusinessGrowth'],
  }
}

export function announcementInstagram(data: AnnouncementData): SocialTemplate {
  const hook = data.clientName
    ? `Welcome to the family, ${data.clientName}.`
    : `New drop alert.`

  return {
    platform: 'instagram',
    caption: `${hook}

${data.headline}

${data.description}

Link in bio.`,
    hashtags: [
      '#DraggonnB',
      '#SouthAfrica',
      '#BusinessTools',
      '#CRM',
      '#MarketingPlatform',
      '#SmallBusiness',
      '#Entrepreneur',
      '#GrowYourBusiness',
      '#SaaS',
      '#TechSA',
      '#DigitalMarketing',
      '#StartupLife',
    ],
  }
}

export function announcementTwitter(data: AnnouncementData): SocialTemplate {
  const hook = data.clientName
    ? `Welcome ${data.clientName} to DraggonnB!`
    : `New from DraggonnB OS:`

  return {
    platform: 'twitter',
    caption: `${hook} ${data.headline}

${data.url}`,
    hashtags: ['#DraggonnB', '#SouthAfricanTech'],
  }
}
