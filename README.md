# Saktus

**Saktus** is a productivity app for students. Weekly schedule, exams & deadlines, spaced repetition flashcards, focus timer, and study rooms in one place.

---

## Overview

Saktus helps university and college students manage coursework and study sessions effectively:
- **Weekly Schedule**: 7-day timetable with class times, venues, and countdowns.
- **Exams & Deadlines**: Assessment tracker with grade weightings, due dates, and study targets.
- **Flashcards (SM-2)**: Active recall decks with spaced repetition algorithms.
- **Focus Timer**: Focus timer with soundscapes and target attachment (Course, Task, Assessment).
- **Study Rooms & Friends**: Synchronized focus sessions, friend activity, and room codes.

---

## Apps & Architecture

- `apps/web`: Next.js 15 application with Tailwind CSS and dual-theme support (Pure White / OLED Black).
- `apps/mobile`: React Native / Expo application with full tab navigation, auth, schedule, flashcards, timer, and social.
- `apps/api`: Hono API on Cloudflare Workers.
- `supabase`: PostgreSQL schema, procedures, RLS policies, and migrations.

Whether studying for exams, tracking weekly classes, or completing coursework, Saktus aims to make student productivity effortless.

---

## Author

Created by **Lethabo Mabilo**
