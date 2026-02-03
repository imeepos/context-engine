/**
 * https://developers.cloudflare.com/d1/
 */

import { Injectable } from "@sker/core";

@Injectable({ providedIn: 'root' })
export class HelloService {
    version: string;
    constructor() {
        this.version = new Date().getTime().toString()
    }
}