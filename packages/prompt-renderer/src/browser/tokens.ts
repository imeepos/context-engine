import { InjectionToken } from "@sker/core";
import type { Browser } from "./browser";

export const BROWSER = new InjectionToken<Browser>('BROWSER');