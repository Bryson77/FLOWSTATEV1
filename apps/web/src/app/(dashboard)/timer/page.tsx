'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ArrowLeft,
  Flame,
  Radio
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/components/theme-provider';

interface CourseItem {
  id: string;
  name: string;
  code: string;
}

interface TaskItem {
  id: string;
  text: string;
}

interface AssessmentItem {
  id: string;
  title: string;
}

export default function TimerPage() {
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<'pomodoro' | 'short_break' | 'long_break' | 'stopwatch'>('pomodoro');
  const [durationSeconds, setDurationSeconds] = useState(25 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Soundscape Synthesizer
  const [activeSound, setActiveSound] = useState<'none' | 'binaural' | 'brown' | 'rain'>('none');
  const [soundVolume, setSoundVolume] = useState(0.4);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<any[]>([]);

  // Metadata
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [intention, setIntention] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delta timestamp tracking
  const targetEndTimeRef = useRef<number | null>(null);

  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [coursesRes, tasksRes, assessmentsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id).order('name'),
        supabase.from('tasks').select('id, text').eq('user_id', user.id).eq('done', false).limit(15),
        supabase.from('assessments').select('id, title').eq('user_id', user.id).order('due_date').limit(15)
      ]);

      if (coursesRes.data && coursesRes.data.length > 0) {
        const mappedCourses: CourseItem[] = coursesRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          code: c.code,
        }));
        setCourses(mappedCourses);
        setSelectedCourseId(mappedCourses[0].id);
      }
      if (tasksRes.data) {
        const mappedTasks: TaskItem[] = tasksRes.data.map((t: any) => ({
          id: t.id,
          text: t.text,
        }));
        setTasks(mappedTasks);
      }
      if (assessmentsRes.data) {
        const mappedAssessments: AssessmentItem[] = assessmentsRes.data.map((a: any) => ({
          id: a.id,
          title: a.title,
        }));
        setAssessments(mappedAssessments);
      }
    }
    loadData();
  }, [supabase]);

  // Web Audio Procedural Synthesizer (Zero external MP3 assets)
  const stopAudio = useCallback(() => {
    soundNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    soundNodesRef.current = [];
  }, []);

  const startAudio = useCallback((type: 'binaural' | 'brown' | 'rain', volume: number) => {
    stopAudio();
    if (typeof window === 'undefined') return;

    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    soundNodesRef.current.push(masterGain);

    if (type === 'binaural') {
      // 40Hz Gamma beat (left 200Hz, right 240Hz)
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);

      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(200, ctx.currentTime);
      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(240, ctx.currentTime);

      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);
      merger.connect(masterGain);

      oscL.start();
      oscR.start();
      soundNodesRef.current.push(oscL, oscR);
    } else if (type === 'brown') {
      // Brown Noise (integrated white noise)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();
      soundNodesRef.current.push(whiteNoise, filter);
    } else if (type === 'rain') {
      // Procedural Rain Simulation
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(masterGain);
      noise.start();
      soundNodesRef.current.push(noise, bandpass);
    }
  }, [stopAudio]);

  useEffect(() => {
    if (activeSound !== 'none') {
      startAudio(activeSound, soundVolume);
    } else {
      stopAudio();
    }
    return () => stopAudio();
  }, [activeSound, soundVolume, startAudio, stopAudio]);

  // Mode Selection
  const handleSelectMode = (newMode: 'pomodoro' | 'short_break' | 'long_break' | 'stopwatch') => {
    setIsRunning(false);
    setMode(newMode);
    targetEndTimeRef.current = null;

    let sec = 25 * 60;
    if (newMode === 'short_break') sec = 5 * 60;
    if (newMode === 'long_break') sec = 15 * 60;
    if (newMode === 'stopwatch') sec = 0;

    setDurationSeconds(sec);
    setSecondsRemaining(sec);
  };

  // Session Completion Handler
  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setIsSaving(true);
    stopAudio();
    setActiveSound('none');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('Session completed', 'success');
        return;
      }

      const loggedSeconds = mode === 'stopwatch' ? secondsRemaining : (durationSeconds - secondsRemaining);

      if (loggedSeconds >= 60) {
        // 1. Insert session log
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          course_id: selectedCourseId || null,
          task_id: selectedTaskId || null,
          assessment_id: selectedAssessmentId || null,
          duration_seconds: loggedSeconds,
          mode: mode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
          completed_at: new Date().toISOString(),
          notes: intention.trim() || null,
        });

        // 2. If Pomodoro (>= 25 min), invoke server-side streak maintenance function
        if (loggedSeconds >= 25 * 60) {
          await (supabase.rpc as any)('record_study_activity', {
            p_user_id: user.id,
            p_activity_type: 'session',
          });
          toast('Study session recorded. Daily streak incremented!', 'success');
        } else {
          toast('Study session recorded', 'success');
        }
      }
    } catch {
      toast('Failed to save study session', 'error');
    } finally {
      setIsSaving(false);
      handleSelectMode(mode);
    }
  }, [durationSeconds, secondsRemaining, mode, selectedCourseId, selectedTaskId, selectedAssessmentId, intention, supabase, toast, stopAudio]);

  // Delta timestamp tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      if (!targetEndTimeRef.current && mode !== 'stopwatch') {
        targetEndTimeRef.current = Date.now() + secondsRemaining * 1000;
      }

      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          setSecondsRemaining(prev => prev + 1);
        } else {
          if (targetEndTimeRef.current) {
            const diff = Math.ceil((targetEndTimeRef.current - Date.now()) / 1000);
            if (diff <= 0) {
              setSecondsRemaining(0);
              handleSessionComplete();
            } else {
              setSecondsRemaining(diff);
            }
          }
        }
      }, 500);
    } else {
      targetEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, secondsRemaining, handleSessionComplete]);

  // Format MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-white dark:bg-black text-zinc-900 dark:text-white flex flex-col justify-between p-8'
        : 'max-w-2xl mx-auto space-y-8 pb-16 text-zinc-900 dark:text-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        {isFullscreen ? (
          <button
            onClick={() => setIsFullscreen(false)}
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors btn-press"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Fullscreen
          </button>
        ) : (
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Focus Timer</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Focus sessions with ambient soundscapes and task tracking.</p>
          </div>
        )}

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {isFullscreen && (
            <div className="inline-flex items-center rounded-full p-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs font-mono">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all btn-press ${
                  theme === 'light'
                    ? 'bg-white text-black font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all btn-press ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dark
              </button>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all btn-press"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1 text-xs">
          <button
            onClick={() => handleSelectMode('pomodoro')}
            className={`py-2 rounded-xl text-xs font-medium transition-all btn-press ${
              mode === 'pomodoro' 
                ? 'bg-white text-zinc-900 dark:bg-white dark:text-black font-semibold shadow-xs' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => handleSelectMode('short_break')}
            className={`py-2 rounded-xl text-xs font-medium transition-all btn-press ${
              mode === 'short_break' 
                ? 'bg-white text-zinc-900 dark:bg-white dark:text-black font-semibold shadow-xs' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            5m Break
          </button>
          <button
            onClick={() => handleSelectMode('long_break')}
            className={`py-2 rounded-xl text-xs font-medium transition-all btn-press ${
              mode === 'long_break' 
                ? 'bg-white text-zinc-900 dark:bg-white dark:text-black font-semibold shadow-xs' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            15m Long
          </button>
          <button
            onClick={() => handleSelectMode('stopwatch')}
            className={`py-2 rounded-xl text-xs font-medium transition-all btn-press ${
              mode === 'stopwatch' 
                ? 'bg-white text-zinc-900 dark:bg-white dark:text-black font-semibold shadow-xs' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Stopwatch
          </button>
        </div>
      )}

      {/* Central Timer Clock Face */}
      <div className="text-center py-12 space-y-6">
        <div className="font-mono text-7xl sm:text-9xl font-bold tracking-tight tnum select-none text-zinc-900 dark:text-white">
          {formatTime(secondsRemaining)}
        </div>

        {/* Course & Task Tagging */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 shadow-xs">
          <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
          <span>{courses.find(c => c.id === selectedCourseId)?.name || 'General Focus'}</span>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-md btn-press bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 ml-0.5 fill-current" />
            )}
          </button>

          <button
            onClick={() => handleSelectMode(mode)}
            className="h-14 w-14 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center transition-all btn-press shadow-xs"
            title="Reset Timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Ambient Soundscapes Controls */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-white tracking-wide uppercase font-mono">
              Ambient Soundscapes
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveSound('none')}
            className={`py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
              activeSound === 'none' 
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Silent
          </button>
          <button
            onClick={() => setActiveSound('binaural')}
            className={`py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
              activeSound === 'binaural' 
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Binaural 40Hz
          </button>
          <button
            onClick={() => setActiveSound('brown')}
            className={`py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
              activeSound === 'brown' 
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Brown Noise
          </button>
          <button
            onClick={() => setActiveSound('rain')}
            className={`py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
              activeSound === 'rain' 
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Rain
          </button>
        </div>
      </div>

      {/* Course & Task Binding (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 text-left">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-white tracking-wide uppercase font-mono border-b border-zinc-200 dark:border-zinc-800 pb-2">
            Session Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              >
                <option value="">None / General</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">Attach Task</label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              >
                <option value="">None</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">Attach Assessment</label>
              <select
                value={selectedAssessmentId}
                onChange={e => setSelectedAssessmentId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              >
                <option value="">None</option>
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">Focus Notes</label>
            <input
              type="text"
              placeholder="What are you working on?"
              value={intention}
              onChange={e => setIntention(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}
