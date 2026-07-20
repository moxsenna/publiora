import { describe, expect, it } from "vitest";
import { STRATEGIST_SYSTEM } from "@/lib/ai/prompts";

describe("STRATEGIST_SYSTEM prompt contract", () => {
	it("mentions suggested_replies", () => {
		expect(STRATEGIST_SYSTEM).toContain("suggested_replies");
	});

	it("mentions response_language", () => {
		expect(STRATEGIST_SYSTEM).toContain("response_language");
	});

	it("enforces at most one main question per turn", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/at most ONE main question/i);
	});

	it("defaults to Bahasa Indonesia when user language is unclear", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/default.*Bahasa Indonesia/i);
	});

		it("forbids generic meta-prompts in suggested_replies (negative rule)", () => {
			// The phrase appears ONLY as part of a forbidding rule, not as an example reply.
			expect(STRATEGIST_SYSTEM).toMatch(/Do NOT output generic meta-prompts?/i);
			// Verify no generic meta-prompt appears inside the JSON example's suggested_replies array.
			// Extract everything after "Example (" and ensure "Help me define" is not inside suggested_replies.
			const exampleStart = STRATEGIST_SYSTEM.indexOf("Example (");
			if (exampleStart !== -1) {
				const example = STRATEGIST_SYSTEM.slice(exampleStart);
				expect(example).not.toMatch(/"message":\s*"Help me define/i);
			}
		});

		it("enforces same language for assistant_message and suggested_replies", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/same language/i);
	});

	it("enforces concise assistant_message (60-120 words)", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/60.*120 words/);
	});

	it("forbids signature block in assistant_message", () => {
		expect(STRATEGIST_SYSTEM).toContain('Do NOT sign or end messages with a signature block');
	});

	it("enforces 2-4 suggested_replies when clarification is needed", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/2-4 contextual suggested_replies/i);
	});

	it("returns empty array when no clarification is needed", () => {
		expect(STRATEGIST_SYSTEM).toContain("return an empty array []");
	});

	it("JSON contract includes all required top-level fields", () => {
		const required = [
			"assistant_message",
			"state_patch",
			"readiness_score",
			"missing_fields",
			"next_action",
			"conversation_summary",
			"response_language",
			"suggested_replies",
		];
		for (const field of required) {
			expect(STRATEGIST_SYSTEM).toContain(`"${field}"`);
		}
	});

	it("JSON contract includes state_patch scalar fields", () => {
		const scalars = [
			"topic",
			"audience",
			"audience_sophistication",
			"primary_problem",
			"desired_outcome",
			"core_promise",
			"unique_angle",
			"product_or_offer",
			"funnel_goal",
			"cta_goal",
			"tone",
		];
		for (const field of scalars) {
			expect(STRATEGIST_SYSTEM).toContain(`"${field}"`);
		}
	});

	it("JSON contract includes state_patch array fields", () => {
		expect(STRATEGIST_SYSTEM).toContain("pain_points");
		expect(STRATEGIST_SYSTEM).toContain("content_pillars");
	});

	it("JSON contract includes suggested_replies sub-fields", () => {
		expect(STRATEGIST_SYSTEM).toContain('"label"');
		expect(STRATEGIST_SYSTEM).toContain('"message"');
		expect(STRATEGIST_SYSTEM).toContain('"field"');
		expect(STRATEGIST_SYSTEM).toContain('"intent"');
	});

	it("JSON contract includes intent enum values", () => {
		expect(STRATEGIST_SYSTEM).toContain("answer");
		expect(STRATEGIST_SYSTEM).toContain("ask_recommendation");
		expect(STRATEGIST_SYSTEM).toContain("confirm");
		expect(STRATEGIST_SYSTEM).toContain("clarify");
	});

	it("JSON contract includes all next_action enum values", () => {
		expect(STRATEGIST_SYSTEM).toContain("continue_strategy");
		expect(STRATEGIST_SYSTEM).toContain("create_outline");
		expect(STRATEGIST_SYSTEM).toContain("review_outline");
		expect(STRATEGIST_SYSTEM).toContain("start_writing");
	});

	it("does NOT contain old '1-2' question phrasing", () => {
		expect(STRATEGIST_SYSTEM).not.toMatch(/1-2.*question/i);
		expect(STRATEGIST_SYSTEM).not.toMatch(/1-2.*pertanyaan/i);
	});

	it("does NOT contain old contract phrasing about 'audience', 'promise', 'pillars', 'angle', 'cta' as the only fields", () => {
		// With the new prompt, we still reference these fields — but we should NOT have
		// the old narrow contract that only had 5 fields. We verify the prompt doesn't
		// contain old phrasing like "the contract only includes audience, promise, pillars, angle, cta".
		// This is a simple negative check: the word "only" should not appear near a list of fields.
		expect(STRATEGIST_SYSTEM).not.toMatch(/only.*audience.*promise.*pillars.*angle.*cta/i);
	});

	it("mentions state_patch must only contain newly inferred facts", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/newly inferred/i);
	});

	it("mentions readiness_score threshold of 70 for create_outline", () => {
		expect(STRATEGIST_SYSTEM).toContain("readiness_score is at least 70");
	});

	it("includes the complete JSON example", () => {
		expect(STRATEGIST_SYSTEM).toMatch(/area marketing\/growth mana yang paling/i);
		expect(STRATEGIST_SYSTEM).toContain('"label": "Bantu saya memilih"');
		expect(STRATEGIST_SYSTEM).toContain('"label": "Content marketing"');
	});
});
