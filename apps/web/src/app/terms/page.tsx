import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Saktus',
  description: 'Terms and conditions for using the Saktus study platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans">
      <header className="border-b border-[#292929] px-6 py-4 bg-[#000000]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[#B3B3B3] hover:text-white transition-colors btn-press"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Saktus
          </Link>
          <span className="text-xs font-mono text-[#808080]">Last updated: October 2026</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#292929] bg-[#080808] text-xs font-medium text-[#B3B3B3]">
            <FileText className="h-3.5 w-3.5" />
            Legal Terms
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
            Welcome to Saktus. By using our website and application, you agree to these clear and straightforward terms.
          </p>
        </div>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">1. Core Free Model</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            Saktus is provided free of charge for students. There are no paid subscription walls, no trial expirations, and no hidden credit card requirements to access the core study tools and social features.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">2. Acceptable Use</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            Saktus is designed to foster a focused and supportive study environment. You agree to use the service in good faith for your coursework, revision, and academic routines. Harassment, abuse, sharing of malicious content, or disruptive behavior within study rooms is strictly prohibited.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">3. Your Content & Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            You retain all rights and ownership of the notes, flashcard decks, and timetable schedules you create on Saktus. When you share a flashcard deck with friends, you grant them permission to view and study that material within the app.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">4. Availability & Changes</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            Saktus is actively maintained and evolved. We continuously introduce improvements, fixes, and new features to serve student needs. While we strive for maximum reliability, the service is provided as-is without warranties of uninterrupted availability.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">5. Inquiries</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            For questions about these terms, please visit our{' '}
            <Link href="/contact" className="text-white underline underline-offset-4 hover:text-zinc-200">
              contact page
            </Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
