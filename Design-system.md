design-system.md — Publiora MVP

1. Overview

Publiora design system is built around:

Elegant Minimalism
+
Editorial Publishing
+
Modern SaaS

The product should feel:

premium

calm

focused

strategic

readable

creator-first


NOT:

flashy AI tool

crypto dashboard

cluttered admin panel



---

2. Design Principles

2.1 Content First

Content is the hero.

UI should support reading and creation, not compete for attention.


---

2.2 Spacious Layouts

Whitespace is intentional.

Prefer:

breathing room

larger padding

focused layouts

readable widths


Avoid:

cramped dashboards

dense controls

tiny sidebars



---

2.3 Editorial Feel

The app should feel closer to:

Notion

Medium

Read.cv

Apple


Than:

generic AI generator

traditional CMS



---

2.4 AI as Collaborator

AI UI should feel:

elegant

helpful

subtle

strategic


Avoid:

gimmicky AI effects

aggressive animations

sci-fi visuals



---

3. Color System

Primary Colors

Pure Black

#0A0A0A

Usage:

main background

primary buttons

hero sections

typography emphasis



---

Soft White

#FAFAF8

Usage:

content backgrounds

reading surfaces

app canvas



---

Neutral Colors

Deep Gray

#171717


---

Medium Gray

#404040


---

Soft Gray

#A3A3A3


---

Border Gray

#E5E5E5


---

Accent Colors

Accent colors should be used sparingly.

Elegant Blue

#2563EB

Usage:

links

active states

primary highlights



---

Emerald

#059669

Usage:

success

completed generation

published state



---

Gold Accent (Optional)

#C8A96B

Usage:

premium badges

premium templates

subtle highlights


Use minimally.


---

4. Typography

Heading Font

Recommended:

Sora
General Sans
Plus Jakarta Sans

Characteristics:

modern

geometric

elegant

premium



---

Body Font

Recommended:

Inter
Switzer

Characteristics:

neutral

highly readable

digital-first



---

Typography Scale

Display

72px
font-weight: 700
line-height: 1.1


---

H1

56px
font-weight: 700
line-height: 1.15


---

H2

40px
font-weight: 650
line-height: 1.2


---

H3

32px
font-weight: 600
line-height: 1.25


---

Body Large

18px
line-height: 1.8


---

Body Default

16px
line-height: 1.7


---

5. Layout System

App Layout

Desktop:

-------------------------------------------------
| Sidebar | Main Workspace | Live Preview       |
-------------------------------------------------


---

Max Widths

Dashboard

max-width: 1440px;


---

Reading Width

max-width: 720px;


---

Chat Width

max-width: 680px;


---

Spacing System

Use 8px grid.

Recommended Scale

4
8
12
16
24
32
40
48
64
80


---

6. Radius & Shadows

Border Radius

Default Cards

border-radius: 24px;


---

Buttons

border-radius: 16px;


---

Inputs

border-radius: 18px;


---

Shadows

Default Shadow

box-shadow:
0 4px 24px rgba(0,0,0,0.04);


---

Hover Shadow

box-shadow:
0 8px 40px rgba(0,0,0,0.08);

Avoid strong shadows.


---

7. Core Components

7.1 Buttons

Primary Button

Style:

Background: Black
Text: White
Rounded-xl
Medium weight

Hover:

subtle lift

slightly lighter black



---

Secondary Button

Style:

White background
Black border
Black text


---

Ghost Button

Style:

Transparent
Minimal border or none

Used for:

editor actions

lightweight interactions



---

Icon Button

Style:

square

subtle hover

minimal chrome



---

7.2 Inputs

Style:

large padding

soft borders

light background

clean typography


Avoid:

heavy outlines

dark input backgrounds everywhere



---

7.3 Cards

Style:

soft surface

subtle border

rounded-2xl

low contrast


Used for:

ebook cards

project cards

strategy summary

AI suggestions



---

7.4 Modals

Style:

centered

calm

minimal chrome

slightly blurred backdrop


Avoid:

huge full-screen modals unless necessary



---

8. AI Chat Interface

Chat Layout

--------------------------------
| AI Message                   |
|                              |
--------------------------------
| User Message                 |
--------------------------------


---

AI Bubble

Style:

soft gray background

elegant typography

spacious padding


Should feel:

strategist

editor

consultant


NOT:

customer support bot



---

User Bubble

Style:

minimal

slightly elevated

monochrome



---

AI Thinking State

Use:

subtle animated dots

smooth opacity pulse


Avoid:

giant spinners

flashy loaders



---

Suggested Prompt Chips

Style:

rounded-full

minimal border

soft hover


Example:

[Make it more persuasive]
[Add checklist]
[More premium tone]


---

9. Ebook Editor

Editor Layout

-----------------------------------------
| Section List | Editor | Preview       |
-----------------------------------------


---

Editor Philosophy

Avoid giant textarea.

Use:

modular editing

section cards

block-based flow



---

Section Card

Contains:

section title

word count

generation status

actions


Actions:

regenerate

expand

simplify

persuasive

delete



---

Editor Toolbar

Minimal.

Avoid:

Google Docs complexity

too many controls



---

10. Live Preview

Preview Feel

Should feel like:

Premium ebook reader

NOT:

PDF preview iframe


---

Preview Features

typography-first

large margins

smooth scrolling

chapter navigation

responsive simulation



---

Reader Background

Recommended:

background: #FAFAF8;


---

Reader Typography

font-size: 18px;
line-height: 1.9;


---

11. Ebook Reader Experience

Reader Goals

Reader should feel:

calm

immersed

focused

premium



---

Reader Layout

---------------------------------
| Top Bar                       |
---------------------------------
| Sidebar TOC | Reading Area    |
---------------------------------

Mobile:

floating TOC

distraction-free reading



---

Reader Features

MVP

chapter navigation

reading progress

continue reading

embedded CTA blocks



---

CTA Block

Style:

subtle separation

elegant card

not aggressive sales box



---

12. Dashboard UI

Dashboard Feel

Should feel:

creator workspace

publishing studio


NOT:

analytics-heavy admin panel



---

Dashboard Sections

Recent Projects

Card-based.


---

Published Ebooks

Show:

title

visibility

publish status

claim link count



---

Quick Actions

create ebook

continue draft

export PDF



---

13. Claim Page

Goal

Claim experience should feel premium and trustworthy.


---

Layout

Centered card
Minimal distractions
Strong ebook presentation


---

Claim Page Contains

ebook cover

title

creator name

short description

claim button



---

Claim Button

Primary CTA:

Add to My Library

Avoid:

Download PDF


---

14. Empty States

Every empty state should feel intentional.


---

Example

Instead of:

No projects.

Use:

Create your first marketing ebook.


---

15. Motion Design

Principles

Motion should be:

subtle

premium

smooth

functional



---

Recommended Motion

fade-in

soft hover lift

layout transitions

smooth preview updates



---

Avoid

bounce animation

flashy effects

excessive motion

AI gimmicks



---

16. Icons

Recommended:

Lucide
Phosphor

Style:

outline

rounded

minimal



---

17. UX Writing

Tone

concise

strategic

human

calm



---

Good Examples

AI sedang menyusun outline ebook Anda...

Bab ini bisa dibuat lebih persuasif.

Outline siap direview sebelum generation dimulai.


---

Avoid

Processing request...
Task completed.
Loading...


---

18. Responsive Rules

Mobile Priorities

Prioritize:

reading

reviewing

claiming access


Not:

full editing complexity



---

Mobile Workspace

Desktop split layout should collapse into:

Tabs
or
stacked panels


---

19. Accessibility

Requirements:

sufficient contrast

readable typography

keyboard navigation

focus states

semantic HTML


Avoid ultra-light gray text.


---

20. Design References

Visual inspiration:

Apple
Notion
Linear
Medium
Arc Browser
Read.cv
Framer


---

21. Core UI Principle

Publiora should feel like:

Modern AI publishing studio

NOT:

Generic AI content generator
