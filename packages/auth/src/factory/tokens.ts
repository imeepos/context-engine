import { InjectionToken } from "@sker/core";
import { EndpointContext } from "better-auth";
import { betterAuth } from 'better-auth';

export const BETTER_AUTH_CONTEXT = new InjectionToken<EndpointContext<string, any, any>>('BETTER_AUTH_CONTEXT');
export const BETTER_AUTH = new InjectionToken<ReturnType<typeof betterAuth>>('BETTER_AUTH');