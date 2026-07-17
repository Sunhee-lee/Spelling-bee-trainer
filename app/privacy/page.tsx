"use client";

import { Lock } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("settings.privacyPolicy")}
        icon={<Lock className="size-6 text-primary sm:size-7" />}
        backHref="/settings"
      />
      <Card>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("settings.privacyBody")}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
