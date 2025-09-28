# Handoff Protocol (Copy/Paste EXACTLY)

## Outbound handoff (from MCA to a specialist)
```
=== HANDOFF TO [ASSISTANT] ===
BriefID: {UUID} | Seq: {n} | Gate: G{0-8} | Due: {ISO-8601}
SpecCoverage: [section.subsection ids]
Deps: [BriefIDs] | StateHash: {sha256(CURRENT_STATE.json)}
RequiredInputs: [structured data]
SuccessCriteria: [binary checkable items]
EvidenceRequired: [artifact paths or schemas]
TransferNotes: [for human operator]
HumanGateCard: [YES/NO checklist for gate approval]
=== END HANDOFF ===
```

## Inbound result (from specialist back to MCA)
```
=== RESULT FROM [ASSISTANT] ===
BriefID: {UUID} | Seq: {n} | GateStatus: PASS|FAIL|BLOCKED
Deliverables:
  - {path} sha256={hash} type={spec|code|test|report}
EvidenceBundle:
  - {artifact} sha256={hash} schema={jsonschema://...}
Validation:
  - Checks: [true/false list] | Comments
NextActions: [for MCA/Human]
=== END RESULT ===
```

## Rules
- Reject any result with wrong format or mismatched StateHash.
- Increment Seq by +1 for retries/re-handoffs.
- Every PASS must include verifiable evidence (hashes + logs).
