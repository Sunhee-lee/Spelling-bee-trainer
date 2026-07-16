"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

import type { Book } from "@/types";
import { useActions } from "@/store/useVocabStore";
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

interface BookOptionsProps {
  book: Book;
}

/** Rename, reset progress, and (for user-created books) delete. */
export function BookOptions({ book }: BookOptionsProps) {
  const actions = useActions();
  const router = useRouter();

  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(book.name);

  useEffect(() => {
    if (renameOpen) setName(book.name);
  }, [renameOpen, book.name]);

  function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim() === "") return;
    actions.renameBook(book.id, name);
    setRenameOpen(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil /> Rename
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename book</DialogTitle>
            <DialogDescription>Give this book a new name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-name">Book name</Label>
              <Input
                id="book-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={name.trim() === ""}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset progress */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <RotateCcw /> Reset progress
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset progress?</AlertDialogTitle>
            <AlertDialogDescription>
              All words in “{book.name}” go back to the start. The words
              themselves are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actions.resetBookProgress(book.id)}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete (user-created books only) */}
      {!book.builtIn && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 /> Delete book
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{book.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the book and all of its words.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => {
                  actions.deleteBook(book.id);
                  router.push("/");
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
