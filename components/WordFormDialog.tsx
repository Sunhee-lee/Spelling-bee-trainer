"use client";

import { useEffect, useState } from "react";

import type { Word } from "@/types";
import { useActions } from "@/store/useVocabStore";
import { useTranslation } from "@/lib/i18n";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WordFormDialogProps {
  bookId: string;
  /** Provide an existing word to edit; omit to add a new one. */
  word?: Word;
  trigger: React.ReactNode;
}

/** Dialog for adding or editing a single vocabulary word. */
export function WordFormDialog({ bookId, word, trigger }: WordFormDialogProps) {
  const actions = useActions();
  const { t } = useTranslation();
  const isEdit = !!word;

  const [open, setOpen] = useState(false);
  const [english, setEnglish] = useState("");
  const [meaning, setMeaning] = useState("");

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setEnglish(word?.word ?? "");
      setMeaning(word?.meaning ?? "");
    }
  }, [open, word]);

  const canSubmit = english.trim() !== "" && meaning.trim() !== "";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    if (isEdit && word) {
      actions.updateWord(bookId, word.id, { word: english, meaning });
    } else {
      actions.addWord(bookId, english, meaning);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("words.editWord") : t("words.addWordTitle")}
          </DialogTitle>
          <DialogDescription>{t("words.formDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="word-english">{t("words.english")}</Label>
            <Input
              id="word-english"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="journey"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="word-meaning">{t("words.korean")}</Label>
            <Input
              id="word-meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="여행"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isEdit ? t("words.saveChanges") : t("words.addWord")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
