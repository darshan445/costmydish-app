'use client';

import { useSyncExternalStore } from 'react';
import { BASE_CURRENCY, detectCurrency, isCurrencyCode } from '@/lib/currency';

const STORAGE_KEY = 'cmd_currency';
const listeners = new Set();
let current = null;

function readCurrency() {
  if (current) return current;
  let saved = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  current = isCurrencyCode(saved) ? saved : detectCurrency();
  return current;
}

function onStorage(event) {
  if (event.key !== STORAGE_KEY || !isCurrencyCode(event.newValue)) return;
  current = event.newValue;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Visitor's currency code, shared by every calculator and example on the page. Static HTML renders USD. */
export function useCurrencyCode() {
  return useSyncExternalStore(subscribe, readCurrency, () => BASE_CURRENCY);
}

export function setCurrencyCode(code) {
  if (!isCurrencyCode(code) || code === current) return;
  current = code;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the choice still applies until the tab closes
  }
  listeners.forEach((listener) => listener());
}
