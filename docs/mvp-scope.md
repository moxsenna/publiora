# MVP-Scope.md — Publiora MVP

> Revision note — analytics scope: MVP analytics should stay lite: ebooks created, ebooks published, claim counts per link, export counts, and simple dashboard counters. Exclude reader heatmaps, funnel attribution, CTA click tracking, cohort retention, and source attribution from MVP.

> Revision note — infrastructure alignment: MVP implementation should assume Cloudflare Pages + Supabase. Use Supabase Auth, Supabase Postgres, Supabase Storage, and lightweight generation_jobs polling before introducing Redis/BullMQ or separate backend infrastructure.

1. Overview

Tujuan MVP Publiora:

Membuktikan bahwa creator mau:

\- membuat ebook dengan AI

\- publish ebook online

\- membagikan access link

\- menggunakan hosted reader dibanding kirim PDF manual

MVP bukan untuk:

membuat platform publishing sempurna

membuat marketplace besar

membuat Canva competitor

Fokus:

validate workflow & retention.

---

2\. MVP Success Criteria

MVP dianggap berhasil jika user:

berhasil generate ebook

publish ebook

membagikan claim link

buyer claim ebook

buyer membaca di platform

creator kembali menggunakan Publiora

---

3\. Core Hypotheses

Hypothesis 1

Creator lebih suka:

publish + claim link

dibanding:

upload PDF ke Google Drive

---

Hypothesis 2

Conversation-based AI workflow terasa lebih membantu daripada form biasa.

---

Hypothesis 3

Hosted reader meningkatkan perceived value ebook.

---

Hypothesis 4

Lead magnet & bonus ebook adalah use case paling kuat.

---

4\. MVP Audience

Primary Audience

Affiliate Marketer

Use case:

bonus produk

lead magnet

---

Digital Product Creator

Use case:

ebook funnel

onboarding asset

---

Coach / Consultant

Use case:

authority ebook

lead generation

---

5\. MVP Scope

IN SCOPE

---

5.1 Authentication

Included

register

login

logout

session management

---

5.2 Billing & Credits

Included

subscription plans (free / creator / pro)

monthly generation credits

credit top-up packs

spend credits on outline / section / title / CTA generation

---

Excluded

BYOK / user-supplied provider API keys

multi-provider key management

---

5.3 AI Conversation Strategist

Included

guided brainstorming

strategic questions

audience discovery

product alignment

---

Excluded

voice AI

memory across projects

multi-agent orchestration UI

---

5.4 Ebook Generation

Included

outline generation

section-by-section generation

rewrite tools

enhancement actions

---

Excluded

full-document generation

advanced AI image generation

AI infographic generation

---

5.5 Ebook Types

Included

Lead Magnet

Bonus Product

Sellable Ebook

---

Excluded

fiction books

academic publishing

magazine publishing

---

5.6 HTML Preview

Included

realtime preview

responsive layout

typography rendering

---

Excluded

advanced drag-drop page builder

custom CSS editor

---

5.7 Publishing System

Included

publish ebook

public/private visibility

hosted reader

---

Excluded

public creator storefront

SEO optimization dashboard

marketplace ranking

---

5.8 Claim Link System

Included

generate claim links

entitlement system

claim validation

claim limits

expiry support

---

Excluded

webhook integrations

payment verification

auto-purchase detection

---

5.9 Reader Library

Included

ebook collection

reading progress

continue reading

---

Excluded

highlights

annotations

comments

social reading

---

5.10 PDF Export

Included

export to PDF

print-friendly templates

---

Excluded

EPUB export

Kindle export

print-on-demand formatting

---

6\. Technical Constraints

AI Constraints

Because MVP uses:

platform-managed AI with subscription credits

System must:

generate incrementally

support retries

avoid giant prompts

support pause/resume

---

Ebook Limits

Max Chapters

10

---

Max Sections Per Chapter

6

---

Max Ebook Length

~30 pages

---

Max Concurrent Generation

1 active job/project

---

7\. UX Constraints

Prioritize Simplicity

MVP should NOT feel:

enterprise

overwhelming

overloaded

---

Dashboard Rule

Only show:

projects

publish status

claim links

library

Avoid:

excessive analytics

advanced configuration

---

8\. Design Constraints

UI Goals

Should feel:

premium

calm

publishing-focused

---

Avoid

neon AI style

crypto aesthetics

cluttered dashboards

excessive gradients

---

9\. Performance Targets

App Load

\< 3s initial load

---

Reader Load

\< 2s preferred

---

PDF Export

\< 30s target

---

Generation Feedback

User should always see:

progress

current task

partial generation

Never show:

blank loading screen

---

10\. Security Scope

Included

auth protection

entitlement checks

sanitized HTML rendering

rate limiting claim links

---

Excluded

enterprise security

SSO

audit logs

advanced RBAC

---

11\. Analytics Scope

Included

Basic MVP Lite:

ebooks created

ebooks published

claim counts per link

export counts

simple dashboard counters

---

Excluded

heatmaps

funnel attribution

reader analytics

cohort analysis

---

12\. Infrastructure Scope

Included

Cloudflare Pages

Supabase Auth

Supabase Postgres

Supabase Storage

lightweight generation_jobs polling

---

Excluded

microservices

Kubernetes

multi-region infra

MVP should stay:

monolithic and simple.

---

13\. Mobile Scope

Included

responsive dashboard

mobile reader

mobile claim flow

---

Excluded

native mobile app

offline reading

---

14\. Marketplace Scope

Excluded Entirely

No:

public marketplace

ebook discovery

ratings

creator profiles

monetization

Reason: Marketplace before retention is dangerous.

---

15\. AI Scope

Included

strategist agent

planner agent

writer agent

enhancement agent

title generator agent

cta generator agent

---

Excluded

autonomous agents

research agents

internet browsing AI

multi-step reasoning orchestration

---

16\. Non-Goals

Publiora MVP is NOT trying to:

replace Canva

replace Google Docs

replace Notion

replace Gumroad

replace Kindle

---

17\. Core Product Loop

The MVP must nail this loop:

Create Ebook

→ Publish

→ Share Claim Link

→ Reader Claims

→ Reader Reads

→ Creator Returns

If this loop works:

retention grows

ecosystem grows

marketplace becomes possible later

---

18\. Build Priorities

Priority 1

AI generation quality.

---

Priority 2

Hosted reading experience.

---

Priority 3

Claim link distribution.

---

Priority 4

Beautiful UX.

---

Priority 5

PDF export.

---

19\. MVP Risks

Risk 1

AI output too generic.

Mitigation:

strong prompts

chunked generation

enhancement tools

---

Risk 2

Credit exhaustion during generation.

Mitigation:

clear insufficient-credits errors

pause/resume generation

top-up + plan upgrade paths

---

Risk 3

Users still prefer PDF.

Mitigation:

premium reader UX

easier access

updateable content

mobile-first reader

---

Risk 4

Overbuilding too early.

Mitigation:

strict MVP scope

no marketplace initially

no advanced integrations

---

20\. Definition of MVP Success

Publiora MVP succeeds if creators say:

“Saya lebih suka bagikan claim link Publiora

daripada kirim PDF manual.”

That is the validation signal.
