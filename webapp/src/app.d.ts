// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { LogLayer } from "loglayer";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      requestId: string;
      log: LogLayer;
      user: { uid: string; email: string | null } | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
