import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_SUPABASE_URL = 'https://tyvwwgigdgcnpjceiavq.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dnd3Z2lnZGdjbnBqY2VpYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTkwNDcsImV4cCI6MjA4ODgzNTA0N30.Audya4V6ysi38dxBEDDCkAswVO60g5Q4X1iJcXQu7QI';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage =
    request.nextUrl.pathname.startsWith('/home') ||
    request.nextUrl.pathname.startsWith('/timetable') ||
    request.nextUrl.pathname.startsWith('/exams') ||
    request.nextUrl.pathname.startsWith('/flashcards') ||
    request.nextUrl.pathname.startsWith('/timer') ||
    request.nextUrl.pathname.startsWith('/friends') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/settings');

  const host = request.headers.get('host') || '';
  const isAppSubdomain = host.startsWith('app.');

  // If user visits root of app subdomain (e.g. app.flowstateproductivity.xyz/), route to dashboard if logged in, else login
  if (isAppSubdomain && request.nextUrl.pathname === '/') {
    const destination = user ? '/home' : '/login';
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie: any) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // If user is not authenticated and trying to access dashboard routes, redirect to login preserving destination
  if (!user && isDashboardPage) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set(
      'redirect',
      request.nextUrl.pathname + request.nextUrl.search
    );
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie: any) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // If user is already authenticated and visits login, redirect to target or home
  if (user && isAuthPage) {
    const target = request.nextUrl.searchParams.get('redirect');
    const safeTarget =
      target && target.startsWith('/') && !target.startsWith('//')
        ? target
        : '/home';
    const redirectResponse = NextResponse.redirect(new URL(safeTarget, request.url));
    response.cookies.getAll().forEach((cookie: any) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
