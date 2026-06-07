"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageSquare,
  PanelRightClose,
  RotateCcw,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatConversation } from "@/components/chat/chat-conversation";

type Choice = "A" | "B" | "C" | "D";

type PublicQuestion = {
  id: number;
  order: number;
  question: string;
  options: Record<Choice, string>;
  difficulty: string;
};

type AnsweredQuestion = PublicQuestion & {
  userChoice: Choice;
  correctAnswer: Choice;
  correct: boolean;
  explanation: string;
};

type QuizState = {
  sessionId: string;
  status: "in_progress" | "finished";
  total: number;
  answeredCount: number;
  correctCount: number;
  cap: number;
  answered: AnsweredQuestion[];
  current: PublicQuestion | null;
  scorePercent: number | null;
};

type ChatBootstrap = {
  header: string;
  commitMessage: string | null;
  suggestions: string[];
  initialMessages: UIMessage[] | undefined;
};

type QuizPanelProps = {
  owner: string;
  name: string;
  commitSha: string | null;
  /** Mounted in "general" mode when no commit is selected — falls back to chat. */
  mode: "general" | "commit";
  chat: ChatBootstrap;
};

export function QuizPanel({ owner, name, commitSha, mode, chat }: QuizPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const panel =
    mode === "general" || !commitSha ? (
      // No commit selected — quiz needs a commit, so show chat shell only.
      <ChatPanel
        owner={owner}
        name={name}
        commitSha={null}
        mode="general"
        header={chat.header}
        commitMessage={chat.commitMessage}
        suggestions={chat.suggestions}
        initialMessages={chat.initialMessages}
      />
    ) : (
      <CommitQuizPanel
        key={commitSha}
        owner={owner}
        name={name}
        commitSha={commitSha}
        chat={chat}
        onCollapse={() => {
          setCollapsed(true);
          setOpenMobile(false);
        }}
      />
    );

  useEffect(() => {
    if (!openMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMobile(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMobile]);

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-l border-border lg:block",
          collapsed ? "lg:w-0 lg:border-l-0" : "lg:w-[400px]",
        )}
      >
        {!collapsed && (
          <div className="sticky top-16 h-[calc(100vh-4rem)]">{panel}</div>
        )}
      </aside>

      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-vermillion px-4 py-3 font-mono text-xs uppercase tracking-widest text-hero-ink shadow-lg lg:hidden"
      >
        <MessageSquare className="h-4 w-4" /> {mode === "commit" ? "Quiz" : "Ask"}
      </button>
      {openMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenMobile(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

type CommitQuizPanelProps = {
  owner: string;
  name: string;
  commitSha: string;
  chat: ChatBootstrap;
  onCollapse: () => void;
};

type Tab = "quiz" | "chat";

function CommitQuizPanel({
  owner,
  name,
  commitSha,
  chat,
  onCollapse,
}: CommitQuizPanelProps) {
  const [state, setState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [tab, setTab] = useState<Tab>("quiz");
  const [reveal, setReveal] = useState<{ correct: boolean; correctAnswer: Choice } | null>(null);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name, commitSha }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? `Failed (${r.status})`);
        setLoading(false);
        return;
      }
      setState(data.state as QuizState);
      setSelected(null);
      setReveal(null);
      setLoading(false);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
      setLoading(false);
    }
  }, [owner, name, commitSha]);

  useEffect(() => {
    // Mount-time + commit-change fetch — setState happens inside start().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
  }, [start]);

  async function submit() {
    if (!state?.current || !selected || submitting) return;
    setSubmitting(true);
    setError(null);
    const submittedQuestionId = state.current.id;
    const submittedChoice = selected;
    try {
      const r = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          name,
          commitSha,
          questionId: submittedQuestionId,
          choice: submittedChoice,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? `Failed (${r.status})`);
        setSubmitting(false);
        return;
      }
      const next = data.state as QuizState;
      const answered = next.answered.find((a) => a.id === submittedQuestionId);
      if (answered) {
        setReveal({ correct: answered.correct, correctAnswer: answered.correctAnswer });
      }
      setState(next);
      setSelected(null);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function retake() {
    setLoading(true);
    setError(null);
    setTab("quiz");
    try {
      const r = await fetch("/api/quiz/retake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name, commitSha }),
      });
      if (!r.ok) {
        const data = await r.json();
        setError(data.error ?? `Failed (${r.status})`);
        setLoading(false);
        return;
      }
      await start();
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
      setLoading(false);
    }
  }

  const finished = state?.status === "finished";
  const chatUnlocked = finished;

  return (
    <div className="flex h-full flex-col bg-card/20">
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
            Commit quiz
          </p>
          <p className="truncate font-mono text-sm text-foreground">
            {chat.header}
          </p>
          {chat.commitMessage && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {chat.commitMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse panel"
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelRightClose className="hidden h-4 w-4 lg:block" />
          <X className="h-4 w-4 lg:hidden" />
        </button>
      </div>

      {/* tabs */}
      <div className="flex border-b border-border">
        <TabButton
          active={tab === "quiz"}
          onClick={() => setTab("quiz")}
          label="Quiz"
          badge={state ? `${state.correctCount}/${state.answeredCount || state.total}` : null}
        />
        <TabButton
          active={tab === "chat"}
          onClick={() => chatUnlocked && setTab("chat")}
          label="Chat"
          disabled={!chatUnlocked}
          hint={chatUnlocked ? null : "Finish quiz to unlock"}
        />
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto">
        {tab === "quiz" ? (
          <QuizBody
            loading={loading}
            error={error}
            state={state}
            selected={selected}
            setSelected={setSelected}
            submit={submit}
            submitting={submitting}
            reveal={reveal}
            setReveal={setReveal}
            retake={retake}
            onOpenChat={() => setTab("chat")}
          />
        ) : (
          <ChatTab
            owner={owner}
            name={name}
            commitSha={commitSha}
            chat={chat}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  disabled,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string | null;
  disabled?: boolean;
  hint?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint ?? undefined}
      className={cn(
        "relative flex-1 px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
        active
          ? "text-vermillion"
          : disabled
            ? "cursor-not-allowed text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {badge && (
          <span className="rounded-sm border border-border bg-card/40 px-1.5 py-0.5 text-[10px] tabular-nums">
            {badge}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute inset-x-3 -bottom-px h-0.5 bg-vermillion" />
      )}
    </button>
  );
}

function QuizBody({
  loading,
  error,
  state,
  selected,
  setSelected,
  submit,
  submitting,
  reveal,
  setReveal,
  retake,
  onOpenChat,
}: {
  loading: boolean;
  error: string | null;
  state: QuizState | null;
  selected: Choice | null;
  setSelected: (c: Choice) => void;
  submit: () => void;
  submitting: boolean;
  reveal: { correct: boolean; correctAnswer: Choice } | null;
  setReveal: (r: { correct: boolean; correctAnswer: Choice } | null) => void;
  retake: () => void;
  onOpenChat: () => void;
}) {
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-vermillion" />
        <p className="text-sm text-muted-foreground">Generating questions…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-4">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }
  if (!state) return null;

  // If we just submitted the last question we still want to show the reveal
  // before the user lands on the results screen — fall through to question
  // rendering while `reveal` is set. Otherwise route to results / next.
  if (!reveal && state.status === "finished") {
    return <ResultsView state={state} retake={retake} onOpenChat={onOpenChat} />;
  }

  if (!reveal && !state.current) {
    return (
      <div className="px-4 py-4 text-sm text-muted-foreground">
        Waiting for next question…
      </div>
    );
  }

  // After Submit, we hold on the previously-answered question (showing the
  // reveal) until the user clicks Continue. The pendingReveal is the just-
  // answered question; state.current is the next one. While reveal is set we
  // render the pendingReveal question; clearing it advances to state.current.
  const pendingReveal = reveal
    ? state.answered[state.answered.length - 1] ?? null
    : null;
  const showingAnswered = reveal !== null && pendingReveal !== null;
  const q = showingAnswered ? pendingReveal! : state.current;
  if (!q) {
    return (
      <div className="px-4 py-4 text-sm text-muted-foreground">
        Waiting for next question…
      </div>
    );
  }
  const displayOptions = q.options;
  const displayQuestionNumber = showingAnswered
    ? state.answeredCount
    : state.answeredCount + 1;

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>
          Question {displayQuestionNumber} / {Math.min(state.total, state.cap)}
        </span>
        <span className="text-vermillion/80">{q.difficulty}</span>
      </div>

      <p className="text-sm text-foreground">{q.question}</p>

      <div className="flex flex-col gap-2">
        {(["A", "B", "C", "D"] as Choice[]).map((letter) => {
          const userPicked = showingAnswered
            ? (pendingReveal as AnsweredQuestion).userChoice === letter
            : selected === letter;
          const isCorrect = reveal?.correctAnswer === letter;
          const isWrongPick =
            reveal && !reveal.correct && userPicked && !isCorrect;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => !reveal && setSelected(letter)}
              disabled={submitting || reveal !== null}
              className={cn(
                "group flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                userPicked && !reveal
                  ? "border-vermillion bg-vermillion/10 text-foreground"
                  : "border-border bg-card/40 text-foreground hover:border-vermillion/40 hover:bg-card/60",
                reveal && isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                isWrongPick && "border-destructive/60 bg-destructive/10",
                "disabled:opacity-90",
              )}
            >
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {letter}
              </span>
              <span className="flex-1">{displayOptions[letter]}</span>
            </button>
          );
        })}
      </div>

      {reveal && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
            reveal.correct
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive-foreground",
          )}
        >
          {reveal.correct ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {reveal.correct
              ? "Correct."
              : `Not quite — correct answer was ${reveal.correctAnswer}.`}
            {pendingReveal?.explanation && ` ${pendingReveal.explanation}`}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        {reveal ? (
          <button
            type="button"
            onClick={() => setReveal(null)}
            className="inline-flex items-center gap-2 rounded-md bg-vermillion px-4 py-2 font-mono text-xs uppercase tracking-widest text-hero-ink"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!selected || submitting}
            className="inline-flex items-center gap-2 rounded-md bg-vermillion px-4 py-2 font-mono text-xs uppercase tracking-widest text-hero-ink transition-opacity disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                Submit <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultsView({
  state,
  retake,
  onOpenChat,
}: {
  state: QuizState;
  retake: () => void;
  onOpenChat: () => void;
}) {
  const percent = state.scorePercent ?? 0;
  const tone =
    percent >= 80
      ? "text-emerald-300"
      : percent >= 50
        ? "text-vermillion"
        : "text-destructive";
  const missed = state.answered.filter((a) => !a.correct);

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="rounded-xl border border-border bg-card/40 px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Final score
        </p>
        <p className={cn("mt-1 font-mono text-3xl font-semibold tabular-nums", tone)}>
          {percent}%
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {state.correctCount} of {state.answeredCount} correct
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={retake}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition-colors hover:border-vermillion/60 hover:text-vermillion"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retake
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex items-center gap-1.5 rounded-md bg-vermillion px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-hero-ink"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Ask follow-ups
          </button>
        </div>
      </div>

      {missed.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What you missed
          </p>
          <ul className="mt-2 space-y-3">
            {missed.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-card/30 px-3 py-2 text-xs"
              >
                <p className="text-foreground">{a.question}</p>
                <p className="mt-1 text-muted-foreground">
                  Correct: <span className="text-emerald-300">{a.correctAnswer}</span>{" "}
                  — {a.options[a.correctAnswer]}
                </p>
                {a.explanation && (
                  <p className="mt-1 text-muted-foreground">{a.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChatTab({
  owner,
  name,
  commitSha,
  chat,
}: {
  owner: string;
  name: string;
  commitSha: string;
  chat: ChatBootstrap;
}) {
  return (
    <ChatConversation
      owner={owner}
      name={name}
      commitSha={commitSha}
      mode="commit"
      suggestions={chat.suggestions}
      initialMessages={chat.initialMessages}
      emptyStateText="Ask follow-up questions about anything you missed — or anything you want clarified."
      placeholder="Clarify with the assistant…"
    />
  );
}
