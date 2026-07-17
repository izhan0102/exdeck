/**
 * Branded transactional email templates (welcome). Table-based + inline
 * styles for broad client support; the EXdeck logo is pure HTML/CSS so it
 * never gets blocked by "images off".
 */

export function welcomeSubject(): string {
  return "Welcome to EXdeck 👋";
}

export function welcomeText(name: string): string {
  const hi = name ? `Hi ${name},` : "Hi there,";
  return `${hi}

Welcome to EXdeck — the fastest way to turn an idea into a finished, editable presentation.

Here's how to start:
1. Type a one-line brief (e.g. "Series A pitch for a logistics startup").
2. Pick a theme. EXdeck writes and designs the whole deck in seconds.
3. Edit anything inline, then export to real PowerPoint or PDF.

Jump in: https://exdeck.xyz/app

If you ever get stuck, just reply to this email.

— The EXdeck team
exdeck.xyz`;
}

export function welcomeHtml(name: string): string {
  const hi = name ? `Hi ${name.replace(/</g, "")},` : "Hi there,";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to EXdeck</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ececec">
        <tr><td style="padding:26px 32px 18px;border-bottom:1px solid #f0f0f0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#000000;border-radius:9px;color:#ffffff;font-size:15px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,sans-serif">EX</td>
              <td style="padding-left:10px;font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#000000">EX<span style="color:#9a9a9a">deck</span></td>
            </tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 8px">
          <p style="margin:0 0 16px;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#000">Welcome to EXdeck 👋</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#1a1a1a">${hi}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#1a1a1a">You're in. EXdeck turns a one-line brief into a finished, editable presentation in seconds — real charts, premium themes, and one-click PowerPoint &amp; PDF export.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="padding:2px 0;font-size:15px;line-height:1.7;color:#1a1a1a">1&nbsp;&nbsp;Type a one-line brief</td></tr>
          <tr><td style="padding:2px 0;font-size:15px;line-height:1.7;color:#1a1a1a">2&nbsp;&nbsp;Pick a theme — EXdeck writes &amp; designs it</td></tr>
          <tr><td style="padding:2px 0;font-size:15px;line-height:1.7;color:#1a1a1a">3&nbsp;&nbsp;Edit inline, then export</td></tr></table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px"><tr>
            <td align="center" style="border-radius:999px;background:#000000">
              <a href="https://exdeck.xyz/app" target="_blank" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">Create your first deck →</a>
            </td>
          </tr></table>
          <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#555">Stuck on anything? Just reply to this email.</p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;border-top:1px solid #f0f0f0">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9a9a">Sent because you created an EXdeck account · <a href="https://exdeck.xyz" style="color:#9a9a9a">exdeck.xyz</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#b5b5b5">© ${new Date().getFullYear()} EXdeck</p>
    </td></tr>
  </table>
</body></html>`;
}
