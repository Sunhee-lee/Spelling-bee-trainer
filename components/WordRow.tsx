"use client";

import { Pencil, Trash2 } from "lucide-react";

import type { Word } from "@/types";
import { useActions } from "@/store/useVocabStore";
import { useTranslation } from "@/lib/i18n";
import { WordFormDialog } from "@/components/WordFormDialog";
import { Button } from "@/components/ui/button";
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

interface WordRowProps {
  bookId: string;
  word: Word;
}

/** A single row in the word list with edit and delete controls. */
export function WordRow({ bookId, word }: WordRowProps) {
  const actions = useActions();
  const { t } = useTranslation();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-muted-foreground">
        {word.number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{word.word}</p>
        <p className="truncate text-sm text-muted-foreground">{word.meaning}</p>
      </div>

      <WordFormDialog
        bookId={bookId}
        word={word}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("words.editAria", { word: word.word })}
          >
            <Pencil />
          </Button>
        }
      />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("words.deleteAria", { word: word.word })}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("words.deleteTitle", { word: word.word })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("words.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => actions.deleteWord(bookId, word.id)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
