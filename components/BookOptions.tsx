"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

import type { Book } from "@/types";
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
  const { t } = useTranslation();
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
            <Pencil /> {t("bookOptions.rename")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookOptions.renameTitle")}</DialogTitle>
            <DialogDescription>{t("bookOptions.renameDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-name">{t("settings.bookName")}</Label>
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={name.trim() === ""}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset progress */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <RotateCcw /> {t("bookOptions.resetProgress")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bookOptions.resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bookOptions.resetDesc", { book: book.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => actions.resetBookProgress(book.id)}>
              {t("bookOptions.reset")}
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
              <Trash2 /> {t("bookOptions.deleteBook")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("bookOptions.deleteTitle", { book: book.name })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("bookOptions.deleteDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => {
                  actions.deleteBook(book.id);
                  router.push("/");
                }}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
