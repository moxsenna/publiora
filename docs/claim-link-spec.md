# claim-link-spec.md — Publiora MVP

> Revision note — MVP claim success behavior: After a successful claim, Publiora creates the entitlement, adds the ebook to the reader library, then redirects directly to the reader page with a small "Added to your library" confirmation. Library remains the storage destination, but reader access is immediate.



## **1. Overview**

Claim Link System adalah salah satu core differentiator Publiora.

Tujuan:

Memberikan akses ebook secara instan tanpa kirim PDF manual.

Claim links memungkinkan creator:

- membagikan bonus produk

- mendistribusikan lead magnet

- memberikan akses ebook private

- menghubungkan ebook dengan platform eksternal

Contoh platform:

- Scalev

- Lynk.id

- WhatsApp

- Telegram

- Email marketing

- Landing page

# **2. Core Concept**

Flow utama:

Creator publish ebook

→ Create claim link

→ Share link externally

→ Reader opens link

→ Login/register

→ Ebook added to library

→ Redirect directly to reader

Claim link bukan download link.

Claim link memberikan:

Reader entitlement

ke ebook tertentu.

# **3. Core Goals**

## **Creator Goals**

Creator dapat:

- membagikan akses instan

- menghindari kirim PDF manual

- menjaga ecosystem tetap di Publiora

- update ebook tanpa kirim ulang file

## **Reader Goals**

Reader dapat:

- akses ebook cepat

- membaca online

- menyimpan ebook di library

- melanjutkan membaca kapan saja

## **Business Goals**

Publiora mendapatkan:

- retention

- recurring readers

- hosted ecosystem

- distribution moat

# **4. Claim Link Structure**

## **URL Format**

https://publiora.web.id/claim/:token

Example:

https://publiora.web.id/claim/abc123xyz

# **5. Claim Link Types**

# **MVP**

## **Standard Claim Link**

Single ebook access.

# **Future**

## **Multi Ebook Bundle**

One claim link unlocks multiple ebooks.

## **Timed Access**

Temporary access.

## **Campaign Claim Link**

Claim access based on marketing campaign.

# **6. Claim Link Lifecycle**

## **Step 1 — Creator Creates Link**

Creator opens:

Published Ebook

→ Access Settings

→ Create Claim Link

## **Step 2 — Configure Link**

Creator configures:

- link name

- max claims

- expiry date

- active/inactive

## **Step 3 — Generate Link**

System creates:

claim token

and stores:

ebook entitlement mapping

## **Step 4 — Share Link**

Creator shares link via:

- Scalev thank you page

- Lynk.id checkout page

- WhatsApp auto reply

- Telegram

- email autoresponder

- landing page

## **Step 5 — Reader Claims Access**

Reader:

Open link

→ Login/register

→ Claim access

→ Ebook added to library

→ Redirect directly to reader

# **7. Claim Link States**

# **Active**

Valid claim link.

# **Disabled**

Creator manually disabled.

# **Expired**

Expiration date passed.

# **Max Claims Reached**

Claim quota exhausted.

# **Invalid**

Token not found.

# **8. Creator Experience**

# **Claim Link List**

Creator can view:

- claim link name

- claim count

- max claims

- status

- created date

# **Creator Actions**

## **Copy Link**

One-click copy.

## **Disable Link**

Stops future claims.

## **Edit Link**

Can update:

- max claims

- expiry

- name

## **Delete Link**

Soft delete recommended.

# **Recommended UI**

------------------------------------------------

\| Bonus TikTok Affiliate \|

\| Claims: 24 / 100 \|

\| Status: Active \|

\| \|

\| \[Copy Link\] \[Edit\] \[Disable\] \|

------------------------------------------------

# **9. Reader Experience**

# **Claim Page Goals**

Reader should feel:

- safe

- premium

- simple

- instant

Avoid:

- confusing onboarding

- too many fields

- ugly auth flow

# **Claim Page Layout**

## **Components**

- ebook cover

- ebook title

- creator name

- short description

- claim CTA

# **Primary CTA**

Use:

Add to My Library

Avoid:

Download PDF

# **10. Authentication Flow**

# **Existing User**

Open claim link

→ Login

→ Claim success

→ Ebook added to library

→ Redirect directly to reader

# **New User**

Open claim link

→ Register

→ Claim success

→ Ebook added to library

→ Redirect directly to reader

# **11. Entitlement Creation**

On successful claim:

System creates:

user_id

↔ ebook_id

inside:

entitlements

# **12. Duplicate Claim Behavior**

If user already has access:

Do not create duplicate entitlement.

Redirect:

Already in your library. Open reader directly.

# **13. Security Requirements**

# **Token Security**

Claim token must:

- be random

- non-sequential

- hard to guess

Recommended:

NanoID

UUID-based token

# **Rate Limiting**

Prevent brute force attempts.

Recommended:

- IP throttling

- request cooldown

# **Token Length**

Recommended:

16–32 chars

# **No Direct Ebook Access**

Claim link should NOT expose:

- internal ebook ID

- creator ID

# **14. Access Rules**

# **Public Ebook**

Readable without claim.

# **Private Ebook**

Only creator + entitlement users.

# **Claim Required Ebook**

Requires entitlement.

# **Creator Owner**

Always has access.

# **15. Failure States**

# **Invalid Token**

Message:

Link akses tidak valid.

# **Expired Link**

Message:

Link akses ini sudah kedaluwarsa.

# **Disabled Link**

Message:

Link akses ini sudah tidak aktif.

# **Max Claims Reached**

Message:

Kuota klaim untuk link ini sudah habis.

# **Already Claimed**

Message:

Ebook ini sudah ada di library kamu.

# **16. Creator Analytics (MVP Lite)**

Creator can see:

- total claims

- claim link usage

- claim history

# **Future Analytics**

Not MVP:

- conversion tracking

- reader engagement

- chapter completion

- CTA click tracking

- source attribution

# **17. Distribution Philosophy**

Publiora should NOT feel like:

PDF hosting

Publiora should feel like:

Digital publishing and access platform

# **18. Integration Philosophy**

MVP should NOT deeply integrate with:

- Scalev API

- Lynk.id API

- payment gateways

Instead:

Use universal claim links.

Reason:

- faster MVP

- platform agnostic

- easier maintenance

- works everywhere

# **19. Future Expansion**

# **Future Integrations**

Potential:

- webhook integrations

- Zapier

- Make.com

- email automation

- payment verification

# **Future Claim Systems**

Potential:

## **Email Claim**

Auto-entitlement based on email.

## **Purchase Verification**

Unlock after payment webhook.

## **Team Access**

Grant access to organization.

## **Subscription Access**

Unlock based on active subscription.

# **20. Core Product Insight**

Claim links are NOT:

Download links.

Claim links are:

Access distribution infrastructure.

This is one of the main ecosystem moats for Publiora.
