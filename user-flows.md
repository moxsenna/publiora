
# user-flows.md — Publiora MVP

## 1. Overview

Publiora core flow:

```txt
Create Ebook → Generate → Publish → Share Claim Link → Reader Access

Primary users:

Creator

Reader / Buyer



---

2. Creator Flow — Create Ebook

Goal

Creator membuat ebook marketing-ready dengan AI.

Flow

Login
→ Dashboard
→ Create New Ebook
→ Choose Ebook Type
→ AI Strategist Chat
→ Generate Outline
→ Review Outline
→ Generate Ebook
→ Edit / Enhance
→ Preview

Steps

1. Login

User masuk ke:

app.publiora.web.id

2. Dashboard

User melihat:

existing projects

published ebooks

create new ebook button


3. Create New Ebook

User klik:

Create New Ebook

4. Choose Ebook Type

Options:

Lead Magnet

Bonus Product

Sellable Ebook


5. AI Strategist Chat

AI bertanya:

produk apa yang didukung ebook ini?

siapa target audience?

masalah utama audience?

hasil apa yang ingin dicapai pembaca?

CTA akhir ebook?


6. Generate Outline

AI menghasilkan:

title

subtitle

chapter list

section list

CTA strategy


7. Review Outline

User bisa:

edit chapter

reorder chapter

delete section

regenerate outline


8. Generate Ebook

System generate per section.

Chapter 1 Section 1
→ Chapter 1 Section 2
→ Chapter 2 Section 1
→ ...

9. Edit / Enhance

User bisa:

edit manual

expand section

make persuasive

add checklist

add examples


10. Preview

User melihat live HTML preview.


---

3. Creator Flow — Publish Ebook

Goal

Creator menerbitkan ebook sebagai hosted reader.

Flow

Open Project
→ Review Preview
→ Click Publish
→ Choose Visibility
→ Confirm Publish
→ Ebook URL Created

Visibility Options

Public

Siapa saja bisa membaca.

Private

Hanya creator dan user yang diberi akses.

Claim Required

Reader harus claim access dulu.

Output

publiora.web.id/read/:slug


---

4. Creator Flow — Create Claim Link

Goal

Creator membuat link akses ebook untuk buyer dari platform lain.

Flow

Open Published Ebook
→ Access Settings
→ Create Claim Link
→ Configure Link
→ Copy Link
→ Share in Scalev / Lynk.id / WhatsApp / Email

Claim Link Settings

Creator bisa mengatur:

link name

max claims

expiration date

active/inactive

target ebook


Example

publiora.web.id/claim/abc123

Use Case

Creator memasang link ini di:

thank you page Scalev

halaman produk Lynk.id

email autoresponder

WhatsApp auto-reply

Telegram group

bonus delivery page



---

5. Reader Flow — Claim Ebook

Goal

Buyer mendapat akses ebook secara instan.

Flow

Open Claim Link
→ Claim Page
→ Login / Register
→ Access Granted
→ Ebook Added to Library
→ Open Reader

Steps

1. Buyer Opens Claim Link

Buyer klik:

publiora.web.id/claim/abc123

2. Claim Page

Page menampilkan:

ebook title

creator name

short description

claim button


3. Login / Register

Jika belum login:

user daftar

atau login


4. Access Granted

System membuat entitlement.

5. Ebook Added to Library

Ebook otomatis masuk ke:

app.publiora.web.id/library

6. Open Reader

Buyer bisa langsung membaca ebook.


---

6. Reader Flow — Read Ebook

Goal

Reader membaca ebook di platform Publiora tanpa download PDF.

Flow

Login
→ My Library
→ Select Ebook
→ Read Online
→ Save Progress

Reader Features MVP

chapter navigation

reading progress

mobile-friendly layout

clean typography

CTA block from creator



---

7. Creator Flow — Manage Claim Links

Goal

Creator mengatur akses distribusi ebook.

Flow

Dashboard
→ Published Ebook
→ Claim Links
→ View / Edit / Disable Link

Creator Actions

Creator bisa:

create new claim link

copy link

disable link

set max claims

set expiry date

view claim count



---

8. Creator Flow — Update Published Ebook

Goal

Creator memperbarui ebook tanpa kirim ulang file PDF.

Flow

Open Project
→ Edit Content
→ Preview
→ Republish
→ Reader Sees Latest Version

Important Behavior

Reader yang sudah punya akses tetap bisa membaca versi terbaru.


---

9. Error Flows

Invalid Claim Link

Show:

Link akses tidak valid atau sudah tidak aktif.

Expired Claim Link

Show:

Link akses ini sudah kedaluwarsa.

Max Claims Reached

Show:

Kuota klaim untuk link ini sudah habis.

Already Claimed

Show:

Ebook ini sudah ada di library kamu.

Private Ebook Without Access

Show:

Kamu belum memiliki akses ke ebook ini.

Gemini Limit Reached

Show:

Limit Gemini kamu tercapai. Generation bisa dilanjutkan dari section terakhir.


---

10. MVP Success Flow

Ideal creator journey:

Creator creates ebook
→ Publishes ebook
→ Creates claim link
→ Shares link on external sales platform
→ Buyer claims ebook
→ Buyer reads inside Publiora
→ Creator keeps using Publiora


---

11. Primary UX Principle

Publiora should make creators feel:

“Saya tidak perlu kirim PDF manual lagi.”

And readers feel:

“Bonus saya langsung rapi dan mudah dibaca.”
