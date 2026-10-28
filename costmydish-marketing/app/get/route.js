import { NextResponse } from 'next/server';
import { appStoreLink, playStoreLink, siteConfig } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaign = searchParams.get('c') || 'qr';
  const ua = request.headers.get('user-agent') ?? '';

  let target = `${siteConfig.url}/#download`;
  if (/iphone|ipad|ipod/i.test(ua)) target = appStoreLink(campaign);
  else if (/android/i.test(ua)) target = playStoreLink(campaign);

  return NextResponse.redirect(target, 302);
}
