# api-spec.md — Publiora MVP

Base URLs:

```txt
Marketing Site:
https://publiora.web.id

App API:
https://app.publiora.web.id/api

Runtime:
Cloudflare Pages Functions and/or Supabase Edge Functions

API Style:

REST JSON API

Supabase Auth session authentication

Creator + Reader access model



---

1. Authentication

Authentication is handled by Supabase Auth SDK, not custom password storage.

Client-side auth actions:
- signUp
- signInWithPassword
- signOut
- getUser

Application profile data is stored in profiles table.
Custom API endpoints validate the Supabase session before processing requests.

Legacy endpoint examples below may be kept only as conceptual references if needed.

POST /auth/register

Register new user.

Request

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}

Response

{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": "supabase_session"
}


---

POST /auth/login

Request

{
  "email": "john@example.com",
  "password": "secret123"
}

Response

{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": "supabase_session"
}


---

POST /auth/logout

Response

{
  "success": true
}


---

GET /auth/me

Get authenticated user.

Response

{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com"
}


---

2. Gemini API Key

POST /api-keys/gemini

Save Gemini API key.

Request

{
  "apiKey": "AIza..."
}

Response

{
  "success": true,
  "provider": "gemini"
}


---

POST /api-keys/gemini/validate

Validate API key.

Response

{
  "valid": true,
  "quota": {
    "status": "available"
  }
}


---

DELETE /api-keys/gemini

Remove saved API key.

Response

{
  "success": true
}


---

3. Projects

POST /projects

Create new ebook project.

Request

{
  "title": "Untitled Ebook",
  "ebookType": "lead_magnet"
}

Response

{
  "id": "uuid",
  "title": "Untitled Ebook",
  "ebookType": "lead_magnet",
  "status": "draft"
}


---

GET /projects

Get user projects.

Response

{
  "projects": [
    {
      "id": "uuid",
      "title": "Affiliate TikTok Ebook",
      "status": "draft",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}


---

GET /projects/:id

Get project detail.

Response

{
  "id": "uuid",
  "title": "Affiliate TikTok Ebook",
  "ebookType": "lead_magnet",
  "status": "draft",
  "state": {},
  "outline": {}
}


---

PATCH /projects/:id

Update project metadata.

Request

{
  "title": "New Ebook Title"
}

Response

{
  "success": true
}


---

DELETE /projects/:id

Delete project.

Response

{
  "success": true
}


---

4. Conversation Agent

POST /projects/:id/chat

Send message to AI strategist.

Request

{
  "message": "Saya mau bikin ebook bonus untuk course affiliate TikTok."
}

Response

{
  "assistantMessage": "Siapa target audience utama course affiliate TikTok Anda?",
  "statePatch": {
    "product.name": "Course Affiliate TikTok"
  },
  "readinessScore": 35,
  "nextAction": "ask_question"
}


---

GET /projects/:id/messages

Get chat history.

Response

{
  "messages": [
    {
      "role": "assistant",
      "content": "Produk utama yang ingin didukung ebook ini apa?"
    },
    {
      "role": "user",
      "content": "Course affiliate TikTok."
    }
  ]
}


---

5. Outline

POST /projects/:id/outline/generate

Generate ebook outline.

Response

{
  "outline": {
    "title": "7 Kesalahan Affiliate TikTok Pemula",
    "subtitle": "Panduan cepat agar video tidak sepi viewer",
    "chapters": [
      {
        "id": "chapter_1",
        "title": "Kenapa Video Affiliate Sepi",
        "sections": [
          {
            "id": "section_1_1",
            "title": "Masalah utama bukan algoritma"
          }
        ]
      }
    ]
  }
}


---

GET /projects/:id/outline

Get current outline.


---

PATCH /projects/:id/outline

Update outline manually.

Request

{
  "outline": {}
}


---

POST /projects/:id/outline/approve

Approve outline before generation.

Response

{
  "success": true
}


---

6. Ebook Generation

POST /projects/:id/generate

Start ebook generation.

Request

{
  "mode": "full_ai"
}

Response

{
  "jobId": "uuid",
  "status": "queued"
}


---

GET /projects/:id/generation-status

Response

{
  "status": "running",
  "progress": {
    "completedSections": 5,
    "totalSections": 12
  },
  "currentTask": "Generating Chapter 2 Section 1"
}


---

POST /projects/:id/sections/:sectionId/regenerate

Regenerate specific section.

Request

{
  "instruction": "Make this more persuasive"
}

Response

{
  "success": true,
  "jobId": "uuid"
}


---

POST /projects/:id/sections/:sectionId/enhance

Enhance section.

Request

{
  "action": "add_examples"
}

Allowed Actions

expand
shorten
make_persuasive
make_professional
simplify
add_examples
add_checklist

Response

{
  "success": true
}


---

7. Sections

GET /projects/:id/sections

Get generated sections.

Response

{
  "sections": [
    {
      "id": "section_1_1",
      "title": "Masalah utama bukan algoritma",
      "content": {}
    }
  ]
}


---

PATCH /projects/:id/sections/:sectionId

Update section manually.

Request

{
  "content": {}
}

Response

{
  "success": true
}


---

8. Preview

GET /projects/:id/preview-html

Get rendered HTML preview.

Response

{
  "html": "<html>...</html>"
}


---

9. Publishing

POST /projects/:id/publish

Publish ebook.

Request

{
  "visibility": "claim_required"
}

Allowed Visibility

public
private
claim_required

Response

{
  "ebookId": "uuid",
  "slug": "7-kesalahan-affiliate-tiktok",
  "url": "https://publiora.web.id/read/7-kesalahan-affiliate-tiktok"
}


---

GET /published-ebooks/:id

Get published ebook detail.

Response

{
  "id": "uuid",
  "title": "7 Kesalahan Affiliate TikTok",
  "visibility": "claim_required",
  "url": "https://publiora.web.id/read/slug"
}


---

PATCH /published-ebooks/:id

Update published ebook settings.

Request

{
  "visibility": "private"
}

Response

{
  "success": true
}


---

10. Reader

GET /read/:slug

Public reader endpoint.

Response

Rendered HTML page.


---

GET /library

Get reader library.

Response

{
  "ebooks": [
    {
      "id": "uuid",
      "title": "Affiliate TikTok Ebook",
      "coverImage": null,
      "progress": 45
    }
  ]
}


---

GET /library/:ebookId

Get reader ebook detail.

Response

{
  "id": "uuid",
  "title": "Affiliate TikTok Ebook",
  "html": "<html>...</html>"
}


---

PATCH /library/:ebookId/progress

Update reading progress.

Request

{
  "chapterId": "chapter_3",
  "progressPercent": 45
}

Response

{
  "success": true
}


---

11. Claim Links

POST /published-ebooks/:id/claim-links

Create claim link.

Request

{
  "name": "Bonus Affiliate TikTok",
  "maxClaims": 100,
  "expiresAt": null
}

Response

{
  "id": "claim_123",
  "token": "abc123",
  "url": "https://publiora.web.id/claim/abc123"
}


---

GET /published-ebooks/:id/claim-links

Get claim links.

Response

{
  "claimLinks": [
    {
      "id": "claim_123",
      "name": "Bonus Affiliate TikTok",
      "claimCount": 24,
      "maxClaims": 100,
      "isActive": true
    }
  ]
}


---

PATCH /claim-links/:id

Update claim link.

Request

{
  "isActive": false
}

Response

{
  "success": true
}


---

POST /claim/:token

Claim ebook access.

Response

{
  "success": true,
  "ebook": {
    "id": "uuid",
    "title": "Affiliate TikTok Ebook"
  }
}


---

12. PDF Export

POST /projects/:id/export/pdf

Generate PDF export.

Response

{
  "exportId": "export_123",
  "status": "processing"
}


---

GET /exports/:id

Get export status.

Response

{
  "status": "completed",
  "downloadUrl": "https://cdn.publiora.web.id/file.pdf"
}


---

13. Errors

Standard error format:

{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Limit Gemini kamu tercapai."
  }
}


---

14. Common Error Codes

UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
RATE_LIMIT
INVALID_API_KEY
CLAIM_LINK_EXPIRED
CLAIM_LIMIT_REACHED
ALREADY_CLAIMED
GENERATION_FAILED
PDF_EXPORT_FAILED


---

15. Authentication

Protected endpoints require:

Authorization: Bearer <token>


---

16. Future API Extensions

Not MVP:

Webhook integrations
Marketplace APIs
Analytics APIs
Creator profile APIs
Payment APIs
Affiliate tracking APIs
Public SDK
