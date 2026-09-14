import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/components/theme-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://saktus.app'),
  title: {
    default: 'Saktus — Productivity app for students',
    template: '%s | Saktus',
  },
  description: 'Weekly schedule, exams, flashcards, focus timer, and study rooms in one place.',
  keywords: [
    'student productivity',
    'study app',
    'spaced repetition',
    'pomodoro focus timer',
    'exam countdown',
    'university timetable',
    'SM-2 flashcards',
  ],
  authors: [{ name: 'Saktus', url: 'https://saktus.app' }],
  creator: 'Saktus',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Saktus — Productivity app for students',
    description: 'Weekly schedule, exams, flashcards, focus timer, and study rooms in one place.',
    url: 'https://saktus.app',
    siteName: 'Saktus',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Saktus App Icon',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Saktus — Productivity app for students',
    description: 'Weekly schedule, exams, flashcards, focus timer, and study rooms in one place.',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('saktus_theme');
                if (storedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-white text-zinc-900 dark:bg-black dark:text-white antialiased font-sans transition-colors duration-150 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
