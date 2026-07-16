"use client";

import { Pencil, Trash2 } from "lucide-react";

import type { Word } from "@/types";
import { useActions } from "@/store/useVocabStore";
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
            aria-label={`Edit ${word.word}`}
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
            aria-label={`Delete ${word.word}`}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{word.word}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the word from this book. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => actions.deleteWord(bookId, word.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
