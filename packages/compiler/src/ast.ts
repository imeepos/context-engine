import { Injector } from "@sker/core";


export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}

// ==================== Anthropic Request Types ====================
export type AnthropicRequestRole = 'user' | 'assistant';

export interface AnthropicRequestMessage {
    role: AnthropicRequestRole;
    content: string | AnthropicContentBlock[];
}

export interface AnthropicToolInputSchema {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
}

export interface AnthropicTool {
    name: string;
    description: string;
    input_schema: AnthropicToolInputSchema;
}

export class AnthropicRequestAst extends Ast {
    model!: string;
    messages!: AnthropicRequestMessage[];
    max_tokens!: number;
    system?: string;
    temperature?: number;
    tools?: AnthropicTool[];
    stream?: boolean;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicRequestAst(this, ctx);
    }
}

// ==================== OpenAI Request Types ====================
export type OpenAIRequestRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OpenAIRequestMessage {
    role: OpenAIRequestRole;
    content: string;
    name?: string;
    tool_calls?: OpenAiToolCall[];
    tool_call_id?: string;
}

export interface OpenAIFunction {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface OpenAITool {
    type: 'function';
    function: OpenAIFunction;
}

export class OpenAIRequestAst extends Ast {
    model!: string;
    messages!: OpenAIRequestMessage[];
    temperature?: number;
    max_tokens?: number;
    tools?: OpenAITool[];
    stream?: boolean;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIRequestAst(this, ctx);
    }
}

// ==================== Google Request Types ====================
export interface GoogleGenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
}

export interface GoogleToolFunctionDeclaration {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface GoogleTool {
    functionDeclarations: GoogleToolFunctionDeclaration[];
}

export class GoogleRequestAst extends Ast {
    contents!: GoogleContent[];
    generationConfig?: GoogleGenerationConfig;
    tools?: GoogleTool[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitGoogleRequestAst(this, ctx);
    }
}

// ==================== Anthropic Response Types ====================
export type AnthropicRole = `assistant`
export interface AnthropicUsage {
    input_tokens: number;
    output_tokens: number;
}
export interface AnthropicContentThinkingBlock {
    type: 'thinking';
    thinking: string;
    signature: string;
}
export interface AnthropicContentTextBlock {
    text: string;
    type: `text`;
}
export interface AnthropicToolUseBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, any>;
}
export interface AnthropicToolResultBlock {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
    is_error?: boolean;
}

export type AnthropicContentBlock = AnthropicContentTextBlock | AnthropicContentThinkingBlock | AnthropicToolUseBlock | AnthropicToolResultBlock;

export class AnthropicResponseAst extends Ast {
    id!: string;
    model!: string;
    role!: AnthropicRole;
    stop_reason!: string;
    stop_sequence!: null | string;
    type!: string;
    usage!: AnthropicUsage;
    content!: AnthropicContentBlock[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicResponseAst(this, ctx);
    }
}

export class AnthropicMessageStartAst extends Ast {
    type!: 'message_start';
    message!: AnthropicResponseAst;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageStartAst(this, ctx);
    }
}

export class AnthropicContentBlockDeltaAst extends Ast {
    type!: 'content_block_delta';
    index!: number;
    delta!: { type: string; text?: string; thinking?: string; signature?: string; partial_json?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockDeltaAst(this, ctx);
    }
}

export class AnthropicContentBlockStartAst extends Ast {
    type!: 'content_block_start';
    index!: number;
    content_block!: { type: string; text?: string; thinking?: string; id?: string; name?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockStartAst(this, ctx);
    }
}

export class AnthropicContentBlockStopAst extends Ast {
    type!: 'content_block_stop';
    index!: number;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockStopAst(this, ctx);
    }
}

export class AnthropicMessageDeltaAst extends Ast {
    type!: 'message_delta';
    delta!: { stop_reason?: string; stop_sequence?: string | null };
    usage!: { output_tokens: number };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageDeltaAst(this, ctx);
    }
}

export class AnthropicMessageStopAst extends Ast {
    type!: 'message_stop';
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageStopAst(this, ctx);
    }
}
export type OpenAIRole = `assistant`;
export interface OpenAiToolCall {
    index: number;
    id?: string;
    type?: string;
    function?: {
        name?: string;
        arguments?: string;
    };
}
export interface OpenAiDelta {
    content: string;
    role: OpenAIRole;
    reasoning_content: string | null;
    tool_calls?: OpenAiToolCall[];
}
export interface OpenAiChoice {
    index: number;
    finish_reason: string | null;
    delta: OpenAiDelta;
}
export interface OpenAiUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
export class OpenAiResponseAst extends Ast {
    id!: string;
    object!: string;
    created!: number;
    model!: string;
    system_fingerprint!: string;
    usage!: OpenAiUsage;
    choices!: OpenAiChoice[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAiResponseAst(this, ctx);
    }
}

// Google Vertex AI 类型定义
export interface GoogleFunctionCall {
    name: string;
    args: Record<string, unknown>;
}

export interface GoogleFunctionResponse {
    name: string;
    response: {
        content: string;
    };
}

export interface GoogleTextPart {
    text: string;
}

export interface GoogleFunctionCallPart {
    functionCall: GoogleFunctionCall;
    thoughtSignature: string;
}

export interface GoogleFunctionResponsePart {
    functionResponse: GoogleFunctionResponse;
    thoughtSignature: string;
}

export type GoogleContentPart = GoogleTextPart | GoogleFunctionCallPart | GoogleFunctionResponsePart;

export interface GoogleContent {
    role: 'user' | 'model' | 'function';
    parts: GoogleContentPart[];
}

export interface GoogleCandidate {
    content: GoogleContent;
    finishReason: string;
}

export interface GoogleTokenDetails {
    modality: string;
    tokenCount: number;
}

export interface GoogleUsageMetadata {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    trafficType: string;
    promptTokensDetails: GoogleTokenDetails[];
    candidatesTokensDetails: GoogleTokenDetails[];
    thoughtsTokenCount: number;
}

export interface GoogleToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface GoogleMessage {
    role: 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: GoogleToolCall[];
    tool_call_id?: string;
    thought_signature?: string;
}

export class GoogleResponseAst extends Ast {
    candidates!: GoogleCandidate[];
    usageMetadata!: GoogleUsageMetadata;
    modelVersion!: string;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitGoogleResponseAst(this, ctx);
    }
}

export interface Visitor {
    visit(ast: Ast, ctx: any): any;
    visitAnthropicRequestAst(ast: AnthropicRequestAst, ctx: any): any;
    visitOpenAIRequestAst(ast: OpenAIRequestAst, ctx: any): any;
    visitGoogleRequestAst(ast: GoogleRequestAst, ctx: any): any;
    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any): any;
    visitGoogleResponseAst(ast: GoogleResponseAst, ctx: any): any;
    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any): any;
    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any): any;
    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any): any;
    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any): any;
    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any): any;
    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any): any;
    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any): any;
    visitUnifiedRequestAst(ast: UnifiedRequestAst, ctx: any): any;
    visitUnifiedResponseAst(ast: UnifiedResponseAst, ctx: any): any;
    visitUnifiedStreamEventAst(ast: UnifiedStreamEventAst, ctx: any): any;
    visitMCPRequestAst(ast: MCPRequestAst, ctx: any): any;
    visitMCPResponseAst(ast: MCPResponseAst, ctx: any): any;
}

export abstract class BaseVisitor implements Visitor {
    visit(ast: Ast, ctx: any): any {
        return ast.visit(this, ctx);
    }
    visitAnthropicRequestAst(ast: AnthropicRequestAst, ctx: any): any {
        return null;
    }
    visitOpenAIRequestAst(ast: OpenAIRequestAst, ctx: any): any {
        return null;
    }
    visitGoogleRequestAst(ast: GoogleRequestAst, ctx: any): any {
        return null;
    }
    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any): any {
        return null;
    }
    visitGoogleResponseAst(ast: GoogleResponseAst, ctx: any): any {
        return null;
    }
    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any): any {
        return null;
    }
    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any): any {
        return null;
    }
    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any): any {
        return null;
    }
    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any): any {
        return null;
    }
    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any): any {
        return null;
    }
    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any): any {
        return null;
    }
    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any): any {
        return null;
    }
    visitUnifiedRequestAst(ast: UnifiedRequestAst, ctx: any): any {
        return null;
    }
    visitUnifiedResponseAst(ast: UnifiedResponseAst, ctx: any): any {
        return null;
    }
    visitUnifiedStreamEventAst(ast: UnifiedStreamEventAst, ctx: any): any {
        return null;
    }
    visitMCPRequestAst(ast: MCPRequestAst, ctx: any): any {
        return null;
    }
    visitMCPResponseAst(ast: MCPResponseAst, ctx: any): any {
        return null;
    }
}

// ==================== 统一请求 AST ====================

export type UnifiedProvider = 'anthropic' | 'openai' | 'google';
export type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool';

export interface UnifiedMessage {
    role: UnifiedRole;
    content: string | UnifiedContent[];
}

export interface UnifiedTextContent {
    type: 'text';
    text: string;
}

export interface UnifiedThinkingContent {
    type: 'thinking';
    thinking: string;
    signature?: string;
}

export interface UnifiedToolUseContent {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export interface UnifiedToolResultContent {
    type: 'tool_result';
    toolUseId: string;
    toolName?: string;
    content: string;
    isError?: boolean;
}

export interface UnifiedImageContent {
    type: 'image';
    source: { type: 'base64' | 'url'; mediaType?: string; data?: string; url?: string };
}
export type UnifiedContent = UnifiedTextContent | UnifiedThinkingContent | UnifiedToolUseContent | UnifiedToolResultContent | UnifiedImageContent;
export function isUnifiedTextContent(val: UnifiedContent): val is UnifiedTextContent {
    return val.type === 'text';
}

export function isUnifiedThinkingContent(val: UnifiedContent): val is UnifiedThinkingContent {
    return val.type === 'thinking';
}

export function isUnifiedToolUseContent(val: UnifiedContent): val is UnifiedToolUseContent {
    return val.type === 'tool_use';
}

export function isUnifiedToolResultContent(val: UnifiedContent): val is UnifiedToolResultContent {
    return val.type === 'tool_result';
}

export function isUnifiedImageContent(val: UnifiedContent): val is UnifiedImageContent {
    return val.type === 'image';
}

export type UnifiedStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'content_filter' | 'error';

export interface UnifiedUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    _anthropic?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
    _openai?: { prompt_tokens_details?: any; completion_tokens_details?: any };
    _google?: { trafficType?: string; promptTokensDetails?: any[]; candidatesTokensDetails?: any[]; thoughtsTokenCount?: number };
}

export class UnifiedRequestAst extends Ast {
    model!: string;
    messages!: UnifiedMessage[];
    system?: string;
    tools?: UnifiedTool[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stream?: boolean;
    stopSequences?: string[];
    _provider?: UnifiedProvider;
    _original?: any;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedRequestAst(this, ctx);
    }
}

export class UnifiedResponseAst extends Ast {
    id?: string;
    model?: string;
    role!: 'assistant';
    content!: UnifiedContent[];
    stopReason?: UnifiedStopReason;
    usage?: UnifiedUsage;
    _provider?: UnifiedProvider;
    _original?: any;
    _anthropic?: { stop_sequence?: string | null; type?: string };
    _openai?: { object?: string; created?: number; system_fingerprint?: string };
    _google?: { modelVersion?: string; finishReason?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedResponseAst(this, ctx);
    }
}

export type UnifiedStreamEventType = 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';

export class UnifiedStreamEventAst extends Ast {
    eventType!: UnifiedStreamEventType;
    message?: Partial<UnifiedResponseAst>;
    contentBlock?: { index: number; type: string; delta?: Partial<UnifiedContent> };
    _provider?: UnifiedProvider;
    _original?: any;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedStreamEventAst(this, ctx);
    }
}

// 工具定义类型
export interface UnifiedToolParameters {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
}

export interface UnifiedTool {
    name: string;
    description: string;
    parameters: UnifiedToolParameters;
    execute: (params: Record<string, any>, injector: Injector) => Promise<any>;
}

// ==================== MCP Request/Response Types ====================

export class MCPRequestAst extends Ast {
    method!: string;
    params?: Record<string, unknown>;
    id?: string | number;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitMCPRequestAst(this, ctx);
    }
}

export class MCPResponseAst extends Ast {
    id!: string | number | null;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitMCPResponseAst(this, ctx);
    }
}
