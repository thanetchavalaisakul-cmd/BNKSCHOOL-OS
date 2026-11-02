# Preschool group coverage — leave approval evidence link

## Invariants
- One director authorization: the approved leave request is the authoritative source. Creating or printing a linked preschool cover NEVER creates a second director approval.
- The leave requester's actual submitted `school_document_signatures(kind=leave,slot=requester)` image and the leave director's original `slot=director` image are shown only when their matching leave events are recorded; an explicit paper choice stays blank.
- Stage head and academic head have separate **acknowledgement only** slots in the existing central `set_school_document_signature` workflow. Only the logged-in assigned user can choose a valid one of four signing methods for their own slot. The director has no preschool signing button.
- All legacy preschool cover acknowledgements and original leave approval dates remain unchanged.
- PDF separates signature provenance: “อ้างอิงการยื่นคำขอลา”, “รับทราบและลงนาม”, and “อ้างอิงการอนุมัติการลา ไม่ต้องอนุมัติสอนแทนซ้ำ”.
- A private read RPC and per-path storage RLS helper ensure preschool document viewers can open only genuine linked signature images. The Storage policy helper is granted execute to authenticated; no global signature-bucket grant. Related budgets and substitution PDF access unaffected.

## Tests
All 179 existing+new automated tests must pass. Validate in production with approved leave and authorized stage head, academic head, original requester, and a non-authorized teacher. Paper method: leave slot empty.

## Scope
The change updates the **preschool group-cover PDF and two receipt-signing roles**. The general per-period substitute/whole-day substitute workflow remains unchanged, avoiding duplicate director approval prompts.
