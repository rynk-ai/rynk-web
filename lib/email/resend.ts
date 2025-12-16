/**
 * Resend Email Client
 * 
 * Email sending utilities for magic link authentication.
 * Compatible with Cloudflare Workers runtime.
 */

import { Resend } from 'resend'

// Lazy initialization for Cloudflare Workers compatibility
let resendClient: Resend | null = null

export function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export interface SendMagicLinkParams {
  to: string
  url: string
  host: string
}

/**
 * Generate beautiful HTML email for magic link
 */
function getMagicLinkEmailHtml(url: string, host: string): string {
  // Escape any HTML in the URL for safety
  const escapedUrl = url.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Sign in to rynk.</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b; letter-spacing: -0.025em;">
                rynk.
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b; text-align: center;">
                Sign in to your account
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                Click the button below to sign in to your account. This link will expire in 24 hours.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${escapedUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">
                      Sign in to rynk.
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e4e4e7;"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #71717a; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #a1a1aa; text-align: center;">
                This link was generated from ${host}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Sub-footer -->
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          © ${new Date().getFullYear()} rynk. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Generate plain text email for magic link (fallback)
 */
function getMagicLinkEmailText(url: string, host: string): string {
  return `Sign in to rynk.

Click the link below to sign in to your account. This link will expire in 24 hours.

${url}

If you didn't request this email, you can safely ignore it.

This link was generated from ${host}
`
}

/**
 * Send magic link email via Resend
 */
export async function sendMagicLinkEmail(
  apiKey: string, 
  params: SendMagicLinkParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient(apiKey)
    
    const { error } = await resend.emails.send({
      from: 'rynk. <noreply@rynk.io>',
      to: params.to,
      subject: 'Sign in to rynk.',
      html: getMagicLinkEmailHtml(params.url, params.host),
      text: getMagicLinkEmailText(params.url, params.host),
    })
    
    if (error) {
      console.error('❌ [Resend] Failed to send magic link:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ [Resend] Magic link sent to:', params.to)
    return { success: true }
  } catch (err: any) {
    console.error('❌ [Resend] Error sending email:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}
