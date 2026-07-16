"use client";

import { useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";

import type { Book } from "@/types";
import { useActions } from "@/store/useVocabStore";
import type { ImportStrategy, ImportSummary } from "@/store/store";
import { parseImportText, type ParsedEntry } from "@/services/vocabIO";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = "input" | "confirm" | "done";

interface Preview {
  entries: ParsedEntry[];
  duplicates: number;
  invalid: number;
}

const PLACEHOLDER = `1,add,더하다\n2,act,행동하다\n3,apple,사과`;

interface BulkImportDialogProps {
  book: Book;
  trigger: React.ReactNode;
}

/** Paste-to-import dialog with duplicate handling and a result summary. */
export function BulkImportDialog({ book, trigger }: BulkImportDialogProps) {
  const actions = useActions();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function reset() {
    setStep("input");
    setText("");
    setPreview(null);
    setSummary(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Delay reset so content doesn't flash while the dialog animates out.
      window.setTimeout(reset, 200);
    }
  }

  function handleContinue() {
    const parsed = parseImportText(text);
    // A word is a duplicate if it already exists in the book OR repeats
    // earlier in the pasted batch.
    const existing = new Set(book.words.map((w) => w.word.toLowerCase()));
    const seen = new Set<string>();
    let duplicates = 0;
    for (const entry of parsed.entries) {
      const key = entry.word.toLowerCase();
      if (existing.has(key) || seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    setPreview({
      entries: parsed.entries,
      duplicates,
      invalid: parsed.invalidLines.length,
    });
    setStep("confirm");
  }

  function runImport(strategy: ImportStrategy) {
    if (!preview) return;
    const result = actions.bulkImport(book.id, preview.entries, strategy);
    setSummary(result);
    setStep("done");
  }

  const parsedCount = preview?.entries.length ?? 0;
  const newCount = preview ? preview.entries.length - preview.duplicates : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle>Bulk import</DialogTitle>
              <DialogDescription>
                One word per line, as{" "}
                <span className="font-semibold">number,english,korean</span> or{" "}
                <span className="font-semibold">english,korean</span>. Missing
                numbers are assigned automatically; empty lines are ignored.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulk-text">Words</Label>
              <Textarea
                id="bulk-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={8}
                className="font-mono text-sm"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={text.trim() === ""}>
                <Upload /> Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && preview && (
          <>
            <DialogHeader>
              <DialogTitle>Review import</DialogTitle>
              <DialogDescription>
                Found {parsedCount} valid{" "}
                {parsedCount === 1 ? "entry" : "entries"} to import.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-2.5">
                <span>New words</span>
                <span className="font-bold tabular-nums">{newCount}</span>
              </li>
              <li className="flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-2.5">
                <span>Duplicate words</span>
                <span className="font-bold tabular-nums">
                  {preview.duplicates}
                </span>
              </li>
              {preview.invalid > 0 && (
                <li className="flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-2.5 text-muted-foreground">
                  <span>Skipped invalid lines</span>
                  <span className="font-bold tabular-nums">
                    {preview.invalid}
                  </span>
                </li>
              )}
            </ul>

            {preview.duplicates > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Some words already exist. What should happen to duplicates?
                </p>
                <DialogFooter className="sm:flex-col sm:items-stretch sm:gap-2">
                  <Button onClick={() => runImport("skip")}>
                    Skip duplicates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runImport("replace")}
                  >
                    Replace existing words
                  </Button>
                  <Button variant="ghost" onClick={() => setStep("input")}>
                    Back
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("input")}>
                  Back
                </Button>
                <Button
                  onClick={() => runImport("skip")}
                  disabled={newCount === 0}
                >
                  Import {newCount} {newCount === 1 ? "word" : "words"}
                </Button>
              </DialogFooter>
            )}
          </>
        )}

        {step === "done" && summary && (
          <>
            <DialogHeader className="items-center text-center">
              <CheckCircle2 className="size-12 text-success" />
              <DialogTitle>Import complete</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1.5 text-center text-base">
              <p className="font-semibold">
                Imported {summary.imported}{" "}
                {summary.imported === 1 ? "word" : "words"}
              </p>
              {summary.replaced > 0 && (
                <p className="text-muted-foreground">
                  Replaced {summary.replaced}{" "}
                  {summary.replaced === 1 ? "word" : "words"}
                </p>
              )}
              {summary.skipped > 0 && (
                <p className="text-muted-foreground">
                  Skipped {summary.skipped} duplicate{" "}
                  {summary.skipped === 1 ? "word" : "words"}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
