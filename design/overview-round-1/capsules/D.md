# Capsule D — One-color ledger

- Premise: ink on paper, nothing else — every hierarchy carried by scale, weight, case, and space. The strictest discipline in the set.
- Fonts: system sans (400/600/700); Consolas mono for wire numbers only. License: system.
- Scale: tallies 96/0.9 −0.04em 700 (the loudest voice); h1 34 uppercase; row text 17/1.4 600; labels 11–12 uppercase +0.2em; micro 12 mono.
- Case: uppercase structure (h1, labels, tallies' captions, actions); sentence case for item text; muted spans drop to 400 weight instead of a second color.
- Palette: canvas #efede7 (warm grey paper); single ink #191914 for every letterform. One-color system; emphasis is weight and size only.
- Signature relationship: four 96px numerals opening the page like a stamped tally; decision rows as baseline-aligned flex with mono number / caps label / bold text / caps action.
- Invariants: exactly one letterform color; 96px tallies; uppercase label column; no rules or boxes anywhere.
- Assumptions/risks: without color, urgency must come from ordering and weight — the failed publish relies on its label alone; risk of monotony across long queues.
- Round 2 translation: port the tally band and baseline-aligned rows; emphasis by weight, never color; spacing does all separating.
