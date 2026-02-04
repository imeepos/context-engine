import { DynamicModule, Injector, Module } from "@sker/core";
import { Browser, createBrowser, Route, ROUTES } from "./browser";

@Module({})
export class PromptRendererModule {
    static forRoot(routes: Route[]): DynamicModule {
        return {
            module: PromptRendererModule,
            providers: [
                ...routes.map(route => {
                    return { provide: ROUTES, useValue: route, multi: true }
                }),
                { provide: Browser, useFactory: (injector: Injector) => createBrowser([], injector), deps: [Injector] }
            ]
        }
    }
}