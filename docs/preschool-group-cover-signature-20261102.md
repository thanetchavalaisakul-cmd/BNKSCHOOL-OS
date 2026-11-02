# Preschool group substitute signatures, 2026-11-02

The school already recorded four preschool group-cover acknowledgement events and all four teachers have signature images in the central profile. Those acknowledgements were not re-signed or re-dated.

The original acknowledgement RPC remains unchanged. A second signed RPC now requires the owner to pick one of the existing four central methods before confirming new acknowledgements. It records the method, optional snapshot signature ID and actual signature timestamp. Explicit paper means no image in the PDF.

At export, a separate access-controlled read RPC resolves a saved signature for previously acknowledged staff. For older events, the PDF marks the image as "current profile signature at print time" rather than falsely claiming it was digitally signed on the original acknowledgement date. Only previously acknowledged, available current staff may appear with a signature.

The private signatures storage bucket remains protected: the additional storage RLS policy allows downloads only to users authorized to view the specific active preschool group cover, and only for that cover's acknowledged member profile image. No unrelated users' signatures are exposed.

The four footer sign-off lines continue to print as handwriting fields until the respective approver actually signs this particular document. Storing a signature profile alone is not evidence that the director or academic head signed the document.

Production release requires 173+ full tests, role test for the read RPC, and checking the live production PDF content. No existing submitted approvals or acknowledgements are mutated.
