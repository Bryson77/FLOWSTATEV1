"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Layers,
  Search,
  Share2,
  X,
  Sparkles,
  GraduationCap,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import { createDeckSchema, validateWithZod } from "@/lib/schemas";
import { groupDecksByCourse } from "@saktus/shared";
import type { Course, FlashcardDeck } from "@saktus/shared";
import { getLocalISODate } from "@saktus/study-engine";
import type {
  EnhancedDeck,
  EnhancedCard,
  CourseOption,
  LibraryTab,
} from "./types";

export default function FlashcardsLibraryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [libraryTab, setLibraryTab] = useState<LibraryTab>("my");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Decks & Data
  const [myDecks, setMyDecks] = useState<EnhancedDeck[]>([]);
  const [savedDecks, setSavedDecks] = useState<EnhancedDeck[]>([]);
  const [sharedDecks, setSharedDecks] = useState<EnhancedDeck[]>([]);
  const [discoverDecks, setDiscoverDecks] = useState<EnhancedDeck[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "due" | "learning" | "mastered"
  >("all");

  // Create Deck Modal
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [deckFormTitle, setDeckFormTitle] = useState("");
  const [deckFormDescription, setDeckFormDescription] = useState("");
  const [deckFormCourseId, setDeckFormCourseId] = useState<string>("");
  const [deckFormVisibility, setDeckFormVisibility] = useState<
    "private" | "friends" | "public"
  >("private");
  const [deckFormTags, setDeckFormTags] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  const todayStr = getLocalISODate();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sign in required to view flashcards.");
      }
      setCurrentUserId(user.id);

      // 1. Fetch user's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name, code, color")
        .eq("user_id", user.id)
        .order("name");
      setCourses(coursesData || []);

      // 2. Fetch My Decks
      const { data: decksData, error: decksErr } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
          courses (name, code),
          flashcards (
            id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer, created_at, updated_at
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (decksErr) throw decksErr;

      // 3. Fetch user's review states for due count / mastery calculation
      const { data: reviewStates } = await supabase
        .from("flashcard_review_states")
        .select("*")
        .eq("user_id", user.id);

      const reviewMap = new Map<string, any>();
      (reviewStates || []).forEach((rs: any) => reviewMap.set(rs.card_id, rs));

      const processedMyDecks: EnhancedDeck[] = (decksData || []).map(
        (d: any) => {
          const sortedCards: EnhancedCard[] = (d.flashcards || [])
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .map((c: any) => ({
              ...c,
              review_state: reviewMap.get(c.id) || null,
            }));

          const total = sortedCards.length;
          const dueCount = sortedCards.filter((c) => {
            if (!c.review_state) return true; // Unstudied cards count as due
            return c.review_state.due_date <= todayStr;
          }).length;

          const masteredCount = sortedCards.filter(
            (c) => (c.review_state?.interval_days ?? 0) >= 21
          ).length;
          const masteryPct =
            total > 0 ? Math.round((masteredCount / total) * 100) : 0;

          return {
            ...d,
            cards: sortedCards,
            card_count: total,
            due_count: dueCount,
            mastery_pct: masteryPct,
          };
        }
      );
      setMyDecks(processedMyDecks);

      // 4. Fetch Saved Decks
      const { data: savedData } = await supabase
        .from("deck_saves")
        .select(
          `
          deck_id,
          flashcard_decks (
            id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at, source_creator_username,
            courses (name, code),
            flashcards (id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer)
          )
        `
        )
        .eq("user_id", user.id);

      const processedSaved: EnhancedDeck[] = (savedData || [])
        .map((s: any) => s.flashcard_decks)
        .filter(Boolean)
        .map((d: any) => {
          const cards = (d.flashcards || []).map((c: any) => ({
            ...c,
            review_state: reviewMap.get(c.id) || null,
          }));
          const total = cards.length;
          const dueCount = cards.filter(
            (c: any) => !c.review_state || c.review_state.due_date <= todayStr
          ).length;
          const masteredCount = cards.filter(
            (c: any) => (c.review_state?.interval_days ?? 0) >= 21
          ).length;
          return {
            ...d,
            cards,
            card_count: total,
            due_count: dueCount,
            mastery_pct:
              total > 0 ? Math.round((masteredCount / total) * 100) : 0,
          };
        });
      setSavedDecks(processedSaved);

      // 5. Fetch Shared Decks
      const { data: sharedData } = await supabase
        .from("deck_members")
        .select(
          `
          deck_id, role,
          flashcard_decks (
            id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
            courses (name, code),
            flashcards (id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer)
          )
        `
        )
        .eq("user_id", user.id);

      const processedShared: EnhancedDeck[] = (sharedData || [])
        .map((sm: any) => sm.flashcard_decks)
        .filter(Boolean)
        .map((d: any) => ({
          ...d,
          card_count: (d.flashcards || []).length,
          due_count: 0,
          mastery_pct: 0,
        }));
      setSharedDecks(processedShared);

      // 6. Fetch Discover Decks
      const { data: discoverData } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, created_at,
          courses (name, code),
          flashcards (id)
        `
        )
        .eq("visibility", "public")
        .neq("user_id", user.id)
        .limit(25);

      const processedDiscover: EnhancedDeck[] = (discoverData || []).map(
        (d: any) => ({
          ...d,
          card_count: (d.flashcards || []).length,
        })
      );
      setDiscoverDecks(processedDiscover);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast(getSafeErrorMessage(err, "Could not load flashcards."), "error");
    } finally {
      setLoading(false);
    }
  }, [supabase, todayStr, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Deck creation handler
  const handleOpenCreateDeck = (presetCourseId?: string) => {
    setDeckFormTitle("");
    setDeckFormDescription("");
    setDeckFormCourseId(presetCourseId || courses[0]?.id || "");
    setDeckFormVisibility("private");
    setDeckFormTags("");
    setIsCreateDeckOpen(true);
  };

  const handleSaveNewDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    const parsedTags = deckFormTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const validation = validateWithZod(createDeckSchema, {
      title: deckFormTitle,
      description: deckFormDescription || null,
      courseId: deckFormCourseId ? deckFormCourseId : null,
      visibility: deckFormVisibility,
      tags: parsedTags,
    });

    if (!validation.success) {
      toast(validation.error, "error");
      return;
    }

    setIsSavingDeck(true);
    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: currentUserId,
          title: deckFormTitle.trim(),
          description: deckFormDescription.trim() || null,
          course_id: deckFormCourseId ? deckFormCourseId : null,
          visibility: deckFormVisibility,
          tags: parsedTags,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast("Deck created successfully.", "success");
      setIsCreateDeckOpen(false);
      if (data?.id) {
        router.push(`/flashcards/${data.id}`);
      } else {
        fetchAllData();
      }
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to create deck."), "error");
    } finally {
      setIsSavingDeck(false);
    }
  };

  const handleSavePublicDeck = async (deckId: string) => {
    try {
      const { error } = await supabase.rpc("save_public_deck", {
        p_source_deck_id: deckId,
      });

      if (error) throw error;
      toast("Deck saved to your library with attribution.", "success");
      setLibraryTab("saved");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to save public deck."), "error");
    }
  };

  // Filter current tab decks
  const currentTabDecks =
    libraryTab === "my"
      ? myDecks
      : libraryTab === "saved"
      ? savedDecks
      : libraryTab === "shared"
      ? sharedDecks
      : discoverDecks;

  const filteredDecks = currentTabDecks.filter((deck) => {
    const matchesCourse =
      selectedCourseFilter === "all" ||
      (selectedCourseFilter === "none" && !deck.course_id) ||
      deck.course_id === selectedCourseFilter;

    const matchesSearch =
      !searchQuery ||
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.description &&
        deck.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      deck.tags?.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!matchesCourse || !matchesSearch) return false;

    if (reviewFilter === "due") return (deck.due_count || 0) > 0;
    if (reviewFilter === "learning")
      return (deck.mastery_pct || 0) < 60 && (deck.card_count || 0) > 0;
    if (reviewFilter === "mastered") return (deck.mastery_pct || 0) >= 60;

    return true;
  });

  // Group My Decks by Course for the 4-tier academic hierarchy
  const courseDeckHierarchy = groupDecksByCourse(
    courses as unknown as Course[],
    filteredDecks as unknown as FlashcardDeck[]
  );

  const renderDeckCard = (deck: EnhancedDeck) => (
    <Link
      key={deck.id}
      href={`/flashcards/${deck.id}`}
      className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group btn-press shadow-xs"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            {deck.courses?.name || "General Deck"}
          </span>
          <div className="flex items-center gap-1.5">
            {deck.source_creator_username && (
              <span className="text-[10px] text-zinc-400">
                @{deck.source_creator_username}
              </span>
            )}
            <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
              {deck.visibility}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          {deck.title}
        </h3>
        {deck.description && (
          <p className="text-xs text-zinc-500 line-clamp-2">
            {deck.description}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono tnum text-[11px] text-zinc-500">
          <span>{deck.card_count || 0} cards</span>
          {libraryTab !== "discover" && (
            <>
              <span>·</span>
              <span
                className={
                  deck.due_count && deck.due_count > 0
                    ? "text-zinc-900 dark:text-white font-bold"
                    : ""
                }
              >
                {deck.due_count || 0} due
              </span>
              <span>·</span>
              <span>{deck.mastery_pct || 0}% mastered</span>
            </>
          )}
        </div>

        {libraryTab === "discover" ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSavePublicDeck(deck.id);
            }}
            className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Save Deck
          </button>
        ) : (
          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
            Open →
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Flashcards
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Spaced repetition memory training structured by course and subject.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreateDeck()}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Create Deck
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => setLibraryTab("my")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "my"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> My Decks ({myDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("saved")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "saved"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Saved Decks ({savedDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("shared")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "shared"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" /> Shared With Me (
          {sharedDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("discover")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "discover"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5" /> Discover ({discoverDecks.length})
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks by title, topic, or tag..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <select
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] text-xs text-zinc-800 dark:text-zinc-200 outline-none"
        >
          <option value="all">All Courses</option>
          <option value="none">General / Uncategorized</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code}: ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        {libraryTab !== "discover" && (
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900 text-xs">
            {(["all", "due", "learning", "mastered"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  reviewFilter === f
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 font-mono">
          Loading flashcard decks...
        </div>
      ) : libraryTab === "my" ? (
        /* 4-Tier Academic Hierarchy View */
        <div className="space-y-10">
          {/* Courses Sections */}
          {courseDeckHierarchy.courses.map((group) => {
            const courseDecks = group.decks as unknown as EnhancedDeck[];
            return (
              <div key={group.course.id} className="space-y-3">
                {/* Course Header Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <GraduationCap className="h-4 w-4 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {group.course.name}
                        </span>
                        {group.course.code && (
                          <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-800">
                            {group.course.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-0.5 tnum">
                        <span>{group.decks.length} decks</span>
                        <span>·</span>
                        <span>{group.totalCards} cards</span>
                        <span>·</span>
                        <span
                          className={
                            group.dueCount > 0
                              ? "text-zinc-900 dark:text-white font-bold"
                              : ""
                          }
                        >
                          {group.dueCount} due
                        </span>
                        <span>·</span>
                        <span>{group.masteryPct}% mastery</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenCreateDeck(group.course.id)}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> New Deck
                  </button>
                </div>

                {/* Decks Grid or Empty Course State */}
                {courseDecks.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/50">
                    <p className="text-xs text-zinc-500">
                      No decks linked to {group.course.name} yet.
                    </p>
                    <button
                      onClick={() => handleOpenCreateDeck(group.course.id)}
                      className="mt-2 text-xs font-medium text-zinc-900 dark:text-white underline underline-offset-4"
                    >
                      + Create first deck for this course
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courseDecks.map(renderDeckCard)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized / General Decks */}
          {(courseDeckHierarchy.uncategorized.length > 0 ||
            courses.length === 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <FolderOpen className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      General / Uncategorized Decks
                    </span>
                    <p className="text-[11px] font-mono text-zinc-500 tnum">
                      {courseDeckHierarchy.uncategorized.length} decks not
                      assigned to any specific course
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCreateDeck()}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> New Deck
                </button>
              </div>

              {courseDeckHierarchy.uncategorized.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/50">
                  <p className="text-xs text-zinc-500">
                    All decks are organized into courses.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(
                    courseDeckHierarchy.uncategorized as unknown as EnhancedDeck[]
                  ).map(renderDeckCard)}
                </div>
              )}
            </div>
          )}

          {courseDeckHierarchy.totalDecks === 0 && courses.length === 0 && (
            <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <Layers className="h-8 w-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                No flashcard decks found
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Create a deck to begin spaced repetition recall.
              </p>
              <button
                onClick={() => handleOpenCreateDeck()}
                className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
              >
                Create First Deck
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Saved, Shared, or Discover Decks Flat Grid */
        <div>
          {filteredDecks.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <Layers className="h-8 w-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {libraryTab === "discover"
                  ? "No public decks found"
                  : libraryTab === "saved"
                  ? "No saved decks yet"
                  : "No collaborative decks shared with you"}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {libraryTab === "discover"
                  ? "Be the first student to publish a study deck for the community."
                  : "Decks you bookmark or collaborate on will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDecks.map(renderDeckCard)}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE DECK                                                    */}
      {/* ===================================================================== */}
      {isCreateDeckOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Create Flashcard Deck
              </h3>
              <button
                onClick={() => setIsCreateDeckOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDeck} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Deck Title *
                </label>
                <input
                  type="text"
                  required
                  value={deckFormTitle}
                  onChange={(e) => setDeckFormTitle(e.target.value)}
                  placeholder="e.g. Binary Trees & Graph Traversal"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Course / Subject
                </label>
                <select
                  value={deckFormCourseId}
                  onChange={(e) => setDeckFormCourseId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                >
                  <option value="">General / No Course Linked</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `${c.code}: ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deckFormDescription}
                  onChange={(e) => setDeckFormDescription(e.target.value)}
                  placeholder="Summary of topics covered in this deck..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Visibility
                  </label>
                  <select
                    value={deckFormVisibility}
                    onChange={(e) =>
                      setDeckFormVisibility(e.target.value as any)
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  >
                    <option value="private">Private (Only you)</option>
                    <option value="friends">Friends Only</option>
                    <option value="public">Public (Community)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={deckFormTags}
                    onChange={(e) => setDeckFormTags(e.target.value)}
                    placeholder="exam-1, oop, midterms"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeck}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press disabled:opacity-50"
                >
                  {isSavingDeck ? "Creating..." : "Create Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
