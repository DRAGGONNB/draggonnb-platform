import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';
import { Resend } from 'resend';
import { sendTextMessage } from '../../../lib/whatsapp/client';

export async function sendOnboardingSequence(job: ProvisioningJob): Promise<ProvisioningResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('  RESEND_API_KEY not set, skipping onboarding emails');
    return {
      success: true,
      step: 'onboarding-sequence',
      data: { onboardingEmailIds: '' },
    };
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'noreply@draggonnb.online';
  const deploymentUrl = job.createdResources?.vercelDeploymentUrl || '';
  const emailIds: string[] = [];

  // Email 1: Welcome (immediate)
  try {
    const welcomeResult = await resend.emails.send({
      from: fromAddress,
      to: job.orgEmail,
      subject: `Welcome to DraggonnB, ${job.clientName}!`,
      reply_to: 'support@draggonnb.online',
      html: buildWelcomeEmail(job.clientName, job.tier, deploymentUrl),
    });
    if (welcomeResult.data?.id) {
      emailIds.push(welcomeResult.data.id);
      console.log(`  Sent welcome email: ${welcomeResult.data.id}`);
    }
  } catch (err) {
    console.warn('  Warning: failed to send welcome email:', err);
  }

  // Email 2: Getting Started (+1 day delay -- sent now, actual scheduling via N8N cron)
  try {
    const gettingStartedResult = await resend.emails.send({
      from: fromAddress,
      to: job.orgEmail,
      subject: `Getting Started with DraggonnB - ${job.clientName}`,
      reply_to: 'support@draggonnb.online',
      html: buildGettingStartedEmail(job.clientName, deploymentUrl),
    });
    if (gettingStartedResult.data?.id) {
      emailIds.push(gettingStartedResult.data.id);
      console.log(`  Sent getting-started email: ${gettingStartedResult.data.id}`);
    }
  } catch (err) {
    console.warn('  Warning: failed to send getting-started email:', err);
  }

  // Email 3: First Automation (+3 day delay -- sent now, actual scheduling via N8N cron)
  try {
    const automationResult = await resend.emails.send({
      from: fromAddress,
      to: job.orgEmail,
      subject: `Set Up Your First Automation - ${job.clientName}`,
      reply_to: 'support@draggonnb.online',
      html: buildFirstAutomationEmail(job.clientName, deploymentUrl),
    });
    if (automationResult.data?.id) {
      emailIds.push(automationResult.data.id);
      console.log(`  Sent first-automation email: ${automationResult.data.id}`);
    }
  } catch (err) {
    console.warn('  Warning: failed to send first-automation email:', err);
  }

  // WhatsApp welcome message (non-fatal, requires phone number in job config)
  const ownerPhone = (job.clientConfig as unknown as Record<string, unknown>)?.ownerPhone as string | undefined;
  if (ownerPhone && process.env.WHATSAPP_ACCESS_TOKEN) {
    try {
      const subdomain = job.clientId;
      const dashboardUrl = `https://${subdomain}.draggonnb.co.za/dashboard`;
      await sendTextMessage(ownerPhone,
        `Welcome to DraggonnB, ${job.clientName}!\n\n` +
        `Your ${job.tier} plan is active and ready.\n\n` +
        `Dashboard: ${dashboardUrl}\n\n` +
        `Reply here anytime for support. We're here to help you grow!`
      );
      console.log(`  Sent WhatsApp welcome to ${ownerPhone}`);
    } catch (waErr) {
      console.warn('  Warning: failed to send WhatsApp welcome:', waErr);
    }
  }

  return {
    success: true,
    step: 'onboarding-sequence',
    data: { onboardingEmailIds: emailIds.join(',') },
  };
}

function buildWelcomeEmail(clientName: string, tier: string, deploymentUrl: string): string {
  const loginLink = deploymentUrl ? `<p><a href="${deploymentUrl}/login">Log in to your dashboard</a></p>` : '';
  return `
    <h1>Welcome to DraggonnB, ${clientName}!</h1>
    <p>Your ${tier} plan is now active and your platform is ready to go.</p>
    ${loginLink}
    <p>Here is what you can do right away:</p>
    <ul>
      <li>Import your contacts and leads</li>
      <li>Set up your email templates</li>
      <li>Configure your brand settings</li>
    </ul>
    <p>If you have any questions, reply to this email and our team will help you out.</p>
    <p>-- The DraggonnB Team</p>
  `;
}

function buildGettingStartedEmail(clientName: string, deploymentUrl: string): string {
  const dashboardLink = deploymentUrl ? `<p><a href="${deploymentUrl}/dashboard">Go to your dashboard</a></p>` : '';
  return `
    <h1>Getting Started with DraggonnB</h1>
    <p>Hi ${clientName},</p>
    <p>Here is how to set up your dashboard and make the most of your platform:</p>
    ${dashboardLink}
    <ol>
      <li><strong>Contacts:</strong> Import your existing contacts via CSV or add them manually.</li>
      <li><strong>Deals:</strong> Create your first deal pipeline to track opportunities.</li>
      <li><strong>Email:</strong> Set up your first email campaign template.</li>
      <li><strong>Branding:</strong> Customize your brand colors and logo in Settings.</li>
    </ol>
    <p>Need help? Reply to this email or check our documentation.</p>
    <p>-- The DraggonnB Team</p>
  `;
}

function buildFirstAutomationEmail(clientName: string, deploymentUrl: string): string {
  const automationLink = deploymentUrl ? `<p><a href="${deploymentUrl}/dashboard">Set up automations</a></p>` : '';
  return `
    <h1>Set Up Your First Automation</h1>
    <p>Hi ${clientName},</p>
    <p>Automations save you hours every week. Here is how to get started:</p>
    ${automationLink}
    <ol>
      <li><strong>Lead Capture:</strong> Automatically qualify new leads as they come in.</li>
      <li><strong>Email Drips:</strong> Set up automated follow-up sequences.</li>
      <li><strong>Social Scheduling:</strong> Plan your content calendar in advance.</li>
    </ol>
    <p>Your platform is designed to handle the repetitive work so you can focus on growing your business.</p>
    <p>-- The DraggonnB Team</p>
  `;
}
