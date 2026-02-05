import { DynamicModule, Injector, Module } from "@sker/core";
import { Browser, Route, ROUTES } from "./browser";
import { UIRenderer } from "./browser/renderer";
import { BROWSER } from "./browser/tokens";

@Module({})
export class PromptRendererModule {
    static forRoot(routes: Route[]): DynamicModule {
        return {
            module: PromptRendererModule,
            providers: [
                ...routes.map(route => {
                    return { provide: ROUTES, useValue: route, multi: true }
                }),
                {
                    provide: BROWSER, useFactory: (parent: Injector) => {
                        console.log({ parent })
                        return new Browser(parent)
                    }, deps: [Injector]
                },
                { provide: Browser, useFactory: (parent: Injector) => new Browser(parent), deps: [Injector] },
                { provide: UIRenderer, useFactory: (browser: Browser) => new UIRenderer(browser), deps: [BROWSER] }
            ]
        }
    }
}