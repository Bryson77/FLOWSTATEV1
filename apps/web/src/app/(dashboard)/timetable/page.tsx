'use client';

import { useState } from 'react';
import { Plus, Clock, MapPin, Sparkles, BookOpen, Trash2 } from 'lucide-react';

interface ClassItem {
  id: string;
  subject: string;
  code: string;
  venue: string;
  day: number; // 1 = Mon, 5 = Fri
  startTime: string;
  endTime: string;
  color: string;
  type: 'lecture' | 'tutorial' | 'lab';
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

const INITIAL_CLASSES: ClassItem[] = [
  {
    id: '1',
    subject: 'Computer Science',
    code: 'CSC2001F',
    venue: 'Science Block LT2',
    day: 1,
    startTime: '09:00',
    endTime: '10:30',
    color: '#3B82F6',
    type: 'lecture'
  },
  {
    id: '2',
    subject: 'Linear Algebra',
    code: 'MTH2000S',
    venue: 'Maths Building Room 4',
    day: 2,
    startTime: '11:00',
    endTime: '12:30',
    color: '#8B5CF6',
    type: 'lecture'
  },
  {
    id: '3',
    subject: 'Algorithms Lab',
    code: 'CSC2001F',
    venue: 'Computer Lab 3',
    day: 4,
    startTime: '14:00',
    endTime: '16:00',
    color: '#3B82F6',
    type: 'lab'
  }
];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newDay, setNewDay] = useState(1);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:30');
  const [newType, setNewType] = useState<'lecture' | 'tutorial' | 'lab'>('lecture');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const newItem: ClassItem = {
      id: Date.now().toString(),
      subject: newSubject,
      code: newCode || newSubject.slice(0, 3).toUpperCase() + '101',
      venue: newVenue || 'Main Hall',
      day: Number(newDay),
      startTime: newStartTime,
      endTime: newEndTime,
      color: newType === 'lab' ? '#6366F1' : newType === 'tutorial' ? '#F59E0B' : '#3B82F6',
      type: newType
    };

    setClasses([...classes, newItem]);
    setIsAdding(false);
    setNewSubject('');
    setNewCode('');
    setNewVenue('');
  };

  const handleDelete = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header with quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Timetable</h1>
          <p className="mt-1 text-[#A0A0A0]">Weekly class schedule and venue coordinates.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:scale-105 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      </div>

      {/* Add Class Inline Form Drawer */}
      {isAdding && (
        <form onSubmit={handleAddClass} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-[40px] saturate-[150%] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">New Class Entry</h3>
            <span className="text-xs text-[#A0A0A0]">Synced to cloud profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Subject / Course Name</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Course Code</label>
              <input
                type="text"
                placeholder="e.g. CSC2001F"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Venue / Room</label>
              <input
                type="text"
                placeholder="e.g. Science LT2"
                value={newVenue}
                onChange={e => setNewVenue(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Day</label>
              <select
                value={newDay}
                onChange={e => setNewDay(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              >
                {DAYS.map((day, idx) => (
                  <option key={day} value={idx + 1} className="bg-zinc-900 text-white">{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Class Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              >
                <option value="lecture" className="bg-zinc-900 text-white">Lecture</option>
                <option value="tutorial" className="bg-zinc-900 text-white">Tutorial</option>
                <option value="lab" className="bg-zinc-900 text-white">Lab</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">Start Time</label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1.5 font-medium">End Time</label>
              <input
                type="time"
                value={newEndTime}
                onChange={e => setNewEndTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-full px-4 py-2 text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors"
            >
              Save to Timetable
            </button>
          </div>
        </form>
      )}

      {/* Timetable Grid View */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] backdrop-blur-[40px] p-6">
        <div className="min-w-[640px]">
          {/* Days Header */}
          <div className="grid grid-cols-5 gap-3 border-b border-white/10 pb-4">
            {DAYS.map((day, idx) => (
              <div key={day} className="text-center">
                <span className="text-sm font-semibold tracking-wide text-white uppercase">{day}</span>
                <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                  {classes.filter(c => c.day === idx + 1).length} scheduled
                </p>
              </div>
            ))}
          </div>

          {/* Schedule Matrix */}
          <div className="grid grid-cols-5 gap-3 pt-4 min-h-[380px]">
            {DAYS.map((day, idx) => {
              const dayClasses = classes.filter(c => c.day === idx + 1);
              return (
                <div key={day} className="space-y-3">
                  {dayClasses.length === 0 ? (
                    <div className="h-full min-h-[140px] rounded-xl border border-dashed border-white/5 flex items-center justify-center p-3">
                      <span className="text-xs text-zinc-600">Free day</span>
                    </div>
                  ) : (
                    dayClasses.map(item => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-3.5 transition-all hover:scale-[1.02] hover:border-white/20 hover:bg-[rgba(255,255,255,0.07)]"
                        style={{ borderLeftColor: item.color, borderLeftWidth: '3px' }}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0]">{item.code}</span>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <h4 className="font-semibold text-sm text-white mt-1 leading-snug">{item.subject}</h4>
                        <div className="mt-3 space-y-1 text-xs text-[#A0A0A0]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            <span className="font-mono text-[11px]">{item.startTime} - {item.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-zinc-400" />
                            <span className="truncate">{item.venue}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
