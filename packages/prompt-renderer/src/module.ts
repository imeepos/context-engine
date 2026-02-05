import { DynamicModule, Module } from "@sker/core";
import { Browser, Route, ROUTES } from "./browser";
import { UIRenderer } from "./browser/renderer";

@Module({})
export class PromptRendererModule {
    static forRoot(routes: Route[]): DynamicModule {
        return {
            module: PromptRendererModule,
            providers: [
                ...routes.map(route => {
                    return { provide: ROUTES, useValue: route, multi: true }
                }),
                { provide: Browser, useClass: Browser },
                { provide: UIRenderer, useClass: UIRenderer }
            ],
            exports: [Browser, UIRenderer]
        }
    }
}