reader-experience.md — Publiora MVP

> Revision note — claim/read flow alignment: After a successful claim, the ebook is added to the reader library and the reader is redirected directly to the reader page. Library remains the permanent collection, but the post-claim experience should prioritize immediate reading.

reader-experience.md — Publiora MVP

1\. Overview

Reader Experience adalah bagian penting dari moat Publiora.

Mayoritas ebook platform berhenti di:

Download PDF

Publiora harus terasa seperti:

Modern digital reading platform

Bukan file hosting.

---

2\. Reader Experience Goals

Reader harus merasa:

membaca lebih nyaman daripada PDF

akses ebook sangat mudah

ebook terasa premium

reading progress tersimpan

ebook mudah dibuka kembali

Creator harus merasa:

bonus produk lebih profesional

reader tetap berada di ecosystem Publiora

ebook mudah diupdate

---

3\. Core Principles

3.1 Reading First

UI harus fokus pada:

readability

typography

immersion

Bukan toolbar dan controls.

---

3.2 Calm Interface

Reader harus terasa:

clean

elegant

distraction-free

---

3.3 HTML-Native Experience

Reader bukan PDF viewer.

Ebook harus terasa seperti:

Medium article

Notion document

modern publishing page

---

3.4 Fast Access

Reader harus bisa:

claim → open → read

secepat mungkin.

---

4\. Reader URL Structure

Public Reader

publiora.web.id/read/:slug

---

Private Reader

Requires authentication + entitlement.

---

Claim Link

publiora.web.id/claim/:token

---

5\. Reader Layout

Desktop Layout

-------------------------------------------------

\| Top Bar \|

-------------------------------------------------

\| TOC Sidebar \| Reading Area \| CTA / Progress \|

-------------------------------------------------

---

Mobile Layout

---------------------------------

\| Top Bar \|

---------------------------------

\| Reading Area \|

---------------------------------

\| Floating TOC Button \|

---------------------------------

---

6\. Reader Components

6.1 Top Bar

Contains:

Publiora logo

ebook title

reading progress

library button

Should remain minimal.

Avoid crowded controls.

---

6.2 Table of Contents

Features:

chapter list

active chapter highlight

quick navigation

---

TOC Style

Should feel:

lightweight

subtle

elegant

Avoid:

heavy sidebar styling

too many nested levels

---

6.3 Reading Area

The most important component.

Requirements:

wide margins

comfortable line spacing

large readable typography

distraction-free layout

---

Reading Width

max-width: 720px;

---

Typography

font-size: 18px;

line-height: 1.9;

---

Paragraph Spacing

margin-bottom: 1.5em;

---

6.4 CTA Blocks

Purpose:

connect ebook to creator funnel

encourage next action

---

CTA Placement

Allowed:

chapter ending

final section

inline soft CTA

Avoid:

aggressive popup

excessive CTA frequency

---

CTA Style

Should feel:

elegant

contextual

useful

NOT:

spammy

salesy

---

Example CTA

Kalau Anda ingin melihat sistem affiliate TikTok yang lebih lengkap,

Anda bisa bergabung ke course utama di sini.

---

6.5 Reading Progress

System tracks:

current chapter

scroll progress

last opened

---

Behavior

Reader returns to:

last reading position

---

Progress UI

Subtle.

Examples:

thin top progress bar

chapter completion indicator

Avoid:

gamification feel

---

7\. Ebook Cover Experience

Goal

Ebook should feel:

collectible

premium

polished

---

Cover Display

Show:

cover image

title

subtitle

creator name

---

Cover Ratio

Recommended:

4:5

---

8\. Library Experience

Goal

Library should feel:

Personal digital bookshelf

NOT:

File manager

---

Library Layout

Card-based.

Each card contains:

cover

title

creator

progress

last opened

---

Library Actions

continue reading

open ebook

remove from library (future)

---

9\. Reader Empty States

Empty Library

Instead of:

No ebooks.

Use:

Ebook yang kamu klaim akan muncul di sini.

---

10\. Reader Authentication UX

Goals

Authentication should feel:

lightweight

fast

low friction

---

Recommended Flow

Open claim link

→ Minimal auth

→ Access granted

→ Ebook added to library

→ Redirect directly to reader

---

Avoid

long onboarding

too many required fields

forced profile setup

---

11\. Reader Performance

Requirements

Reader must:

load quickly

scroll smoothly

support mobile devices well

lazy-load heavy assets

---

HTML Rendering Philosophy

Use:

semantic HTML

optimized typography

print-friendly CSS

Avoid:

iframe PDF embedding

giant monolithic HTML

---

12\. Ebook Update Experience

Goal

Creators should be able to:

update ebook without resending files

---

Reader Behavior

Reader automatically sees latest version.

---

Versioning

MVP:

overwrite latest version

Future:

version history

---

13\. Embedded Media (Future)

Not MVP.

Potential:

video embeds

audio embeds

interactive checklists

downloadable worksheets

---

14\. Reader Themes

MVP

Single elegant light theme.

---

Future

Potential:

dark mode

sepia mode

font size controls

---

15\. Mobile Experience

Priorities

Most readers will likely come from:

WhatsApp

Telegram

mobile browsers

Mobile experience is critical.

---

Mobile Requirements

large tap targets

smooth scrolling

readable typography

sticky progress

fast loading

---

Avoid

tiny TOC buttons

cluttered mobile menus

desktop-first layouts

---

16\. Reader SEO Strategy

Public Ebooks

Public ebooks can become:

SEO entry pages

lead generation pages

creator discovery pages

---

Public Reader Requirements

Include:

metadata

Open Graph tags

structured headings

canonical URLs

---

17\. Reader Analytics (Future)

Not MVP.

Potential metrics:

chapter completion

average reading time

CTA clicks

drop-off sections

heatmaps

---

18\. Reader Security

Access Rules

Public:

accessible without auth

Private:

entitlement required

Claim Required:

entitlement required

---

Anti-Abuse

Recommended:

signed access checks

rate limiting

prevent direct unpublished access

---

19\. Reader UX Writing

Tone

elegant

calm

modern

human

---

Good Examples

Lanjut membaca

Kembali ke library

Progress tersimpan otomatis

---

Avoid

Download now

File berhasil diunduh

---

20\. Reader Product Philosophy

Publiora Reader should feel like:

A modern publishing platform.

NOT:

A PDF delivery tool.

---

21\. Strategic Insight

The reader experience is important because:

Distribution + hosted reading

is one of Publiora's biggest moats.

If readers continuously return to Publiora:

retention increases

ecosystem grows

creators become stickier

future marketplace becomes easier

## Publication stability (2026-07)

Republish updates the existing `published_ebooks` row in place.
Stable publication IDs keep claim links, reader entitlements, and public URLs valid after content updates.

