'use client';

import { useState } from 'react';
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock, Trash2, Award } from 'lucide-react';

interface AssessmentItem {
  id: string;
  course: string;
  code: string;
  title: string;
  type: 'exam' | 'test' | 'assignment' | 'project';
  dueDate: string;
  weight: number;
  targetHours: number;
  loggedHours: number;
  completed: boolean;
}

const INITIAL_ASSESSMENTS: AssessmentItem[] = [
  {
    id: '1',
    course: 'Computer Science',
    code: 'CSC2001F',
    title: 'Midterm Exam 1: Data Structures',
    type: 'exam',
    dueDate: '2026-09-18',
    weight: 25,
    targetHours: 15,
    loggedHours: 6.5,
    completed: false
  },
  {
    id: '2',
    course: 'Linear Algebra',
    code: 'MTH2000S',
    title: 'Assignment 3: Eigenvalues & Vectors',
    type: 'assignment',
    dueDate: '2026-09-24',
    weight: 10,
    targetHours: 8,
    loggedHours: 4,
    completed: false
  },
  {
    id: '3',
    course: 'Database Systems',
    code: 'INF2006F',
    title: 'Final Project Submission',
    type: 'project',
    dueDate: '2026-10-05',
    weight: 35,
    targetHours: 30,
    loggedHours: 12,
    completed: false
  }
];

export default function ExamsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>(INITIAL_ASSESSMENTS);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('Computer Science');
  const [code, setCode] = useState('CSC2001F');
  const [type, setType] = useState<'exam' | 'test' | 'assignment' | 'project'>('exam');
  const [dueDate, setDueDate] = useState('');
  const [weight, setWeight] = useState(20);
  const [targetHours, setTargetHours] = useState(10);

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(targetDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newItem: AssessmentItem = {
      id: Date.now().toString(),
      course,
      code: code || 'GEN101',
      title,
      type,
      dueDate,
      weight: Number(weight),
      targetHours: Number(targetHours),
      loggedHours: 0,
      completed: false
    };

    setAssessments([newItem, ...assessments]);
    setIsAdding(false);
    setTitle('');
  };

  const toggleComplete = (id: string) => {
    setAssessments(assessments.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const handleDelete = (id: string) => {
    setAssessments(assessments.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Upcoming</h1>
          <p className="mt-1 text-[#A0A0A0]">Exams, tests, and weighted deliverables.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:scale-105 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Assessment
        </button>
      </div>

      {/* Inline Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-[40px] saturate-[150%] space-y-4">
          <h3 className="font-display text-lg font-semibold text-white">Add Upcoming Assessment</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Title</label>
              <input
                type="text"
                placeholder="e.g. Midterm Test 1"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Course Code</label>
              <input
                type="text"
                placeholder="e.g. CSC2001F"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              >
                <option value="exam" className="bg-zinc-900 text-white">Exam</option>
                <option value="test" className="bg-zinc-900 text-white">Test</option>
                <option value="assignment" className="bg-zinc-900 text-white">Assignment</option>
                <option value="project" className="bg-zinc-900 text-white">Project</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Weighting (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Target Study (Hours)</label>
              <input
                type="number"
                min="1"
                value={targetHours}
                onChange={e => setTargetHours(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-full px-4 py-2 text-xs font-medium text-[#A0A0A0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors"
            >
              Save Assessment
            </button>
          </div>
        </form>
      )}

      {/* Assessment Cards List */}
      <div className="grid gap-4">
        {assessments.map(item => {
          const daysLeft = getDaysRemaining(item.dueDate);
          const isUrgent = daysLeft <= 7 && daysLeft >= 0;
          const isOverdue = daysLeft < 0;
          const progressPercent = Math.min(100, Math.round((item.loggedHours / item.targetHours) * 100));

          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-5 sm:p-6 transition-all hover:bg-[rgba(255,255,255,0.05)] ${
                item.completed
                  ? 'border-white/5 opacity-60'
                  : isUrgent
                  ? 'border-red-500/30'
                  : 'border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleComplete(item.id)}
                    className={`mt-0.5 rounded-full p-1 transition-colors ${
                      item.completed
                        ? 'text-white'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#A0A0A0] font-medium tracking-wide uppercase">{item.code}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 capitalize">{item.type}</span>
                      <span className="text-xs text-zinc-400">{item.weight}% of final grade</span>
                    </div>

                    <h3 className={`text-lg font-semibold mt-1 text-white ${item.completed ? 'line-through text-zinc-400' : ''}`}>
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-4 mt-2 text-xs text-[#A0A0A0]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Due {new Date(item.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{item.loggedHours}h / {item.targetHours}h study hours</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side urgency pill & delete */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
                  <div className="flex items-center gap-2">
                    {!item.completed && (
                      <span
                        className={`rounded-full px-3 py-1 font-mono text-xs font-semibold ${
                          isOverdue
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isUrgent
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/10 text-white border border-white/10'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft} days left`}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Micro study progress bar */}
                  <div className="w-28 mt-2">
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
