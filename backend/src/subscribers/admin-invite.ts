import { render } from '@react-email/render'
import { createElement } from 'react'
import { Modules, InviteWorkflowEvents } from '@medusajs/framework/utils'
import {
  INotificationModuleService,
  IUserModuleService,
} from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import {
  EmailTemplates,
  InviteUserEmail,
} from '../modules/email-notifications/templates'

type InviteEventData = {
  id: string
}

const normalizeUrl = (url?: string) => {
  if (!url) {
    return undefined
  }

  const trimmed = url.trim().replace(/\/$/, '')

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const getAdminUrl = () =>
  normalizeUrl(
    process.env.MEDUSA_ADMIN_INVITE_URL ||
      process.env.MEDUSA_ADMIN_URL ||
      process.env.ADMIN_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ||
      process.env.RAILWAY_PUBLIC_DOMAIN
  ) ?? 'http://localhost:9000'

const getReplyTo = () =>
  process.env.EMAIL_REPLY_TO ||
  process.env.RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM ||
  process.env.SMTP_FROM

export default async function adminInviteHandler({
  event: { data, name },
  container,
}: SubscriberArgs<InviteEventData>) {
  const notificationModuleService: INotificationModuleService =
    container.resolve(Modules.NOTIFICATION)
  const userModuleService: IUserModuleService = container.resolve(Modules.USER)

  const invite = await userModuleService.retrieveInvite(data.id)
  const inviteLink = `${getAdminUrl()}/app/invite?token=${invite.token}`
  const subject =
    name === InviteWorkflowEvents.RESENT
      ? "You've been re-invited to Medusa"
      : "You've been invited to Medusa"
  const preview = 'Accept your invitation to manage this Medusa store.'
  const html = await render(
    createElement(InviteUserEmail, { inviteLink, preview })
  )
  const text = `Accept your invitation to manage this Medusa store: ${inviteLink}`
  const replyTo = getReplyTo()

  try {
    await notificationModuleService.createNotifications({
      to: invite.email,
      channel: 'email',
      template: EmailTemplates.INVITE_USER,
      content: {
        subject,
        html,
        text,
      },
      provider_data: {
        replyTo,
      },
      data: {
        emailOptions: {
          replyTo,
          subject,
          text,
        },
        inviteLink,
        preview,
      },
      trigger_type: name,
      resource_id: invite.id,
      resource_type: 'invite',
      idempotency_key: `${name}:${invite.id}:${invite.token}`,
    })
  } catch (error) {
    console.error('Error sending admin invite notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: [InviteWorkflowEvents.CREATED, InviteWorkflowEvents.RESENT],
}
