# Quick Start for GPT Builder (Swarm)

**Goal:** Stand up a distributed GPT swarm with human-mediated handoffs. This pack gives you everything to load into GPT Builder *today*.

## Upload (per GPT)
- Upload **SPEC.spec.md** (this file) as the primary reference.
- Upload **Handoff_Protocol.md** for exact copy/paste envelopes.
- Optionally upload **Human_Gate_Cards.md** for easy YES/NO approvals.
- MCA only: also upload **MCA_Instructions.md**.

> GPT Builder cap: up to 20 files per GPT. This pack keeps it to 2–4 files per role.

## Capabilities (toggle in Builder)
- **MCA, RA, SA, DA, APA/FOPS**: Web browsing ON
- **AA, IA, QA, DA, DBA**: Code Interpreter ON
- Image/Canvas OFF

## Run Order
1. Start in **MCA** → “Initialize G0 and issue first handoff to RA.”
2. Paste HANDOFF into **RA** → get RESULT → paste back to **MCA**.
3. MCA validates, updates state, and issues next handoff (AA → SA → IA → QA → DA → DBA).
4. Continue through **G0–G8**.

## Files in this Pack
- SPEC.spec.md — master specification (user-provided)
- Handoff_Protocol.md — exact envelopes (copy/paste)
- Human_Gate_Cards.md — checklists for non-technical approval
- MCA_Instructions.md — coordinator operating rules
- KnowledgePack_README.md — how to use this pack
