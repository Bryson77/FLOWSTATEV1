import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Saktus',
  description: 'Get in touch with the Saktus team for feedback, questions, or bug reports.',
};

export default function ContactPage() {
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
          <span className="text-xs font-mono text-[#808080]">Student-built</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#292929] bg-[#080808] text-xs font-medium text-[#B3B3B3]">
            <MessageSquare className="h-3.5 w-3.5" />
            Direct Support
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Get in touch
          </h1>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
            Saktus is built by a student, for students. Whether you found an issue, have an idea for a feature, or want to share feedback from your study group, we want to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#292929] pt-8">
          <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">General & Feedback</h2>
            <p className="text-sm text-[#B3B3B3] leading-relaxed">
              Questions about Saktus, product ideas, or general suggestions for the study app.
            </p>
            <a
              href="mailto:support@saktus.app"
              className="inline-block text-sm font-mono text-white underline underline-offset-4 hover:text-zinc-200 pt-2"
            >
              support@saktus.app
            </a>
          </div>

          <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Bug Reports</h2>
            <p className="text-sm text-[#B3B3B3] leading-relaxed">
              Notice a glitch with timer sync, flashcard flip, or timetable display? Tell us what went wrong.
            </p>
            <a
              href="mailto:bugs@saktus.app"
              className="inline-block text-sm font-mono text-white underline underline-offset-4 hover:text-zinc-200 pt-2"
            >
              bugs@saktus.app
            </a>
          </div>
        </div>

        <div className="border-t border-[#292929] pt-8 space-y-2">
          <p className="text-xs text-[#808080]">
            Saktus was formerly known as FlowState Productivity. All communications sent to previous addresses continue to be routed properly.
          </p>
        </div>
      </main>
    </div>
  );
}
