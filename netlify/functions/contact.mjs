// Contact form handler (Netlify Functions v2).
// Validates the inquiry server-side, filters spam, and forwards a clean JSON
// payload to a webhook (n8n, a CRM, Zapier, ...). Configure in Netlify:
//   CONTACT_WEBHOOK_URL     required  destination URL for inquiries
//   CONTACT_WEBHOOK_SECRET  optional  sent as X-Webhook-Secret and used to sign
//                                     the body (X-Webhook-Signature: sha256=<hex>)
// Secrets live only in environment variables, never in frontend code.
import { createHmac } from 'node:crypto';

export const config = { path: '/api/contact' };

const INTERESTS = ['Self-Directed IRA', 'Self-Directed 401(k)', 'Account Setup', 'General Question'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-.\s\d]{7,30}$/;
const SSN_RE = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/;
const MIN_FILL_MS = 3000;

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

export function validate(input) {
  const data = {
    name: clean(input.name, 100),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 30),
    interest: clean(input.interest, 40),
    message: clean(input.message, 2000),
    consent: input.consent === true || input.consent === 'yes' || input.consent === 'on',
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Please enter a valid phone number, or leave this blank.';
  if (!INTERESTS.includes(data.interest)) data.interest = 'General Question';
  if (SSN_RE.test(data.message)) errors.message = 'Please remove any Social Security or account numbers from your message.';
  if (!data.consent) errors.consent = 'Please confirm we may contact you about your inquiry.';
  return { data, errors };
}

export function isSpam(input, now = Date.now()) {
  if (clean(input.website, 200)) return true; // honeypot filled
  const started = Number(input.started);
  return !Number.isFinite(started) || started <= 0 || now - started < MIN_FILL_MS;
}

async function readBody(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) return req.json();
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}

export default async (req) => {
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  // Plain HTML form posts (no JavaScript) are redirected back to an on-page message.
  const reply = (status, body) => wantsJson
    ? Response.json(body, { status })
    : new Response(null, { status: 303, headers: { Location: status < 300 ? '/#inquiry-sent' : '/#inquiry-error' } });

  if (req.method !== 'POST') {
    return Response.json({ message: 'Method not allowed.' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let input;
  try {
    input = await readBody(req);
  } catch {
    return reply(400, { message: 'Invalid request.' });
  }

  // Silently accept spam so bots get no signal, but never forward it.
  if (isSpam(input)) return reply(200, { ok: true });

  const { data, errors } = validate(input);
  if (Object.keys(errors).length) {
    return reply(422, { message: 'Please review the highlighted fields.', errors });
  }

  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('CONTACT_WEBHOOK_URL is not configured; inquiry not delivered.');
    return reply(503, { message: 'Our inquiry form is temporarily unavailable. Please try again later.' });
  }

  const payload = JSON.stringify({
    type: 'website_inquiry',
    source: 'selfdirected401kdallas-website',
    submitted_at: new Date().toISOString(),
    ...data,
    consent_text: 'I agree that Self Directed 401k Dallas may contact me by email or phone about this inquiry.',
    page: req.headers.get('referer') || null,
    // SMS marketing consent is NOT collected here and must not be inferred.
    sms_marketing_consent: false,
  });

  const headers = { 'Content-Type': 'application/json' };
  const secret = process.env.CONTACT_WEBHOOK_SECRET;
  if (secret) {
    headers['X-Webhook-Secret'] = secret;
    headers['X-Webhook-Signature'] = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  try {
    const res = await fetch(webhookUrl, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  } catch (err) {
    console.error('Inquiry webhook failed:', err.message);
    return reply(502, { message: 'We couldn’t send your inquiry right now. Please try again shortly.' });
  }

  return reply(200, { ok: true, message: 'Thank you for reaching out. Your inquiry has been received.' });
};
