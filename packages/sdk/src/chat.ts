import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

export type ChatMessageKind = "text" | "note" | "poll" | "sched";

export interface PublicChatMessage {
  id: string;
  kind: ChatMessageKind;
  body: string;
  matchId: string | null;
  authorPlayerId: string | null;
  authorSubjectId: string | null;
  authorName: string | null;
  reactions: Record<string, string[]>;
  createdAt: string;
}

export interface ListChatQuery {
  limit?: number;
  before?: string;
}

export interface ListChatResponse {
  messages: PublicChatMessage[];
}

export interface PostChatRequest {
  body: string;
}

export interface PostChatResponse {
  message: PublicChatMessage;
}

export interface ReactChatRequest {
  emoji: string;
}

export interface ReactChatResponse {
  message: PublicChatMessage;
}

/**
 * Squad chat resource client (docs/design/rondo-v5-spec.md §4 Chat).
 * Org-scoped. System messages (`note`/`poll`/`sched`) are inserted by
 * workers on lifecycle events, not posted through this client.
 */
export class ChatClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/chat?limit=&before= — newest first. */
  listChat(orgId: string, query: ListChatQuery = {}, opts: RequestOptions = {}): Promise<ListChatResponse> {
    return this.transport.request<ListChatResponse>(
      {
        method: "GET",
        path: `${orgBase(orgId)}/chat`,
        query: { limit: query.limit, before: query.before },
      },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/chat — post a text message (author from actor). */
  postChat(orgId: string, body: PostChatRequest, opts: RequestOptions = {}): Promise<PostChatResponse> {
    return this.transport.request<PostChatResponse>(
      { method: "POST", path: `${orgBase(orgId)}/chat`, body },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/chat/:messageId/reactions — toggle the caller's reaction. */
  reactChat(
    orgId: string,
    messageId: string,
    body: ReactChatRequest,
    opts: RequestOptions = {},
  ): Promise<ReactChatResponse> {
    return this.transport.request<ReactChatResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/chat/${encodeURIComponent(messageId)}/reactions`, body },
      opts,
    );
  }
}
