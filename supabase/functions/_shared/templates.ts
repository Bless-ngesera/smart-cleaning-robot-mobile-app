// supabase/functions/_shared/templates.ts
// Shared HTML email template utilities

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch {
        return iso;
    }
}

export function formatRelativeTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const minutes = Math.floor(diff / 60_000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    } catch {
        return iso;
    }
}

const SHARED_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;padding:24px}
  .shell{max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
  .hdr{background:linear-gradient(135deg,#10B981,#059669);padding:32px 28px;text-align:center;color:#fff}
  .hdr.red{background:linear-gradient(135deg,#EF4444,#DC2626)}
  .hdr.amber{background:linear-gradient(135deg,#F59E0B,#D97706)}
  .hdr.blue{background:linear-gradient(135deg,#3B82F6,#2563EB)}
  .hdr.purple{background:linear-gradient(135deg,#8B5CF6,#7C3AED)}
  .hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .hdr p{font-size:14px;opacity:.85}
  .body{background:#fff;padding:32px 28px}
  .body h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#111827}
  .icon-wrap{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
  .stats{display:flex;gap:12px;margin:20px 0}
  .stat{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center}
  .stat-num{font-size:24px;font-weight:800;color:#10B981}
  .stat-lbl{font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
  .alert-box{background:#FEF2F2;border-left:4px solid #EF4444;border-radius:8px;padding:18px;margin:20px 0}
  .warn-box{background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:8px;padding:18px;margin:20px 0}
  .success-box{background:#ECFDF5;border-left:4px solid #10B981;border-radius:8px;padding:18px;margin:20px 0}
  .info-box{background:#EFF6FF;border-left:4px solid #3B82F6;border-radius:8px;padding:18px;margin:20px 0}
  .btn{display:inline-block;background:#10B981;color:#fff!important;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;margin-top:20px;letter-spacing:.3px}
  .btn.red{background:#EF4444}
  .btn.blue{background:#3B82F6}
  .note{font-size:13px;color:#6b7280;line-height:1.65;margin-top:16px}
  .link-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-top:14px;word-break:break-all;font-size:11.5px;color:#374151;font-family:monospace}
  .divider{border:none;border-top:1px solid #f3f4f6;margin:24px 0}
  .ftr{background:#f3f4f6;padding:20px 28px;text-align:center;font-size:12px;color:#9ca3af}
  .ftr a{color:#10B981;text-decoration:none}
  ul{padding-left:18px;margin-top:8px}
  li{margin-bottom:6px;font-size:14px;color:#374151}
  p{font-size:15px;line-height:1.65;color:#374151}
`;

export function baseTemplate(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${SHARED_CSS}</style>
</head>
<body>
<div class="shell">${content}</div>
</body>
</html>`;
}

export const FOOTER = `
  <div class="ftr">
    <p>Smart Cleaner Pro &bull; <a href="mailto:hello@smartcleanerpro.online">hello@smartcleanerpro.online</a></p>
    <p style="margin-top:6px">&copy; 2026 Smart Cleaner Pro. All rights reserved.</p>
  </div>`;
