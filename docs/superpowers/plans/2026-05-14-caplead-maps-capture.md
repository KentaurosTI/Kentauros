# CapLead Maps Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Kentauros "Captura Automática" button use the CapLead-style Google Maps capture logic as its primary lead source.

**Architecture:** Add a focused backend provider that uses Puppeteer to search Google Maps, scroll result feeds, open each business detail page, extract official website/phone/address/category, enrich contacts from the official website, and return candidates to the existing Kentauros streaming capture pipeline. The current endpoint and modal remain unchanged.

**Tech Stack:** Node.js ESM, Express, Puppeteer via installed or CapLead fallback module, existing Kentauros capture validation modules.

---

### Task 1: Add Maps-first Capture Provider

**Files:**
- Create: `server/capLeadMapsCapture.js`
- Test: `server/capLeadMapsCapture.test.js`

- [ ] Implement niche mapping, Google Maps scraping, contact extraction, WhatsApp detection, blacklist filtering, and candidate normalization.
- [ ] Add unit tests for niche expansion, phone/WhatsApp extraction, contact extraction, and candidate filtering.

### Task 2: Plug Provider Into Existing Capture Flow

**Files:**
- Modify: `server/index.js`

- [ ] Import the provider.
- [ ] In `executeLeadCapture`, run Maps-first before the existing generic engine.
- [ ] Emit progress messages while Maps is searching, scrolling, opening places, and enriching contacts.
- [ ] Keep the existing endpoint `/api/leads/capture-stream`, so the current button continues to work.

### Task 3: Verify Capture Quality

**Files:**
- Test: `server/capLeadMapsCapture.test.js`
- Test: `server/leadQualification.test.js`

- [ ] Ensure article/content pages are rejected.
- [ ] Ensure Maps candidates with official websites and required contacts can qualify.
- [ ] Run focused tests and production build.
