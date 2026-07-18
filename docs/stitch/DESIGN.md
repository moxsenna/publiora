# Publiora DESIGN.md

> Elegant AI publishing for modern creators.

## Product

Publiora is an AI-powered publishing platform for creators and marketers.
Users think, strategize, write marketing ebooks, publish, and distribute via claim links.

Tagline: Create, publish, and distribute marketing ebooks with AI.

## Brand personality

Elegant · Strategic · Modern · Creative · Professional

Feel: premium, calm, focused, readable, creator-first.
Closer to Notion, Medium, Read.cv, Apple than generic AI tools or crypto dashboards.

## Principles

1. Content first — UI supports reading and creation, never competes.
2. Spacious layouts — intentional whitespace, readable widths.
3. Editorial feel — quiet chrome, strong typography hierarchy.
4. AI as collaborator — helpful and subtle, never gimmicky.

## Do

- Soft cream canvas (`#FAFAF8`)
- Strong black primary actions (`#0A0A0A`)
- Generous section padding
- Soft shadows and large radii
- Gold used sparingly for premium accents
- Blue for links/focus/active only

## Don't

- Flashy AI gradients / neon glow spam
- Dense admin tables as default
- Crypto-dashboard aesthetics
- Tiny cramped controls
- Rainbow status rainbow overload

## Color tokens

| Token | Hex | Role |
|---|---|---|
| publiora-black | #0A0A0A | primary button, emphasis, dark panels |
| publiora-white | #FAFAF8 | app canvas, reading surface |
| deep-gray | #171717 | body text |
| medium-gray | #404040 | secondary text |
| soft-gray | #A3A3A3 | tertiary / meta |
| publiora-border | #E5E5E5 | borders, dividers |
| publiora-blue | #2563EB | links, focus, active |
| publiora-emerald | #059669 | success, published |
| gold | #C8A24B | premium badge / subtle highlight |
| gold-soft | #E9D9A8 | badge surface |
| danger | #DC2626 | destructive |
| warning | #D97706 | warning |
| surface-1 | #FFFFFF | cards |
| surface-2 | #F5F5F2 | muted surface |
| surface-3 | #EFEFEC | deeper muted |

## Typography

- Headings: Plus Jakarta Sans, tracking -0.02em, black
- Body: Inter, deep-gray, antialiased
- Scale guide:
  - Display: 48–60px / bold / leading 1.05
  - H1: 30–36px / bold
  - H2: 24px / semibold
  - H3: 18–20px / semibold
  - Body: 14–16px / regular / leading relaxed
  - Meta: 12–13px / medium / soft-gray

## Spacing

8px grid. Prefer 16 / 24 / 32 / 48 / 64 / 80.
Section vertical padding marketing: 80–112px desktop.
Card padding: 24px.
Form gap: 16–24px.

## Shape

- Card radius: 24px
- Button radius: 16px
- Input radius: 18px
- Pill/badge: 9999px
- Shadows: soft card `0 4px 24px rgba(0,0,0,0.04)`; hover stronger; pop for hero mock

## Components

### Button
- primary: black bg, soft-white text
- outline/secondary: border gray, white/surface bg
- ghost: transparent
- gold: rare premium CTA
- sizes sm/md/lg; loading spinner allowed

### Input
- height ~44px, radius 18, border gray, focus blue border
- label 14px medium deep-gray above field

### Card
- white, radius 24, hairline border, soft shadow
- header/body/footer spacing 16–24

### Badge / Status pill
- pill radius; gold/success/info variants soft tinted surfaces

### Shells
- Marketing: sticky translucent header, max-w-7xl content, quiet footer
- Auth: split calm form + black editorial panel (desktop)
- App: light sidebar + topbar, content-first main
- Reader: quiet chrome, max readable measure, serif body optional via reader-prose

### AI chat
- Subtle agent chips, calm bubbles, no sci-fi panels

## Motion

200–240ms ease-out fades/slides only.
No looping neon, no aggressive parallax.

## Screen intent notes

- Landing: trust + clarity + one primary CTA
- Auth: fast, calm, low friction
- Dashboard: overview + recent work + create
- Workspace: chat + structure + writing surface
- Reader: reading is hero

## Language

UI may mix Indonesian and English. Tone: professional creator.
