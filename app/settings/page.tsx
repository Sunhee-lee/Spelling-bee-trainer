"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";

import { useActions, useAppState } from "@/store/useVocabStore";
import { AppHeader } from "@/components/AppHeader";
import { AccountSection } from "@/components/AccountSection";
import { BackupRestore } from "@/components/BackupRestore";
import { BookSettingsRow } from "@/components/BookSettingsRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function NewBookDialog() {
  const actions = useActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim() === "") return;
    const book = actions.addBook(name);
    setOpen(false);
    setName("");
    router.push(`/books/${book.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New book
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New vocabulary book</DialogTitle>
          <DialogDescription>
            Create a book, then add words to it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-book-name">Book name</Label>
            <Input
              id="new-book-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Week 1 Words"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={name.trim() === ""}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { state, hydrated } = useAppState();
  const actions = useActions();
  const { settings } = state;

  function setQuestionsPerTest(value: number) {
    if (Number.isNaN(value)) return;
    actions.updateSettings({ questionsPerTest: Math.max(1, Math.round(value)) });
  }

  function setMasterReviewPercent(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    actions.updateSettings({ masterReviewRate: clamped / 100 });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title="Settings" emoji="⚙️" backHref="/" />

      {!hydrated ? (
        <Card className="h-48 animate-pulse bg-muted/60" />
      ) : (
        <>
          {/* Account & sync */}
          <AccountSection />

          {/* Vocabulary Books */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Vocabulary books</CardTitle>
              <NewBookDialog />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {state.books.map((book) => (
                <BookSettingsRow key={book.id} book={book} />
              ))}
              <p className="px-1 text-xs text-muted-foreground">
                Reset progress, rename, and delete live inside each book’s
                Manage page.
              </p>
            </CardContent>
          </Card>

          {/* Test Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Test settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="qpt">Questions per test</Label>
                  <p className="text-sm text-muted-foreground">
                    Up to this many words per test.
                  </p>
                </div>
                <Input
                  id="qpt"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={settings.questionsPerTest}
                  onChange={(e) => setQuestionsPerTest(e.target.valueAsNumber)}
                  className="w-24 text-center"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Shuffle className="size-4" /> Shuffle questions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Randomize the order each test.
                  </p>
                </div>
                <div className="flex rounded-full border-2 border-border p-1">
                  <button
                    type="button"
                    aria-pressed={settings.shuffleQuestions}
                    onClick={() =>
                      actions.updateSettings({ shuffleQuestions: true })
                    }
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
                      settings.shuffleQuestions
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    aria-pressed={!settings.shuffleQuestions}
                    onClick={() =>
                      actions.updateSettings({ shuffleQuestions: false })
                    }
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
                      !settings.shuffleQuestions
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="mrr">Master review rate</Label>
                  <p className="text-sm text-muted-foreground">
                    Share of mastered words mixed in (used by SRS in Phase 2).
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    id="mrr"
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    value={Math.round(settings.masterReviewRate * 100)}
                    onChange={(e) =>
                      setMasterReviewPercent(e.target.valueAsNumber)
                    }
                    className="w-20 text-center"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup / Restore */}
          <Card>
            <CardHeader>
              <CardTitle>Backup &amp; restore</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Save all books, words, and progress to a file, or restore from
                one.
              </p>
              <BackupRestore />
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data management</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Clear learning progress (keeps vocabulary) */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw /> Clear all learning progress
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Clear all learning progress?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Resets test numbers, master status, levels, and streaks
                      for every book. Your vocabulary words are kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => actions.resetAllProgress()}>
                      Reset progress
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Clear everything */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 /> Clear everything
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear everything?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Deletes every book and word on this device and starts
                      fresh with Basic 100 and the Supplemental List. This can’t
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => actions.clearAll()}
                    >
                      Clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Spelling Bee Trainer 🐝
              </p>
              <p>
                A friendly spelling practice app for young learners. The teacher
                reads the meaning, the student says and spells the word, and a
                grown-up taps ⭕ or ❌.
              </p>
              <p>Saved locally on this device.</p>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
