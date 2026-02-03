import { Injectable } from '@sker/core'
import { Observable, reduce, firstValueFrom } from 'rxjs'
import {
    AnthropicRequestAst,
    AnthropicResponseAst,
    AnthropicMessageStartAst,
    AnthropicContentBlockDeltaAst,
    AnthropicContentBlockStartAst,
    AnthropicContentBlockStopAst,
    AnthropicMessageDeltaAst,
    AnthropicMessageStopAst,
    Ast,
    OpenAIRequestAst,
    OpenAiResponseAst,
    GoogleRequestAst,
    GoogleResponseAst,
    Visitor,
    AnthropicContentBlock,
    OpenAiToolCall
} from "./ast";

export interface AggregatedMessage {
    content?: string | AnthropicContentBlock[]
    tool_calls?: OpenAiToolCall[]
    finish_reason?: string | null
    stop_reason?: string | null
    id?: string
    model?: string
    role?: string
    usage?: any
}

@Injectable()
export class ParserVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }

    visitAnthropicRequestAst(ast: AnthropicRequestAst, ctx: any) {
        ast.model = ctx.model;
        ast.messages = ctx.messages;
        ast.max_tokens = ctx.max_tokens;
        ast.system = ctx.system;
        ast.temperature = ctx.temperature;
        ast.tools = ctx.tools;
        ast.stream = ctx.stream;
        return ast;
    }

    visitOpenAIRequestAst(ast: OpenAIRequestAst, ctx: any) {
        ast.model = ctx.model;
        ast.messages = ctx.messages;
        ast.temperature = ctx.temperature;
        ast.max_tokens = ctx.max_tokens;
        ast.tools = ctx.tools;
        ast.stream = ctx.stream;
        return ast;
    }

    visitGoogleRequestAst(ast: GoogleRequestAst, ctx: any) {
        ast.contents = ctx.contents;
        ast.generationConfig = ctx.generationConfig;
        ast.tools = ctx.tools;
        return ast;
    }

    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any) {
        ast.id = ctx.id;
        ast.created = ctx.created;
        ast.model = ctx.model;
        ast.object = ctx.object;
        ast.system_fingerprint = ctx.system_fingerprint;
        ast.usage = ctx.usage;
        ast.choices = ctx.choices;
        return ast;
    }

    visitGoogleResponseAst(ast: GoogleResponseAst, ctx: any) {
        ast.candidates = ctx.candidates;
        ast.usageMetadata = ctx.usageMetadata;
        ast.modelVersion = ctx.modelVersion;
        return ast;
    }

    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any) {
        ast.id = ctx.id;
        ast.content = ctx.content;
        ast.model = ctx.model;
        ast.role = ctx.role;
        ast.stop_reason = ctx.stop_reason;
        ast.stop_sequence = ctx.stop_sequence;
        ast.type = ctx.type;
        ast.usage = ctx.usage;
        return ast;
    }

    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any) {
        ast.type = ctx.type;
        ast.message = this.visitAnthropicResponseAst(new AnthropicResponseAst(), ctx.message);
        return ast;
    }

    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        ast.delta = ctx.delta;
        return ast;
    }

    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        ast.content_block = ctx.content_block;
        return ast;
    }

    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        return ast;
    }

    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any) {
        ast.type = ctx.type;
        ast.delta = ctx.delta;
        ast.usage = ctx.usage;
        return ast;
    }

    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any) {
        ast.type = ctx.type;
        return ast;
    }

    visitUnifiedRequestAst(ast: any, ctx: any): any {
        return ast;
    }

    visitUnifiedResponseAst(ast: any, ctx: any): any {
        return ast;
    }

    visitUnifiedStreamEventAst(ast: any, ctx: any): any {
        return ast;
    }

    visitMCPRequestAst(ast: any, ctx: any): any {
        return ast;
    }

    visitMCPResponseAst(ast: any, ctx: any): any {
        return ast;
    }

    async visitResponse(response: Response): Promise<Ast | Observable<Ast>> {
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${error}`)
        }

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            return this.parseStream(response)
        }

        const data = await response.json()
        return this.parseJson(data)
    }

    private parseStream(response: Response): Observable<Ast> {
        return new Observable(subscriber => {
            const reader = response.body?.getReader()
            if (!reader) {
                subscriber.error(new Error('No response body'))
                return
            }

            const decoder = new TextDecoder()
            let buffer = ''

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() || ''

                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                const data = line.slice(5).trim()
                                if (data === '[DONE]') continue

                                try {
                                    const json = JSON.parse(data)
                                    const ast = this.parseJson(json)
                                    subscriber.next(ast)
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }
                    subscriber.complete()
                } catch (error) {
                    subscriber.error(error)
                }
            }

            processStream()

            return () => reader.cancel()
        })
    }

    private parseJson(data: any): Ast {
        if (data.choices) {
            return this.visitOpenAiResponseAst(new OpenAiResponseAst(), data)
        }

        if (data.type === 'message_start') {
            return this.visitAnthropicMessageStartAst(new AnthropicMessageStartAst(), data)
        }

        if (data.type === 'content_block_delta') {
            return this.visitAnthropicContentBlockDeltaAst(new AnthropicContentBlockDeltaAst(), data)
        }

        if (data.type === 'content_block_start') {
            return this.visitAnthropicContentBlockStartAst(new AnthropicContentBlockStartAst(), data)
        }

        if (data.type === 'content_block_stop') {
            return this.visitAnthropicContentBlockStopAst(new AnthropicContentBlockStopAst(), data)
        }

        if (data.type === 'message_delta') {
            return this.visitAnthropicMessageDeltaAst(new AnthropicMessageDeltaAst(), data)
        }

        if (data.type === 'message_stop') {
            return this.visitAnthropicMessageStopAst(new AnthropicMessageStopAst(), data)
        }

        if (data.content || data.type === 'message') {
            return this.visitAnthropicResponseAst(new AnthropicResponseAst(), data)
        }

        if (data.candidates) {
            return this.visitGoogleResponseAst(new GoogleResponseAst(), data)
        }

        throw new Error(`Unknown response format: ${JSON.stringify(data)}`)
    }

    async visitResponseAggregated(response: Response): Promise<AggregatedMessage> {
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${error}`)
        }

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            return this.parseStreamAggregated(response)
        }

        const data = await response.json()
        return this.convertToAggregatedMessage(this.parseJson(data))
    }

    private async parseStreamAggregated(response: Response): Promise<AggregatedMessage> {
        const stream$ = this.parseStream(response)
        const result = await firstValueFrom(
            stream$.pipe(
                reduce((acc, ast) => this.aggregateAst(acc, ast), this.createEmptyAggregatedMessage())
            )
        )
        // 解析 tool_use 的 input JSON
        for (const block of result._contentBlocks) {
            if (block?.type === 'tool_use' && block._inputJson) {
                let jsonStr = block._inputJson.trim()
                // 兼容某些模型不发送开头 { 的情况
                if (!jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
                    jsonStr = '{' + jsonStr
                }
                try {
                    block.input = JSON.parse(jsonStr)
                } catch {
                    // ignore
                }
                delete block._inputJson
            }
        }
        result.content = result._contentBlocks.filter(Boolean) as AnthropicContentBlock[]
        // 清理内部字段
        delete (result as any)._contentBlocks
        delete (result as any)._toolCallsMap
        return result
    }

    private createEmptyAggregatedMessage(): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        return {
            content: undefined,
            tool_calls: undefined,
            finish_reason: null,
            stop_reason: null,
            id: undefined,
            model: undefined,
            role: undefined,
            usage: undefined,
            _contentBlocks: [],
            _toolCallsMap: new Map()
        }
    }

    private aggregateAst(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: Ast): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        if (ast instanceof OpenAiResponseAst) {
            return this.aggregateOpenAi(acc, ast)
        }
        if (ast instanceof AnthropicMessageStartAst) {
            return this.aggregateAnthropicMessageStart(acc, ast)
        }
        if (ast instanceof AnthropicContentBlockStartAst) {
            return this.aggregateAnthropicContentBlockStart(acc, ast)
        }
        if (ast instanceof AnthropicContentBlockDeltaAst) {
            return this.aggregateAnthropicContentBlockDelta(acc, ast)
        }
        if (ast instanceof AnthropicMessageDeltaAst) {
            return this.aggregateAnthropicMessageDelta(acc, ast)
        }
        return acc
    }

    private aggregateOpenAi(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: OpenAiResponseAst): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        if (!acc.id && ast.id) acc.id = ast.id
        if (!acc.model && ast.model) acc.model = ast.model
        if (ast.usage) acc.usage = ast.usage

        const choice = ast.choices?.[0]
        if (!choice) return acc

        if (choice.finish_reason) {
            acc.finish_reason = choice.finish_reason
        }

        const delta = choice.delta
        if (!delta) return acc

        if (!acc.role && delta.role) acc.role = delta.role

        if (delta.content) {
            acc.content = (acc.content as string || '') + delta.content
        }

        if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
                const existing = acc._toolCallsMap.get(tc.index)
                if (existing) {
                    if (tc.function?.arguments) {
                        existing.function = existing.function || { name: '', arguments: '' }
                        existing.function.arguments = (existing.function.arguments || '') + tc.function.arguments
                    }
                } else {
                    acc._toolCallsMap.set(tc.index, {
                        index: tc.index,
                        id: tc.id,
                        type: tc.type,
                        function: tc.function ? { name: tc.function.name || '', arguments: tc.function.arguments || '' } : undefined
                    })
                }
            }
            acc.tool_calls = Array.from(acc._toolCallsMap.values())
        }

        return acc
    }

    private aggregateAnthropicMessageStart(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: AnthropicMessageStartAst): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        acc.id = ast.message.id
        acc.model = ast.message.model
        acc.role = ast.message.role
        acc.usage = ast.message.usage
        return acc
    }

    private aggregateAnthropicContentBlockStart(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: AnthropicContentBlockStartAst): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        const block = ast.content_block
        if (block.type === 'text') {
            acc._contentBlocks[ast.index] = { type: 'text', text: block.text || '' }
        } else if (block.type === 'thinking') {
            acc._contentBlocks[ast.index] = { type: 'thinking', thinking: block.thinking || '', signature: '' }
        } else if (block.type === 'tool_use') {
            acc._contentBlocks[ast.index] = { type: 'tool_use', id: block.id, name: block.name, input: {} }
        }
        return acc
    }

    private aggregateAnthropicContentBlockDelta(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: AnthropicContentBlockDeltaAst): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        const block = acc._contentBlocks[ast.index]
        if (!block) return acc

        if (ast.delta.type === 'text_delta' && ast.delta.text) {
            block.text = (block.text || '') + ast.delta.text
        } else if (ast.delta.type === 'thinking_delta' && ast.delta.thinking) {
            block.thinking = (block.thinking || '') + ast.delta.thinking
        } else if (ast.delta.type === 'signature_delta' && ast.delta.signature) {
            block.signature = (block.signature || '') + ast.delta.signature
        } else if (ast.delta.type === 'input_json_delta' && ast.delta.partial_json !== undefined) {
            block._inputJson = (block._inputJson || '') + ast.delta.partial_json
        }

        acc.content = acc._contentBlocks.filter(Boolean) as AnthropicContentBlock[]
        return acc
    }

    private aggregateAnthropicMessageDelta(acc: AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> }, ast: AnthropicMessageDeltaAst): AggregatedMessage & { _contentBlocks: any[], _toolCallsMap: Map<number, OpenAiToolCall> } {
        if (ast.delta.stop_reason) {
            acc.stop_reason = ast.delta.stop_reason
        }
        if (ast.usage) {
            acc.usage = { ...acc.usage, output_tokens: ast.usage.output_tokens }
        }
        return acc
    }

    private convertToAggregatedMessage(ast: Ast): AggregatedMessage {
        if (ast instanceof OpenAiResponseAst) {
            const choice = ast.choices?.[0]
            return {
                id: ast.id,
                model: ast.model,
                role: choice?.delta?.role,
                content: choice?.delta?.content,
                tool_calls: choice?.delta?.tool_calls,
                finish_reason: choice?.finish_reason,
                usage: ast.usage
            }
        }
        if (ast instanceof AnthropicResponseAst) {
            return {
                id: ast.id,
                model: ast.model,
                role: ast.role,
                content: ast.content,
                stop_reason: ast.stop_reason,
                usage: ast.usage
            }
        }
        if (ast instanceof GoogleResponseAst) {
            const candidate = ast.candidates?.[0]
            const content = candidate?.content
            return {
                model: ast.modelVersion,
                role: content?.role === 'model' ? 'assistant' : content?.role,
                content: content?.parts?.map(p => 'text' in p ? p.text : '').join(''),
                finish_reason: candidate?.finishReason,
                usage: ast.usageMetadata
            }
        }
        return {}
    }
}