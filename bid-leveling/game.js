/* Bid-Leveling Gut-Check — The Hive Makes
 * Pick the TRUE low bid once scope gaps are leveled.
 * Static, no backend, no login. Scenarios are illustrative; the leveling
 * reasoning is built to hold up to a working estimator's judgment.
 */

/* ------------------------------------------------------------------ *
 *  SCENARIOS
 *  Each: base prices + Includes/Excludes. `add` = leveling adders that
 *  normalize every bid to a common scope. Apparent low = lowest base.
 *  True low = lowest leveled total. A few scenarios intentionally do NOT
 *  flip (an exclusion that is Owner-Furnished or immaterial) — those
 *  teach the discipline of quantifying before you flip.
 * ------------------------------------------------------------------ */
const SCENARIOS = [
  {
    id: "elec-fixtures",
    trade: "Electrical",
    project: "4-story medical office building — Delaware",
    scope: "Branch power, distribution, devices, and the specified lighting-fixture package (furnish + install).",
    bids: [
      { id: "A", base: 2140000,
        inc: ["Branch wiring, gear, feeders, devices", "Light fixtures installed"],
        exc: ["Light fixtures FURNISHED by others (install only)", "Temp power — by GC", "Cutting & patching — by GC"] },
      { id: "B", base: 2305000,
        inc: ["Furnish & install all fixtures per schedule", "Gear, feeders, devices"],
        exc: ["Temp power — by GC", "Cutting & patching — by GC"] },
      { id: "C", base: 2280000,
        inc: ["Furnish & install all fixtures per schedule", "Gear, feeders, devices"],
        exc: ["Temp power — by GC", "Cutting & patching — by GC"] }
    ],
    gapOptions: [
      { t: "Only Bid A excludes FURNISHING the fixtures — install only (~$210k package)", ok: true },
      { t: "All three exclude temporary power (GC scope) — a wash", ok: false },
      { t: "All three exclude cutting & patching (GC scope) — a wash", ok: false },
      { t: "Bid B's gear carries a 30-week lead time", ok: false }
    ],
    add: { A: [{ t: "Furnish fixture package", amt: 210000 }], B: [], C: [] },
    why: "The fixture package must be bought from someone. Bid A's number is missing ~$210k to furnish it, so once it's added back Bid A is the highest of the three. The shared temp-power and cutting/patching exclusions are GC scope in every bid, so they don't move the ranking. Leveled, Bid C is the true low."
  },
  {
    id: "hvac-controls",
    trade: "HVAC / Mechanical",
    project: "K-12 school addition — Pennsylvania",
    scope: "Rooftop equipment, ductwork, hydronic piping, complete DDC building automation controls.",
    bids: [
      { id: "A", base: 1780000,
        inc: ["Equipment, ductwork, piping", "Test & balance"],
        exc: ["Temperature controls / DDC — BY OTHERS", "Roof curbs — by GC"] },
      { id: "B", base: 1915000,
        inc: ["Furnish & install complete DDC controls", "Equipment, ductwork, piping", "Test & balance"],
        exc: ["Roof curbs — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the DDC / temperature controls (~$165k)", ok: true },
      { t: "Both exclude roof curbs (GC scope) — a wash", ok: false },
      { t: "Both include test & balance — not a differentiator", ok: false }
    ],
    add: { A: [{ t: "DDC / BAS controls", amt: 165000 }], B: [] },
    why: "Controls run ~9–10% of a mechanical package. Bid A dropped them 'by others,' but the project still needs them, so ~$165k comes back onto A — pushing it above Bid B. Roof curbs are excluded by both (GC scope) and both carry TAB, so neither differentiates. Bid B is the true low."
  },
  {
    id: "plumb-underground",
    trade: "Plumbing",
    project: "Retail + restaurant pad — Maryland",
    scope: "Interior rough-in, fixtures, and underground sanitary/water incl. trenching to the site utility.",
    bids: [
      { id: "A", base: 640000,
        inc: ["Interior rough-in and fixtures"],
        exc: ["Trenching, excavation, backfill — BY OTHERS", "Connect to utility beyond 5 ft of building — by others", "Gas beyond meter — by utility"] },
      { id: "B", base: 712000,
        inc: ["All underground plumbing, trenching, excavation, backfill", "Site utility connections", "Interior rough-in and fixtures"],
        exc: ["Gas beyond meter — by utility"] }
    ],
    gapOptions: [
      { t: "Bid A excludes trenching / excavation / underground (~$85k)", ok: true },
      { t: "Both exclude gas beyond the meter (utility scope) — a wash", ok: false },
      { t: "Bid A lists fixture carriers separately", ok: false }
    ],
    add: { A: [{ t: "Underground + trenching/backfill", amt: 85000 }], B: [] },
    why: "Someone has to open the ground and connect to the main. Bid A pushed ~$85k of underground/excavation 'by others,' so it comes back onto A and lifts it past Bid B. The gas-beyond-meter exclusion is utility scope in both bids. Bid B is the true low."
  },
  {
    id: "fire-underground",
    trade: "Fire Protection",
    project: "Distribution warehouse — New Jersey",
    scope: "Overhead ESFR sprinkler plus the underground fire main / lead-in to the city connection.",
    bids: [
      { id: "A", base: 880000,
        inc: ["Overhead ESFR, riser, FDC"],
        exc: ["Underground fire main / lead-in beyond 5 ft — BY OTHERS", "Fire alarm / monitoring — by electrical"] },
      { id: "B", base: 946000,
        inc: ["Complete system incl. underground fire service and lead-in", "Connection to city main"],
        exc: ["Fire alarm / monitoring — by electrical"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the underground fire main / lead-in (~$72k)", ok: true },
      { t: "Both exclude fire alarm / monitoring (electrical scope) — a wash", ok: false },
      { t: "Bid A held a 5% material escalation", ok: false }
    ],
    add: { A: [{ t: "Underground fire main / lead-in", amt: 72000 }], B: [] },
    why: "The lead-in from the building to the city main is real, quotable scope (~$72k). Bid A excluded it 'by others'; the project still needs it, so it's added back — lifting A above Bid B. FA monitoring is electrical scope in both. Bid B is the true low."
  },
  {
    id: "sales-tax",
    trade: "Cross-trade (Electrical)",
    project: "Corporate office fit-out — Northern Virginia",
    scope: "Complete electrical. Taxable jurisdiction — sales/use tax applies to materials.",
    bids: [
      { id: "A", base: 1240000,
        inc: ["All electrical work"],
        exc: ["Applicable sales / use tax on materials — EXCLUDED"] },
      { id: "B", base: 1262000,
        inc: ["All electrical work", "All applicable sales and use taxes"],
        exc: [] }
    ],
    gapOptions: [
      { t: "Bid A excludes sales tax; on ~$700k material @ 6% ≈ $42k", ok: true },
      { t: "The base-price gap ($22k) already makes A the low bid", ok: false },
      { t: "Bid B included a permit allowance", ok: false }
    ],
    add: { A: [{ t: "Sales tax (~$700k material @ 6%)", amt: 42000 }], B: [] },
    why: "Tax-excluded is the quiet flipper on close races. Material is ~$700k of Bid A; at a 6% Northern-VA rate that's ~$42k of tax the owner still pays. Added back, A ($1.282M) passes B ($1.262M). The $22k base gap looked decisive but the tax gap is larger. Bid B is the true low."
  },
  {
    id: "hvac-rtu-furnish",
    trade: "HVAC / Mechanical",
    project: "Grocery anchor store — Delaware",
    scope: "Furnish + install (11) packaged rooftop units per schedule, ductwork, curbs, controls.",
    bids: [
      { id: "A", base: 1520000,
        inc: ["Ductwork, curbs, controls, gas piping", "Set & connect RTUs"],
        exc: ["(11) RTUs FURNISHED by owner/vendor — set & connect only", "Roof structural reinforcement — by GC"] },
      { id: "B", base: 2010000,
        inc: ["Furnish & install all (11) RTUs per schedule", "Ductwork, curbs, controls"],
        exc: ["Roof structural reinforcement — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes FURNISHING the (11) RTUs (~$520k of equipment)", ok: true },
      { t: "Both exclude roof structural reinforcement (GC) — a wash", ok: false },
      { t: "Bid A includes gas piping", ok: false }
    ],
    add: { A: [{ t: "Furnish (11) RTUs", amt: 520000 }], B: [] },
    why: "The equipment is the money. Bid A's low number is 'set & connect only' — the (11) units themselves (~$520k) are excluded. Someone buys them, so they load onto A ($2.04M), just past Bid B ($2.01M). The largest-looking apparent gap ($490k) fully reverses. Bid B is the true low."
  },
  {
    id: "elec-fire-alarm",
    trade: "Electrical",
    project: "3-story assisted-living facility — Maryland",
    scope: "Power, lighting (F&I), devices, and a complete addressable fire alarm system.",
    bids: [
      { id: "A", base: 1640000,
        inc: ["Power, lighting F&I, devices"],
        exc: ["Fire alarm system — BY OTHERS", "Tele/data cabling — by others"] },
      { id: "B", base: 1742000,
        inc: ["Furnish & install complete addressable fire alarm", "Power, lighting F&I, devices"],
        exc: ["Tele/data cabling — by others"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the fire alarm system (~$118k)", ok: true },
      { t: "Both exclude tele/data cabling — a wash", ok: false },
      { t: "Bid A lists devices separately", ok: false }
    ],
    add: { A: [{ t: "Addressable fire alarm system", amt: 118000 }], B: [] },
    why: "Fire alarm is frequently carved out and forgotten in leveling. Bid A dropped it 'by others' (~$118k). It's required, so it's added back, lifting A above Bid B. Tele/data is excluded in both. Bid B is the true low."
  },
  {
    id: "ofci-hoods",
    trade: "HVAC / Mechanical",
    project: "Research lab building — Pennsylvania",
    scope: "Complete HVAC. Owner is furnishing the fume hoods (OFCI) — subs install and connect only.",
    bids: [
      { id: "A", base: 2240000,
        inc: ["Ductwork, equipment, controls, TAB", "Install & connect owner-furnished hoods"],
        exc: ["Fume hoods FURNISHED by owner (OFCI)"] },
      { id: "B", base: 2395000,
        inc: ["Ductwork, equipment, controls, TAB", "Install & connect owner-furnished hoods"],
        exc: ["Fume hoods FURNISHED by owner (OFCI)"] }
    ],
    gapOptions: [
      { t: "No leveling adder — the hoods are Owner-Furnished (OFCI) and excluded by BOTH bids equally", ok: true },
      { t: "Add ~$300k of fume hoods to Bid A", ok: false },
      { t: "Bid A must be missing controls", ok: false }
    ],
    add: { A: [], B: [] },
    why: "This one does NOT flip. An exclusion only becomes a leveling adder when it's asymmetric AND the CONTRACTOR (not the owner) has to buy it. The fume hoods are owner-furnished for everyone, so they leave both bids identically — no adjustment. Bid A stays the true low. The trap is reflexively adding excluded scope without asking who actually provides it."
  },
  {
    id: "plumb-medgas",
    trade: "Plumbing",
    project: "Ambulatory surgery center — Delaware",
    scope: "Domestic water, sanitary, fixtures, and a complete medical-gas system with certification.",
    bids: [
      { id: "A", base: 1180000,
        inc: ["Domestic water, sanitary, fixtures"],
        exc: ["Medical gas systems + certification — BY OTHERS", "Site utilities beyond 5 ft — by others"] },
      { id: "B", base: 1410000,
        inc: ["Furnish & install complete med-gas piping, alarms, 3rd-party certification", "Domestic water, sanitary, fixtures"],
        exc: ["Site utilities beyond 5 ft — by others"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the medical-gas system + certification (~$245k)", ok: true },
      { t: "Both exclude site utilities beyond 5 ft — a wash", ok: false },
      { t: "Bid A lists fixture carriers separately", ok: false }
    ],
    add: { A: [{ t: "Med-gas system + certification", amt: 245000 }], B: [] },
    why: "Med gas is a specialty scope general plumbers often exclude. On a surgery center it's required and third-party certified (~$245k). Added back, Bid A ($1.425M) passes Bid B ($1.41M). Site-utility exclusion is shared. Bid B is the true low."
  },
  {
    id: "hvac-tab",
    trade: "HVAC / Mechanical",
    project: "Office renovation — Virginia",
    scope: "Equipment, ductwork, controls, and independent air/water test & balance.",
    bids: [
      { id: "A", base: 560000,
        inc: ["Equipment, ductwork, controls"],
        exc: ["Testing & balancing — BY OTHERS", "Access panels furnished, installed by GC"] },
      { id: "B", base: 598000,
        inc: ["Independent TAB by NEBB-certified agency", "Equipment, ductwork, controls"],
        exc: ["Access panels furnished, installed by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes independent test & balance (~$44k)", ok: true },
      { t: "Both exclude access-panel installation (GC) — a wash", ok: false },
      { t: "Bid A held escalation", ok: false }
    ],
    add: { A: [{ t: "Independent TAB", amt: 44000 }], B: [] },
    why: "TAB is a required close-out scope by an independent agency (~$44k). Bid A excluded it; added back, A ($604k) passes B ($598k). Access-panel install is GC scope in both. Bid B is the true low."
  },
  {
    id: "elec-temp-power",
    trade: "Electrical",
    project: "Mixed-use core & shell — New Jersey",
    scope: "Permanent electrical plus temporary power & lighting for the construction duration.",
    bids: [
      { id: "A", base: 2460000,
        inc: ["Permanent electrical"],
        exc: ["Temporary power & lighting — BY OTHERS", "Generator — deferred package"] },
      { id: "B", base: 2520000,
        inc: ["Temporary power & lighting for construction", "Permanent electrical"],
        exc: ["Generator — deferred package"] }
    ],
    gapOptions: [
      { t: "Bid A excludes temporary power & lighting (~$68k)", ok: true },
      { t: "Both exclude the deferred generator — a wash", ok: false },
      { t: "Bid B holds a longer schedule", ok: false }
    ],
    add: { A: [{ t: "Temporary power & lighting", amt: 68000 }], B: [] },
    why: "Temp power is real, recurring cost the job carries (~$68k). Bid A excluded it 'by others'; someone provides it, so it's added back and A ($2.528M) passes B ($2.52M). The deferred generator is excluded in both. Bid B is the true low."
  },
  {
    id: "fire-pump",
    trade: "Fire Protection",
    project: "12-story residential tower — Maryland",
    scope: "High-rise standpipe + sprinkler with an electric fire pump, controller, and jockey pump.",
    bids: [
      { id: "A", base: 1340000,
        inc: ["Standpipe, sprinkler, risers"],
        exc: ["Fire pump, controller, jockey pump — BY OTHERS", "Equipment pad — by GC", "Power to pump — by electrical"] },
      { id: "B", base: 1455000,
        inc: ["Complete fire pump, controller, jockey pump", "Standpipe, sprinkler, risers"],
        exc: ["Equipment pad — by GC", "Power to pump — by electrical"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the fire pump package (~$128k)", ok: true },
      { t: "Both exclude the pump equipment pad (GC) — a wash", ok: false },
      { t: "Both exclude power to the pump (electrical) — a wash", ok: false }
    ],
    add: { A: [{ t: "Fire pump + controller + jockey", amt: 128000 }], B: [] },
    why: "A high-rise standpipe needs the pump package (~$128k) — not optional. Bid A excluded the pump itself; added back, A ($1.468M) passes B ($1.455M). The pad (GC) and pump power (electrical) are excluded in both. Bid B is the true low."
  },
  {
    id: "pp-bond",
    trade: "Cross-trade (Electrical)",
    project: "Public school — Pennsylvania (public work)",
    scope: "Complete electrical on a public project requiring a 100% performance & payment bond.",
    bids: [
      { id: "A", base: 1860000,
        inc: ["All electrical work"],
        exc: ["Bond EXCLUDED — available at +1.4% if required", "MEP permits — by GC"] },
      { id: "B", base: 1878000,
        inc: ["100% performance & payment bond", "All electrical work"],
        exc: ["MEP permits — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the required P&P bond (~1.4% ≈ $26k)", ok: true },
      { t: "Both exclude MEP permits (GC) — a wash", ok: false },
      { t: "Bid A held unit prices for rock", ok: false }
    ],
    add: { A: [{ t: "P&P bond (~1.4%)", amt: 26000 }], B: [] },
    why: "Public work requires the bond from everyone. Bid A left it out 'available at +1.4%' (~$26k on this value); it's required, so it's added and A ($1.886M) passes B ($1.878M). A tight $8k flip — bond alone can decide a close race. Permits are GC scope in both. Bid B is the true low."
  },
  {
    id: "hvac-vfd",
    trade: "HVAC / Mechanical",
    project: "Central plant pump upgrade — Delaware",
    scope: "(6) pump replacements with variable-frequency drives — the classic MEP division-of-work item.",
    bids: [
      { id: "A", base: 980000,
        inc: ["Pumps, piping, valves"],
        exc: ["VFDs & starters FURNISHED/INSTALLED by electrical", "Seismic bracing — by GC"] },
      { id: "B", base: 1032000,
        inc: ["VFDs for all (6) pumps furnished & installed", "Pumps, piping, valves"],
        exc: ["Seismic bracing — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A pushes the (6) VFDs to electrical — confirm electrical carried them (~$58k gap)", ok: true },
      { t: "Both exclude seismic bracing (GC) — a wash", ok: false },
      { t: "Bid A held a longer chiller lead time", ok: false }
    ],
    add: { A: [{ t: "(6) VFDs (division-of-work orphan)", amt: 58000 }], B: [] },
    why: "The VFD orphan: mechanical says 'by electrical,' electrical says 'by mechanical,' and nobody prices them. If the electrical bids also exclude the VFDs, the ~$58k lands back on the mechanical package — Bid A ($1.038M) passes Bid B ($1.032M). Seismic is GC in both. Bid B is the true low. Always confirm which trade actually carried the VFDs."
  },
  {
    id: "plumb-wh",
    trade: "Plumbing",
    project: "Select-service hotel — Virginia",
    scope: "Rough-in, fixtures, and furnish + install (2) commercial water heaters with storage.",
    bids: [
      { id: "A", base: 840000,
        inc: ["Rough-in, fixtures", "Install water heaters"],
        exc: ["Water heaters & storage tanks FURNISHED by others", "Gas beyond meter — by utility"] },
      { id: "B", base: 905000,
        inc: ["Furnish & install (2) water heaters + storage", "Rough-in, fixtures"],
        exc: ["Gas beyond meter — by utility"] }
    ],
    gapOptions: [
      { t: "Bid A excludes FURNISHING the (2) water heaters (~$72k)", ok: true },
      { t: "Both exclude gas beyond the meter (utility) — a wash", ok: false },
      { t: "Bid A lists recirculation separately", ok: false }
    ],
    add: { A: [{ t: "Furnish (2) water heaters + storage", amt: 72000 }], B: [] },
    why: "'Install only' hides the equipment cost. The (2) heaters + storage (~$72k) are furnished by someone; added back, Bid A ($912k) passes Bid B ($905k). Gas-beyond-meter is utility scope in both. Bid B is the true low."
  },
  {
    id: "elec-gen-ats",
    trade: "Electrical",
    project: "Operations center with standby power — New Jersey",
    scope: "Distribution, feeders, and a complete standby generator + automatic transfer switch.",
    bids: [
      { id: "A", base: 2880000,
        inc: ["Distribution, feeders", "Install & connect gen/ATS"],
        exc: ["Generator & ATS FURNISHED by others — install only", "Concrete gen pad — by GC", "Fuel tank — deferred"] },
      { id: "B", base: 3110000,
        inc: ["Furnish & install standby generator, ATS, connections", "Distribution, feeders"],
        exc: ["Concrete gen pad — by GC", "Fuel tank — deferred"] }
    ],
    gapOptions: [
      { t: "Bid A excludes FURNISHING the generator + ATS (~$248k)", ok: true },
      { t: "Both exclude the concrete gen pad (GC) — a wash", ok: false },
      { t: "Both defer the fuel tank — a wash", ok: false }
    ],
    add: { A: [{ t: "Furnish generator + ATS", amt: 248000 }], B: [] },
    why: "The gen and ATS are the cost — 'install only' leaves ~$248k out. Required, so it's added back and Bid A ($3.128M) passes Bid B ($3.11M). Pad (GC) and fuel tank (deferred) are excluded in both. Bid B is the true low."
  },
  {
    id: "hvac-cx",
    trade: "HVAC / Mechanical",
    project: "Class-A office building — Maryland (owner Cx required)",
    scope: "Equipment, controls, TAB, plus contractor commissioning support / functional-test participation.",
    bids: [
      { id: "A", base: 1120000,
        inc: ["Equipment, controls, TAB"],
        exc: ["Commissioning support / functional testing — BY OTHERS", "BAS graphics — by controls vendor"] },
      { id: "B", base: 1150000,
        inc: ["Commissioning support & functional-test participation", "Equipment, controls, TAB"],
        exc: ["BAS graphics — by controls vendor"] }
    ],
    gapOptions: [
      { t: "Bid A excludes commissioning support / functional testing (~$34k)", ok: true },
      { t: "Both exclude BAS graphics (controls vendor) — a wash", ok: false },
      { t: "Bid A held a longer schedule", ok: false }
    ],
    add: { A: [{ t: "Commissioning support", amt: 34000 }], B: [] },
    why: "Owner-mandated Cx needs the installing contractor in the room (~$34k of labor). Bid A excluded it; added back, A ($1.154M) passes B ($1.15M). A small $4k flip — reward for reading the fine print. BAS graphics are vendor scope in both. Bid B is the true low."
  },
  {
    id: "access-panel",
    trade: "Electrical",
    project: "Retail tenant improvement — Delaware",
    scope: "Complete electrical incl. lighting (F&I) and fire alarm. Minor GC-coordination items excluded.",
    bids: [
      { id: "A", base: 960000,
        inc: ["All electrical incl. lighting F&I and fire alarm"],
        exc: ["Access panels furnished; INSTALLED by GC (~$2.5k)", "Cutting & patching — by GC"] },
      { id: "B", base: 1015000,
        inc: ["All electrical incl. lighting F&I and fire alarm", "Access-panel installation"],
        exc: ["Cutting & patching — by GC"] }
    ],
    gapOptions: [
      { t: "No material gap — A's exclusions are immaterial (access-panel install ~$2.5k) or GC scope", ok: true },
      { t: "Add the fixture package to Bid A", ok: false },
      { t: "Bid A must be missing fire alarm", ok: false }
    ],
    add: { A: [{ t: "Access-panel install (immaterial)", amt: 2500 }], B: [] },
    why: "This one does NOT flip. Quantify before you react: access-panel installation is ~$2.5k and cutting/patching is GC scope. Neither closes a $55k base gap. Bid A already carries the fixtures AND fire alarm the low bids in other rounds were missing. Bid A is the true low — an exclusion list is only as dangerous as the dollars behind it."
  },
  {
    id: "fire-fa-interface",
    trade: "Fire Protection",
    project: "Office building — Pennsylvania",
    scope: "Wet sprinkler plus flow/tamper switches wired and interfaced to the fire-alarm panel.",
    bids: [
      { id: "A", base: 520000,
        inc: ["Wet sprinkler, riser, FDC", "Flow/tamper switches furnished"],
        exc: ["Switch WIRING & FA interface — BY OTHERS", "Fire pump — none required"] },
      { id: "B", base: 548000,
        inc: ["Flow/tamper switches furnished, wired, interfaced to FA panel", "Wet sprinkler, riser, FDC"],
        exc: ["Fire pump — none required"] }
    ],
    gapOptions: [
      { t: "Bid A furnishes switches but excludes wiring / FA interface (~$31k)", ok: true },
      { t: "Both exclude a fire pump (none required) — a wash", ok: false },
      { t: "Bid A lists the FDC separately", ok: false }
    ],
    add: { A: [{ t: "Switch wiring + FA interface", amt: 31000 }], B: [] },
    why: "'Furnished' is not 'wired.' Bid A supplies the switches but pushes the ~$31k of interface wiring 'by others.' Added back, A ($551k) passes B ($548k). The 'fire pump — none required' line is a wash in both. Bid B is the true low."
  },
  {
    id: "hvac-insulation",
    trade: "HVAC / Mechanical",
    project: "School HVAC replacement — New Jersey",
    scope: "Equipment, ductwork, hydronic piping, and all duct & pipe insulation.",
    bids: [
      { id: "A", base: 1240000,
        inc: ["Equipment, ductwork, piping"],
        exc: ["Duct & pipe insulation — BY OTHERS", "Firestopping — by GC"] },
      { id: "B", base: 1318000,
        inc: ["All duct & pipe insulation", "Equipment, ductwork, piping"],
        exc: ["Firestopping — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes all duct & pipe insulation (~$86k)", ok: true },
      { t: "Both exclude firestopping (GC) — a wash", ok: false },
      { t: "Bid A held escalation", ok: false }
    ],
    add: { A: [{ t: "Duct & pipe insulation", amt: 86000 }], B: [] },
    why: "Insulation is sometimes split out and missed. It's required (~$86k); added back, Bid A ($1.326M) passes Bid B ($1.318M). Firestopping is GC scope in both. Bid B is the true low."
  },
  {
    id: "permits",
    trade: "Cross-trade (Plumbing)",
    project: "Restaurant build-out — Maryland",
    scope: "Complete plumbing including trade permit and inspection fees.",
    bids: [
      { id: "A", base: 410000,
        inc: ["All plumbing work"],
        exc: ["Plumbing permit & fees — BY OTHERS", "Grease-interceptor excavation — by GC"] },
      { id: "B", base: 432000,
        inc: ["Plumbing permit & inspection fees", "All plumbing work"],
        exc: ["Grease-interceptor excavation — by GC"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the trade permit & fees (~$26k, valuation-based)", ok: true },
      { t: "Both exclude grease-interceptor excavation (GC) — a wash", ok: false },
      { t: "Bid A lists fixtures separately", ok: false }
    ],
    add: { A: [{ t: "Permit & inspection fees", amt: 26000 }], B: [] },
    why: "Valuation-based permit fees are real money someone pays (~$26k here). Bid A excluded them; added back, A ($436k) passes B ($432k). Grease-interceptor excavation is GC scope in both. Bid B is the true low."
  },
  {
    id: "elec-lowvolt",
    trade: "Electrical",
    project: "Office fit-out with structured cabling — Virginia",
    scope: "Power, lighting (F&I), fire alarm, plus Cat6 structured cabling to (180) drops.",
    bids: [
      { id: "A", base: 980000,
        inc: ["Power, lighting F&I, fire alarm"],
        exc: ["Tele/data structured cabling — BY OTHERS", "AV / security — by others"] },
      { id: "B", base: 1092000,
        inc: ["Structured Cat6 to all (180) drops", "Power, lighting F&I, fire alarm"],
        exc: ["AV / security — by others"] }
    ],
    gapOptions: [
      { t: "Bid A excludes the structured cabling to (180) drops (~$124k)", ok: true },
      { t: "Both exclude AV / security — a wash", ok: false },
      { t: "Bid A includes fire alarm", ok: false }
    ],
    add: { A: [{ t: "Cat6 structured cabling (180 drops)", amt: 124000 }], B: [] },
    why: "Low-voltage cabling to 180 drops is ~$124k — not trivial. Bid A pushed it 'by others'; the project needs it, so it's added and A ($1.104M) passes B ($1.092M). AV/security is excluded in both. Bid B is the true low."
  },
  {
    id: "hvac-curbs",
    trade: "HVAC / Mechanical",
    project: "Retail RTU replacement — Delaware",
    scope: "Furnish + install RTUs, ductwork, and the RTU roof curbs.",
    bids: [
      { id: "A", base: 760000,
        inc: ["RTUs F&I, ductwork", "Set units on curbs"],
        exc: ["RTU roof curbs FURNISHED by others", "Roof-membrane flashing — by roofer"] },
      { id: "B", base: 798000,
        inc: ["Furnish & install RTU roof curbs", "RTUs F&I, ductwork"],
        exc: ["Roof-membrane flashing — by roofer"] }
    ],
    gapOptions: [
      { t: "Bid A excludes furnishing the RTU roof curbs (~$44k)", ok: true },
      { t: "Both exclude roof-membrane flashing (roofer scope) — a wash", ok: false },
      { t: "Bid A held escalation", ok: false }
    ],
    add: { A: [{ t: "Furnish RTU roof curbs", amt: 44000 }], B: [] },
    why: "Curbs (mechanical) and membrane flashing (roofer) are different scopes — don't conflate them. Bid A excluded the curbs (~$44k), which it needs; added back, A ($804k) passes B ($798k). Membrane flashing is roofer scope in both. Bid B is the true low."
  },
  {
    id: "plumb-fixtures",
    trade: "Plumbing",
    project: "Office building restroom package — Pennsylvania",
    scope: "Rough-in, carriers, and furnish + install all plumbing fixtures per spec.",
    bids: [
      { id: "A", base: 680000,
        inc: ["Rough-in, carriers", "Install fixtures"],
        exc: ["Plumbing fixtures FURNISHED by owner — install only", "Water heater — separate package"] },
      { id: "B", base: 742000,
        inc: ["Furnish & install all fixtures per spec", "Rough-in, carriers"],
        exc: ["Water heater — separate package"] }
    ],
    gapOptions: [
      { t: "Bid A excludes FURNISHING the fixture package (~$68k)", ok: true },
      { t: "Both exclude the water heater (separate package) — a wash", ok: false },
      { t: "Bid A includes carriers", ok: false }
    ],
    add: { A: [{ t: "Furnish fixture package", amt: 68000 }], B: [] },
    why: "'Install only' means the fixtures (~$68k) come from someone. Added back, Bid A ($748k) passes Bid B ($742k). The water heater is a separate package excluded in both. Bid B is the true low."
  },
  {
    id: "elec-3bid",
    trade: "Electrical (3 bids)",
    project: "Warehouse + office — New Jersey",
    scope: "Power, distribution, lighting (F&I), and a complete fire-alarm system.",
    bids: [
      { id: "A", base: 1900000,
        inc: ["Power, distribution, lighting F&I"],
        exc: ["Fire alarm — BY OTHERS"] },
      { id: "B", base: 1975000,
        inc: ["Fire alarm + lighting F&I + power/distribution (fully scoped)"],
        exc: [] },
      { id: "C", base: 1940000,
        inc: ["Fire alarm, power, distribution"],
        exc: ["Lighting fixtures FURNISHED by others (install only)"] }
    ],
    gapOptions: [
      { t: "A is missing fire alarm (~$92k) AND C is missing fixture furnish (~$130k) — B is the only fully-scoped bid", ok: true },
      { t: "Bid A is low and fully scoped — take it", ok: false },
      { t: "Bid C's exclusion is trivial", ok: false }
    ],
    add: { A: [{ t: "Fire alarm system", amt: 92000 }], B: [], C: [{ t: "Furnish fixture package", amt: 130000 }] },
    why: "Two different bidders each hid a different scope. Level both: Bid A + fire alarm = $1.992M; Bid C + fixture furnish = $2.07M; Bid B is already complete at $1.975M. The apparent low (A) and the biggest exclusion (C) both lose to the one bid that left nothing out. Bid B is the true low."
  },
  {
    id: "hvac-3bid",
    trade: "HVAC / Mechanical (3 bids)",
    project: "Medical office building — Maryland",
    scope: "Equipment, ductwork, DDC controls, and independent test & balance.",
    bids: [
      { id: "A", base: 1480000,
        inc: ["Equipment, ductwork", "Test & balance"],
        exc: ["DDC controls — BY OTHERS"] },
      { id: "B", base: 1560000,
        inc: ["Controls + TAB + equipment/ductwork (fully scoped)"],
        exc: [] },
      { id: "C", base: 1505000,
        inc: ["DDC controls, equipment, ductwork"],
        exc: ["Test & balance — BY OTHERS"] }
    ],
    gapOptions: [
      { t: "A's controls exclusion (~$140k) is far larger than C's TAB exclusion (~$40k)", ok: true },
      { t: "Bid B wins because it's fully scoped", ok: false },
      { t: "Bid A stays low after leveling", ok: false }
    ],
    add: { A: [{ t: "DDC controls", amt: 140000 }], B: [], C: [{ t: "Independent TAB", amt: 40000 }] },
    why: "Not every gap is equal. Level all three: Bid A + controls = $1.62M; Bid C + TAB = $1.545M; Bid B (complete) = $1.56M. The true low is Bid C — the small-gap bid — not the apparent low (A) and not the fully-scoped bid (B). Size the gap before you rank."
  }
];

/* ------------------------------------------------------------------ *
 *  Pure leveling logic (used by the game AND the self-test)
 * ------------------------------------------------------------------ */
function levelScenario(scn) {
  const rows = scn.bids.map(function (b) {
    const adders = (scn.add[b.id] || []);
    const addTotal = adders.reduce(function (s, a) { return s + a.amt; }, 0);
    return { id: b.id, base: b.base, adders: adders, leveled: b.base + addTotal };
  });
  const apparent = rows.slice().sort(function (a, b) { return a.base - b.base; })[0];
  const trueLow = rows.slice().sort(function (a, b) { return a.leveled - b.leveled; })[0];
  // The "gap you caught" = scope hidden inside the apparent-low bid.
  const gapValue = apparent.leveled - apparent.base;
  const flipped = apparent.id !== trueLow.id;
  return { rows: rows, apparent: apparent, trueLow: trueLow, gapValue: gapValue, flipped: flipped };
}

/* Expose for Node self-test; harmless in the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCENARIOS: SCENARIOS, levelScenario: levelScenario };
}
