import { describe, it, expect } from "vitest";
import {
  parseHavenChatsParams,
  manilaDayRangeUtc,
  buildDateRangeWhere,
  buildListWhere,
  truncate,
  isQaSession,
  parseToolNames,
  buildConversationSummaries,
  formatManilaDateTime,
} from "@/lib/haven-chats";

describe("parseHavenChatsParams", () => {
  it("defaults to page 1, no filters, empty search", () => {
    expect(parseHavenChatsParams({})).toEqual({ from: undefined, to: undefined, search: "", page: 1 });
  });

  it("accepts valid from/to date keys", () => {
    const filters = parseHavenChatsParams({ from: "2026-10-01", to: "2026-10-23" });
    expect(filters.from).toBe("2026-10-01");
    expect(filters.to).toBe("2026-10-23");
  });

  it("drops malformed dates rather than throwing", () => {
    const filters = parseHavenChatsParams({ from: "not-a-date", to: "2026/10/23" });
    expect(filters.from).toBeUndefined();
    expect(filters.to).toBeUndefined();
  });

  it("trims and caps search length", () => {
    const filters = parseHavenChatsParams({ search: `  ${"a".repeat(300)}  ` });
    expect(filters.search.length).toBe(200);
    expect(filters.search.startsWith(" ")).toBe(false);
  });

  it("clamps an invalid or non-positive page to 1", () => {
    expect(parseHavenChatsParams({ page: "0" }).page).toBe(1);
    expect(parseHavenChatsParams({ page: "-5" }).page).toBe(1);
    expect(parseHavenChatsParams({ page: "not-a-number" }).page).toBe(1);
  });

  it("accepts a valid page number", () => {
    expect(parseHavenChatsParams({ page: "3" }).page).toBe(3);
  });

  it("takes the first value when a param repeats", () => {
    expect(parseHavenChatsParams({ search: ["first", "second"] }).search).toBe("first");
  });
});

describe("manilaDayRangeUtc", () => {
  it("converts a Manila calendar day to its UTC instant range", () => {
    const { start, end } = manilaDayRangeUtc("2026-10-23");
    // Manila is UTC+8 with no DST, so local midnight is 16:00 UTC the prior day.
    expect(start.toISOString()).toBe("2026-10-22T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-23T16:00:00.000Z");
  });

  it("produces a 24-hour half-open range", () => {
    const { start, end } = manilaDayRangeUtc("2026-01-01");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("buildDateRangeWhere", () => {
  it("returns an empty where when no range is given", () => {
    expect(buildDateRangeWhere({})).toEqual({});
  });

  it("sets only gte when only from is given", () => {
    const where = buildDateRangeWhere({ from: "2026-10-01" }) as { createdAt: { gte?: Date; lt?: Date } };
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lt).toBeUndefined();
  });

  it("sets only lt when only to is given", () => {
    const where = buildDateRangeWhere({ to: "2026-10-23" }) as { createdAt: { gte?: Date; lt?: Date } };
    expect(where.createdAt.lt).toBeInstanceOf(Date);
    expect(where.createdAt.gte).toBeUndefined();
  });

  it("sets both bounds when both are given", () => {
    const where = buildDateRangeWhere({ from: "2026-10-01", to: "2026-10-23" }) as {
      createdAt: { gte?: Date; lt?: Date };
    };
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lt).toBeInstanceOf(Date);
  });
});

describe("buildListWhere", () => {
  it("has no OR clause when search is empty", () => {
    const where = buildListWhere({ search: "", page: 1 }) as Record<string, unknown>;
    expect(where.OR).toBeUndefined();
  });

  it("adds an OR across sessionId and content when search is set", () => {
    const where = buildListWhere({ search: "wifi", page: 1 }) as { OR: unknown[] };
    expect(where.OR).toEqual([{ sessionId: { contains: "wifi" } }, { content: { contains: "wifi" } }]);
  });

  it("combines the date range and the search filter", () => {
    const where = buildListWhere({ from: "2026-10-01", search: "wifi", page: 1 }) as {
      createdAt: unknown;
      OR: unknown[];
    };
    expect(where.createdAt).toBeDefined();
    expect(where.OR).toBeDefined();
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("trims surrounding whitespace", () => {
    expect(truncate("  hello  ", 10)).toBe("hello");
  });

  it("cuts long text and adds an ellipsis within the max length", () => {
    const result = truncate("a".repeat(50), 10);
    expect(result.length).toBe(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("isQaSession", () => {
  it("flags sessionIds starting with hilpm-", () => {
    expect(isQaSession("hilpm-abc123")).toBe(true);
  });

  it("does not flag a real guest sessionId", () => {
    expect(isQaSession("a1b2c3d4-e5f6-7890")).toBe(false);
  });
});

describe("parseToolNames", () => {
  it("returns [] for null/undefined", () => {
    expect(parseToolNames(null)).toEqual([]);
    expect(parseToolNames(undefined)).toEqual([]);
  });

  it("parses a valid JSON array of strings", () => {
    expect(parseToolNames('["list_properties","resolve_dates"]')).toEqual(["list_properties", "resolve_dates"]);
  });

  it("returns [] for invalid JSON rather than throwing", () => {
    expect(parseToolNames("not json")).toEqual([]);
  });

  it("returns [] and filters out non-string entries for a non-array or mixed-type JSON value", () => {
    expect(parseToolNames('{"a":1}')).toEqual([]);
    expect(parseToolNames('["ok", 2, null]')).toEqual(["ok"]);
  });
});

describe("formatManilaDateTime", () => {
  it("renders in Asia/Manila regardless of runtime timezone", () => {
    // 2026-01-01T00:00:00Z is 2026-01-01 8:00 AM in Manila (UTC+8).
    const formatted = formatManilaDateTime(new Date("2026-01-01T00:00:00Z"));
    expect(formatted).toContain("2026");
    expect(formatted).toContain("8:00 AM");
  });
});

describe("buildConversationSummaries", () => {
  const order = [
    { sessionId: "s1", lastMessageAt: new Date("2026-10-23T10:00:00Z") },
    { sessionId: "hilpm-qa", lastMessageAt: new Date("2026-10-23T09:00:00Z") },
  ];

  it("merges message counts, first message, and usage sums by sessionId", () => {
    const result = buildConversationSummaries(
      order,
      [{ sessionId: "s1", count: 4 }, { sessionId: "hilpm-qa", count: 2 }],
      [
        { sessionId: "s1", lang: "en", content: "Do you have a pool?" },
        { sessionId: "hilpm-qa", lang: "tl", content: "test message" },
      ],
      [{ sessionId: "s1", costUsd: 0.0123, turnCount: 2 }]
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      sessionId: "s1",
      lang: "en",
      messageCount: 4,
      firstGuestQuestion: "Do you have a pool?",
      costUsd: 0.0123,
      turnCount: 2,
      isQaSession: false,
    });
    expect(result[1]).toMatchObject({
      sessionId: "hilpm-qa",
      lang: "tl",
      messageCount: 2,
      firstGuestQuestion: "test message",
      costUsd: null,
      turnCount: 0,
      isQaSession: true,
    });
  });

  it("preserves the input order (latest message first) regardless of stats array order", () => {
    const result = buildConversationSummaries(order, [], [], []);
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "hilpm-qa"]);
  });

  it("defaults sanely when a session has no matching stats rows at all", () => {
    const result = buildConversationSummaries(order, [], [], []);
    expect(result[0]).toMatchObject({
      lang: "auto",
      messageCount: 0,
      firstGuestQuestion: "",
      costUsd: null,
      turnCount: 0,
    });
  });
});
