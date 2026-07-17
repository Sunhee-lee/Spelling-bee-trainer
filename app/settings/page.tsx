"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type { Language } from "@/types";
import { useActions, useAppState } from "@/store/useVocabStore";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { isAdminEmail } from "@/lib/admin";
import { AppHeader } from "@/components/AppHeader";
import { AccountSection } from "@/components/AccountSection";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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

const APP_VERSION = "1.0.0";
const QPT_MIN = 5;
const QPT_MAX = 50;
const QPT_STEP = 5;

function NewBookDialog() {
  const actions = useActions();
  const { t } = useTranslation();
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
        <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
          <Plus /> {t("settings.newBook")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.newBookTitle")}</DialogTitle>
          <DialogDescription>{t("settings.newBookDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-book-name">{t("settings.bookName")}</Label>
            <Input
              id="new-book-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={name.trim() === ""}>
              {t("common.create")}
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
  const { t } = useTranslation();
  const { user, configured } = useAuth();
  const { settings } = state;

  // Two-step confirmation for "Clear everything".
  const [clearStep1, setClearStep1] = useState(false);
  const [clearStep2, setClearStep2] = useState(false);

  const showAdmin = configured && isAdminEmail(user?.email);
  const masterPercent = Math.round(settings.masterReviewRate * 100);

  function bumpQuestions(delta: number) {
    const next = Math.min(QPT_MAX, Math.max(QPT_MIN, settings.questionsPerTest + delta));
    actions.updateSettings({ questionsPerTest: next });
  }

  function setLanguage(language: Language) {
    actions.updateSettings({ language });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("settings.title")}
        icon={<Settings className="size-6 text-primary sm:size-7" />}
        backHref="/"
      />

      {!hydrated ? (
        <Card className="h-48 animate-pulse bg-muted/60" />
      ) : (
        <>
          {/* Account & sync */}
          <AccountSection />

          {/* Vocabulary Books */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.vocabularyBooks")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {state.books.map((book) => (
                <BookSettingsRow
                  key={book.id}
                  book={book}
                  prerequisiteName={
                    book.unlockAfterBookId
                      ? state.books.find((b) => b.id === book.unlockAfterBookId)
                          ?.name
                      : undefined
                  }
                />
              ))}
              <NewBookDialog />
            </CardContent>
          </Card>

          {/* Test Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.testSettings")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Questions per test — stepper */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>{t("settings.questionsPerTest")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.questionsPerTestDesc")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-12"
                    aria-label="-"
                    onClick={() => bumpQuestions(-QPT_STEP)}
                    disabled={settings.questionsPerTest <= QPT_MIN}
                  >
                    <Minus />
                  </Button>
                  <span className="w-24 text-center text-sm font-bold tabular-nums">
                    {t("settings.questionsUnit", {
                      count: settings.questionsPerTest,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-12"
                    aria-label="+"
                    onClick={() => bumpQuestions(QPT_STEP)}
                    disabled={settings.questionsPerTest >= QPT_MAX}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              {/* Shuffle — switch */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="shuffle">{t("settings.shuffle")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.shuffleDesc")}
                  </p>
                </div>
                <Switch
                  id="shuffle"
                  checked={settings.shuffleQuestions}
                  onCheckedChange={(checked) =>
                    actions.updateSettings({ shuffleQuestions: checked })
                  }
                />
              </div>

              {/* Master review rate — slider */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>{t("settings.masterReviewRate")}</Label>
                  <span className="rounded-full bg-bee/20 px-2.5 py-0.5 text-sm font-bold tabular-nums">
                    {masterPercent}%
                  </span>
                </div>
                <p className="-mt-1 text-sm text-muted-foreground">
                  {t("settings.masterReviewRateDesc")}
                </p>
                <Slider
                  value={[masterPercent]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) =>
                    actions.updateSettings({ masterReviewRate: v / 100 })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.language")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(["ko", "en"] as const).map((lang) => (
                  <Button
                    key={lang}
                    variant={settings.language === lang ? "default" : "outline"}
                    className="h-12 flex-1"
                    onClick={() => setLanguage(lang)}
                    aria-pressed={settings.language === lang}
                  >
                    {lang === "ko"
                      ? t("settings.languageKo")
                      : t("settings.languageEn")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reset & Delete */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.dangerZone")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                {t("settings.dangerZoneDesc")}
              </p>

              {/* Reset learning progress — neutral, lower priority */}
              <div className="flex flex-col gap-1.5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <RotateCcw /> {t("dataManagement.clearProgress")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("dataManagement.clearProgressTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("dataManagement.clearProgressDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => actions.resetAllProgress()}>
                        {t("bookOptions.reset")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground">
                  {t("dataManagement.clearProgressDescription")}
                </p>
              </div>

              {/* Delete everything — the only destructive action, two-step confirm */}
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="destructive"
                  className="justify-start"
                  onClick={() => setClearStep1(true)}
                >
                  <Trash2 /> {t("dataManagement.clearEverything")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("dataManagement.clearEverythingDescription")}
                </p>
              </div>

              {/* Step 1 */}
              <AlertDialog open={clearStep1} onOpenChange={setClearStep1}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("dataManagement.clearEverythingTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dataManagement.clearEverythingDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        setClearStep1(false);
                        setClearStep2(true);
                      }}
                    >
                      {t("common.continue")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Step 2 — final confirmation */}
              <AlertDialog open={clearStep2} onOpenChange={setClearStep2}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      {t("dataManagement.clearFinalTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dataManagement.clearFinalDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        setClearStep2(false);
                        actions.clearAll();
                      }}
                    >
                      {t("dataManagement.clearFinalAction")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.about")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {t("settings.aboutName")}
              </p>
              <p>{t("settings.aboutBody")}</p>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span>{t("settings.version")}</span>
                <span className="font-semibold tabular-nums">{APP_VERSION}</span>
              </div>
              <Link
                href="/privacy"
                className="font-semibold text-primary underline"
              >
                {t("settings.privacyPolicy")}
              </Link>
            </CardContent>
          </Card>

          {/* Admin (admins only) — at the very bottom */}
          {showAdmin && (
            <Card>
              <CardContent className="py-4">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 font-semibold"
                >
                  <ShieldCheck className="size-5 text-primary" />
                  <span className="flex-1">{t("settings.admin")}</span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
