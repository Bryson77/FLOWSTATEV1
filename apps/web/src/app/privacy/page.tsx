import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Saktus',
  description: 'How Saktus handles student data, study logs, and social sharing permissions.',
};

export default function PrivacyPage() {
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
            <Shield className="h-3.5 w-3.5" />
            Privacy & Trust
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
            Saktus is built for university and school students. We believe your study habits, personal schedules, and revision materials belong to you.
          </p>
        </div>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            When you create an account on Saktus, we collect your email address and basic profile information (such as your full name or nickname). As you use the application, we store the content you create to make the study system work: study schedules, flashcards, exams, and focus timer session logs.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">2. Private by Default</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            Your study activity, timetables, and flashcard decks are private by default. Nothing is broadcast to the public. If you choose to join a study room or connect with friends, only the members of that room can see your current study status and chosen weekly study time comparison.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">3. How We Use Data</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            We use your information exclusively to provide, maintain, and improve Saktus study features. We never sell your personal information or study history to advertisers, data brokers, or third parties.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">4. Data Deletion & Export</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            You have full control over your study data. You can delete decks, clear schedule entries, or request permanent deletion of your account and associated records at any time through your settings or by contacting us.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#292929] pt-8">
          <h2 className="text-xl font-semibold text-white">5. Contact Regarding Privacy</h2>
          <p className="text-sm leading-relaxed text-[#B3B3B3]">
            If you have questions about privacy practices or wish to request data removal, reach out via our{' '}
            <Link href="/contact" className="text-white underline underline-offset-4 hover:text-zinc-200">
              contact page
            </Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
