"use client";

import { Download } from "lucide-react";

import type { Book } from "@/types";
import { toCsv } from "@/services/vocabIO";
import { Button } from "@/components/ui/button";

/** Turn a book name into a safe CSV file name. */
function toFileName(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "vocabulary"}.csv`;
}

interface ExportButtonProps {
  book: Book;
}

/** Downloads the book's words as a `word,meaning` CSV file. */
export function ExportButton({ book }: ExportButtonProps) {
  function handleExport() {
    const csv = toCsv(book.words.map((w) => ({ word: w.word, meaning: w.meaning })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = toFileName(book.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={book.words.length === 0}
    >
      <Download /> Export CSV
    </Button>
  );
}
