"use client";

import { useCallback } from "react";

import type { Language } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { ko } from "@/locales/ko";
import { en } from "@/locales/en";

const dictionaries: Record<Language, typeof ko> = { ko, en };

type Tree = typeof ko;

/** Dot-path union of every leaf key, e.g. "dashboard.todayPractice". */
type Leaves<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: Leaves<T[K]> extends ""
        ? K
        : `${K}.${Leaves<T[K]>}`;
    }[keyof T & string];

export type TKey = Leaves<Tree>;

type Params = Record<string, string | number>;

function lookup(dict: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      dict
    );
  return typeof value === "string" ? value : path;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

/**
 * Translation hook. Reads the current language from the (reactive) store
 * settings, so switching language re-renders the whole tree immediately.
 */
export function useTranslation(): {
  t: (key: TKey, params?: Params) => string;
  lang: Language;
} {
  const { state } = useAppState();
  const lang = state.settings.language;
  const dict = dictionaries[lang] ?? ko;

  const t = useCallback(
    (key: TKey, params?: Params) => interpolate(lookup(dict, key), params),
    [dict]
  );

  return { t, lang };
}
