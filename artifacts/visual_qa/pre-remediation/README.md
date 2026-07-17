# Pre-remediation mobile captures

These nine images were captured on 2026-07-17 from a working tree based on
commit `832b0be`, before the full-role wrapping, 44px queue-control, safe-area,
and cache-version remediation. They are retained only as historical comparison
and must not be cited as evidence for the remediated layout.

The captures use temporary in-memory QA state because the in-app browser's
Engine.IO proxy could not maintain a live Socket.IO SID against the local
Werkzeug server. The 390x844 and 430x932 files were originally returned one row
short and padded with one background row. The three 360x800 files were
originally JPEG bitstreams with `.png` names; they have been decoded and saved
as real PNG containers, but their pixels retain the original JPEG compression.

All nine retained files have exact declared dimensions and valid PNG
signatures after normalization.
