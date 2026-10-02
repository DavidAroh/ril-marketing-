# Capsule C — Night terminal

- Premise: an ops console after dark — mono metadata everywhere, blue as the only live signal, working copy calm and bright.
- Fonts: system sans (400/500) for titles/prose; Consolas mono (400) for every label, stamp, count, and action. License: system.
- Scale: title 15/400 +0.08em (small, quiet — the page structure speaks); item titles 16/500; numerals 44 mono; micro 10–11 mono uppercase +0.2em.
- Case: uppercase for all machine voice (labels, stamps, colheads); sentence case for human-readable items.
- Palette: canvas #212120 (warm near-black); text #f5f4f0 primary; #77756c secondary mono voice; #4da3ff blue for every decision path (stamps, counts of attention, actions); #ff6b57 reserved red on the failed publish only. Three active roles + alert.
- Signature relationship: three-column telemetry grid (decisions / workspace / week) where mono microtype carries all structure and blue marks everything awaiting a human.
- Invariants: dark canvas; mono machine voice; blue = decision; red = failure only; column triad.
- Assumptions/risks: dark UI must pass contrast in the product's light-mode shell if ported; long titles at 16px in narrow columns.
- Round 2 translation: keep the telemetry triad and mono microtype; components get no borders — columns separate by space alone; blue stays interaction-colored.
