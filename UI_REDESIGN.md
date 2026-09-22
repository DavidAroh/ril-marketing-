# RIL AI Marketing Operating System — Complete UI Redesign

**Design Philosophy:** Marketing workspace, not engineering dashboard. Every screen answers "what needs my attention" before "what data exists." The Studio aesthetic (calm cards, stamped statuses, hairline dividers) extends across the full platform.

---

## Information Architecture

### Primary Navigation (Left Rail)

```
┌─ RIL ─────────────────────┐
│ ● Home                     │  ← Command Centre
│   Activities               │
│   Content                  │  ← Library + Calendar combined view
│   Campaigns                │
│   Leads                    │
│   Audience                 │  ← Segments + Insights
│   Trends                   │
│   Analytics                │
│   Settings                 │
└────────────────────────────┘
```

**Hierarchy:**
- **Tier 1 (Daily):** Home, Activities, Content, Leads
- **Tier 2 (Weekly):** Campaigns, Audience, Trends, Analytics  
- **Tier 3 (Admin):** Settings

**Active state:** Blue dot + medium weight text, not a filled background.

---

## 1. Marketing Command Centre (`/dashboard`)

**Purpose:** "What needs my attention right now."

### Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Marketing Command Centre                 Week of Sept 16–22   │
│  Your operating view across content, leads, and campaigns      │
└────────────────────────────────────────────────────────────────┘

┌─ Attention Required ──────────────────────────────────────────┐
│  7 items need your review                                      │
│                                                                 │
│  ┌─ Content Awaiting Approval ──────────┐  ┌─ Leads ────────┐│
│  │  3 PENDING REVIEW                     │  │  12 HOT        ││
│  │  • Blog: Innovation bootcamp recap    │  │  8 need follow ││
│  │  • LinkedIn: Partnership announcement │  └────────────────┘│
│  │  • Newsletter: September highlights   │                     │
│  └───────────────────────────────────────┘                     │
│                                                                 │
│  ┌─ Publishing Issues ──────────────────┐  ┌─ Budget ───────┐│
│  │  1 FAILED                             │  │  Performance   ││
│  │  Instagram post needs reconnect       │  │  $847 / $2000  ││
│  └───────────────────────────────────────┘  └────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─ This Week ────────────────────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                              │
│   3    5    2    4    1    —    —    ← Scheduled posts count   │
│                                                                  │
│  Today: 3 scheduled   Next: Tomorrow 9:00 AM (LinkedIn)         │
└──────────────────────────────────────────────────────────────────┘

┌─ Performance Snapshot ──────────────────────────────────────────┐
│  September vs August                                             │
│                                                                  │
│  Leads Generated        Website Traffic      Email Growth       │
│  127  ↑ 23%            8,430  ↑ 18%         1,240  ↑ 12%      │
│                                                                  │
│  Social Growth          Content Published    Conversion Rate    │
│  +340  ↑ 8%            24 pieces            9.2%  ↓ 1.8%      │
└──────────────────────────────────────────────────────────────────┘

┌─ Recent Activity ───────────────────────────────────────────────┐
│  Wire 01   Innovation Bootcamp (Sept 12)     3 assets published │
│  Wire 02   Partnership: Tech Hub Lagos       In review          │
│  Wire 03   AI Workshop Series               Drafting           │
└──────────────────────────────────────────────────────────────────┘
```

### Key Principles

**1. Attention hierarchy**  
- "Needs action" surfaces first (approvals, failed publishes, hot leads)
- "Awareness" sits below (calendar, performance, recent activity)
- Everything is scannable in < 5 seconds

**2. Numbers with context**  
- Never raw counts alone: "127 ↑ 23%" not "127"
- Trends use arrows, not color alone
- Targets shown where they exist: "$847 / $2,000"

**3. Card density**  
- Dense cards (multiple items) for queues (content awaiting approval)
- Sparse cards (one number) for KPIs
- Ledger cards for chronological activity

**4. CTAs on first item only**  
- "Review" button on the first pending content item
- "View all 3" at card bottom if more exist

---

## 2. Activity Hub (`/activities`, `/activities/new`, `/activities/[id]`)

**Purpose:** Log what's happening at RIL so it can become marketing content.

### List View (`/activities`)

```
┌────────────────────────────────────────────────────────────────┐
│  Activities                                    + Log Activity   │
│  Everything happening at RIL                                    │
└────────────────────────────────────────────────────────────────┘

┌─ Filters ──────────────────────────────────────────────────────┐
│  [All] [Programs] [Partnerships] [Events] [Workshops]          │
│  [Sept 2026 ▾]                                      🔍 Search   │
└────────────────────────────────────────────────────────────────┘

┌─ Activity ──────────────────────────────────────────────────────┐
│  Wire 01                                    SEPT 12, 2026       │
│  Innovation Bootcamp — Cohort 4                                 │
│  3-day intensive for 24 founders · Lagos                        │
│                                                                  │
│  📹 1 video  📸 18 photos  📄 2 documents                       │
│  → 12 content assets created    View activity                   │
└──────────────────────────────────────────────────────────────────┘

┌─ Activity ──────────────────────────────────────────────────────┐
│  Wire 02                                    SEPT 15, 2026       │
│  Partnership Announcement: Tech Hub Lagos                       │
│  Strategic partnership for workspace access                     │
│                                                                  │
│  📸 4 photos  📄 1 press release                                │
│  → 0 content assets yet    Start repurposing                    │
└──────────────────────────────────────────────────────────────────┘
```

### Detail View (`/activities/[id]`)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Activities                                                   │
│                                                                  │
│  Wire 01 · Sept 12, 2026                                        │
│  Innovation Bootcamp — Cohort 4                                 │
│  3-day intensive program for 24 early-stage founders in Lagos.  │
│  Focus: AI, fintech, and climate tech.                          │
└────────────────────────────────────────────────────────────────┘

┌─ Source Materials ──────────────────────────────────────────────┐
│  📹  Keynote_Sept12.mp4        1h 23m      Upload more          │
│  📸  18 event photos           View all                         │
│  📄  Participant_list.pdf      24 names                         │
│  📄  Program_agenda.pdf        3 days                           │
└──────────────────────────────────────────────────────────────────┘

┌─ Content Created From This Activity ────────────────────────────┐
│  12 assets                                     + Create more     │
│                                                                  │
│  Blog          Event recap: Innovation...      PUBLISHED        │
│  Newsletter    September highlights            PUBLISHED        │
│  LinkedIn      Key insights from day 1         SCHEDULED        │
│  Instagram     3 reels                         PUBLISHED        │
│  X             Event thread (8 tweets)         PUBLISHED        │
│  Email         Follow-up to participants       SENT             │
└──────────────────────────────────────────────────────────────────┘

┌─ Campaign ──────────────────────────────────────────────────────┐
│  Innovation Bootcamp Q4                                          │
│  42 registrations via marketing  ·  28% conversion  ·  View     │
└──────────────────────────────────────────────────────────────────┘

┌─ Performance ───────────────────────────────────────────────────┐
│  Content from this activity generated:                           │
│  • 42 registrations (attributed via links)                       │
│  • 8,430 impressions across platforms                            │
│  • 12 qualified leads captured                                   │
└──────────────────────────────────────────────────────────────────┘
```

### New Activity Form (`/activities/new`)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Activities                                                   │
│                                                                  │
│  Log New Activity                                               │
│  What's happening at RIL?                                       │
└────────────────────────────────────────────────────────────────┘

┌─ Basic Information ─────────────────────────────────────────────┐
│  Activity Type *                                                │
│  [Program ▾] Event · Workshop · Partnership · Milestone         │
│                                                                  │
│  Activity Name *                                                │
│  Innovation Bootcamp — Cohort 4                                 │
│                                                                  │
│  Date *                     Location                            │
│  Sept 12, 2026              Lagos, Nigeria                      │
│                                                                  │
│  Description                                                    │
│  3-day intensive program for 24 early-stage founders...         │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │                                                             ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

┌─ People & Partners ─────────────────────────────────────────────┐
│  Speakers / Facilitators                                        │
│  + Add speaker                                                  │
│                                                                  │
│  Partners                                                       │
│  + Add partner                                                  │
│                                                                  │
│  Target Audience                                                │
│  [Early-stage founders] [Tech entrepreneurs] [+ Add]            │
└──────────────────────────────────────────────────────────────────┘

┌─ Registration & Links ──────────────────────────────────────────┐
│  Registration Link (if applicable)                              │
│  https://ril.org/bootcamp-q4                                    │
│                                                                  │
│  ℹ️ Unique tracking links will be generated for each piece of  │
│    content created from this activity                           │
└──────────────────────────────────────────────────────────────────┘

┌─ Source Materials ──────────────────────────────────────────────┐
│  Upload videos, photos, documents                               │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  📤  Drag files here or click to browse                    ││
│  │                                                             ││
│  │  Supported: MP4, MOV, JPG, PNG, PDF, DOCX                  ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

                     [Cancel]  [Save Activity]
```

**Key Principles:**
- Form is **progressive**: basic info first, advanced optional
- **Upload is secondary**: can log activity first, upload materials later
- **Attribution built in**: system explains tracking links will be generated
- No jargon: "What's happening" not "Entity instantiation"

---

## 3. AI Content Repurposing Engine (`/activities/[id]/repurpose`)

**Purpose:** Turn one source into many outputs. The core AI workflow.

### Step 1: Select Source

```
┌────────────────────────────────────────────────────────────────┐
│  Create Content                              Wire 01 Activity   │
│  From: Innovation Bootcamp — Cohort 4                           │
└────────────────────────────────────────────────────────────────┘

┌─ Choose Source Material ────────────────────────────────────────┐
│  What should we turn into content?                              │
│                                                                  │
│  ○  📹 Keynote_Sept12.mp4      1h 23m    [Selected]            │
│  ○  📸 18 event photos         View all                         │
│  ○  📄 Participant_list.pdf                                     │
│  ○  📄 Program_agenda.pdf                                       │
│                                                                  │
│  Or upload new material:  [Upload file]                         │
└──────────────────────────────────────────────────────────────────┘

                            [Cancel]  [Next →]
```

### Step 2: Select Outputs

```
┌────────────────────────────────────────────────────────────────┐
│  Create Content                              Step 2 of 3        │
│  Source: Keynote_Sept12.mp4 (1h 23m)                           │
└────────────────────────────────────────────────────────────────┘

┌─ What should we create? ────────────────────────────────────────┐
│  Select the content types you need                              │
│                                                                  │
│  Written Content                                                │
│  ☑ Blog post              Full article with SEO                │
│  ☑ Newsletter             Email-ready format                   │
│  ☐ Press release          External announcement                │
│                                                                  │
│  Social Media                                                   │
│  ☑ LinkedIn post          Professional, thought leadership     │
│  ☑ Instagram caption      Visual storytelling                  │
│  ☑ X / Twitter post       Concise, thread-ready                │
│  ☐ YouTube description    With timestamps                      │
│                                                                  │
│  Video                                                          │
│  ☑ Short-form clips       Reels, TikTok, Shorts (AI suggests)  │
│  ☐ Subtitles / captions   SRT file                             │
│                                                                  │
│  ℹ️ AI will analyze the video and generate drafts. You'll      │
│    review and edit everything before it's published.            │
└──────────────────────────────────────────────────────────────────┘

                          [← Back]  [Generate →]
```

### Step 3: AI Processing (Loading State)

```
┌────────────────────────────────────────────────────────────────┐
│  Creating Content...                         Step 3 of 3        │
│  This may take 2–3 minutes                                      │
└────────────────────────────────────────────────────────────────┘

┌─ Progress ──────────────────────────────────────────────────────┐
│                                                                  │
│  ✓ Transcribed video                     00:43                  │
│  ✓ Analyzed key topics                   01:12                  │
│  ⟳ Generating blog post...               01:48                  │
│  ○ Generating newsletter                                        │
│  ○ Generating LinkedIn post                                     │
│  ○ Generating Instagram caption                                 │
│  ○ Generating X post                                            │
│  ○ Identifying short-form clips                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Step 4: Review Generated Content

```
┌────────────────────────────────────────────────────────────────┐
│  Review Generated Content                   6 drafts ready      │
│  Wire 01: Innovation Bootcamp — Cohort 4                        │
└────────────────────────────────────────────────────────────────┘

┌─ Generated Assets ──────────────────────────────────────────────┐
│  Each draft is marked AI GENERATED and needs your review        │
│                                                                  │
│  ┌─ Blog Post ─────────────────────────────────────────────┐  │
│  │  AI GENERATED                                            │  │
│  │  Key Insights from RIL's Innovation Bootcamp Q4         │  │
│  │                                                          │  │
│  │  On September 12, Renaissance Innovation Labs brought   │  │
│  │  together 24 early-stage founders for...                │  │
│  │                                                          │  │
│  │  1,240 words  ·  ~5 min read  ·  SEO optimized          │  │
│  │                                                          │  │
│  │  [Edit Draft]  [Approve]  [Discard]                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Newsletter ───────────────────────────────────────────┐  │
│  │  AI GENERATED                                            │  │
│  │  Subject: Innovation Bootcamp Q4 — Key Takeaways        │  │
│  │                                                          │  │
│  │  Hi [First Name],                                       │  │
│  │  Last week, we kicked off our Q4 Innovation Bootcamp... │  │
│  │                                                          │  │
│  │  420 words  ·  3 sections  ·  Ready to send             │  │
│  │                                                          │  │
│  │  [Edit Draft]  [Approve]  [Discard]                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  + 4 more drafts (LinkedIn, Instagram, X, Short-form clips)     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

              [Approve All]  [Review Individually]  [Done]
```

**Key Principles:**
- **Clear AI boundary**: Every generated asset shows "AI GENERATED" stamp
- **Batch approval available**: "Approve All" for experienced users
- **Individual control**: Edit/Approve/Discard per asset
- **Source traceability**: Always shows which activity/source this came from
- **No auto-publish**: Everything lands in review status

---

## 4. Content Library (`/library`)

**Purpose:** Every piece of content in one searchable place.

```
┌────────────────────────────────────────────────────────────────┐
│  Content Library                            + Create Content    │
│  All your marketing content                                     │
└────────────────────────────────────────────────────────────────┘

┌─ Filters ──────────────────────────────────────────────────────┐
│  Status      [All ▾]  AI Generated · Review · Approved · etc   │
│  Type        [All ▾]  Blog · Newsletter · Social · Video       │
│  Platform    [All ▾]  LinkedIn · Instagram · X · Email         │
│  Activity    [All ▾]  Bootcamp Q4 · Partnership Lagos          │
│  Date        [Sept 2026 ▾]                      🔍 Search       │
└────────────────────────────────────────────────────────────────┘

┌─ Content ───────────────────────────────────────────────────────┐
│  Wire 01 · Blog Post                         AI GENERATED       │
│  Key Insights from Innovation Bootcamp Q4                       │
│  Created Sept 16 · From Keynote_Sept12.mp4 · 1,240 words       │
│  SEO score: 82/100  ·  Target: innovation bootcamp             │
│                                                [Edit]  [Review]  │
└──────────────────────────────────────────────────────────────────┘

┌─ Content ───────────────────────────────────────────────────────┐
│  Wire 01 · LinkedIn                          APPROVED           │
│  3 key insights from our Innovation Bootcamp                    │
│  Scheduled Sept 18, 9:00 AM  ·  From Keynote_Sept12.mp4        │
│  Engagement est: High  ·  Audience: Tech entrepreneurs         │
│                                              [Edit]  [View]     │
└──────────────────────────────────────────────────────────────────┘

┌─ Content ───────────────────────────────────────────────────────┐
│  Wire 02 · Press Release                     IN REVIEW          │
│  RIL Partners with Tech Hub Lagos                               │
│  Awaiting leadership approval  ·  Draft by Sarah K.             │
│  Needs: Final partner logo                 [Edit]  [Approve]   │
└──────────────────────────────────────────────────────────────────┘
```

**Approval Pipeline Visual:**

```
Idea → AI Generated → Editing → Review → Approved → Scheduled → Published → Analysing
       ╰─────────────────────── Human gate ──────────────────────╯
```

---

## 5. Content Calendar (`/calendar`)

**Purpose:** See what's going out when, across all platforms.

### Month View

```
┌────────────────────────────────────────────────────────────────┐
│  Content Calendar                 [September 2026 ▾]  [Week ▾] │
│  Scheduled and published content                                │
└────────────────────────────────────────────────────────────────┘

     Mon        Tue        Wed        Thu        Fri        Sat   
┌──────────┬──────────┬──────────┬──────────┬──────────┬─────────
│    16    │    17    │    18    │    19    │    20    │    21   
│          │          │          │          │          │         
│ 🔵 3     │ 🟢 2     │ 🟣 1     │          │ 🔵 2     │         
│ scheduled│ published│ scheduled│          │ scheduled│         
│          │          │          │          │          │         
│ • LI 9am │ • IG 8am │ • LI 9am │          │ • X 10am │         
│ • IG 2pm │ • X 12pm │          │          │ • Email  │         
│ • Email  │          │          │          │   5pm    │         
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────

┌─ Today's Schedule ──────────────────────────────────────────────┐
│  Monday, September 16                                           │
│                                                                  │
│  9:00 AM   LinkedIn    Innovation Bootcamp insights    READY   │
│  2:00 PM   Instagram   Behind the scenes reel          READY   │
│  5:00 PM   Email       Newsletter: September update    READY   │
│                                                                  │
│  All posts ready to publish  ·  Buffer connected               │
└──────────────────────────────────────────────────────────────────┘
```

### Week View (Denser)

```
     Mon          Tue          Wed          Thu          Fri     
9am  LI: Insights IG: Reel    LI: Partner  —           X: Thread
12pm —           X: Quote     —           IG: Photo    —        
2pm  IG: Reel    —           —           —           Email     
5pm  Email       —           —           LI: Article  —        
```

### Drag-to-Reschedule

```
┌─ LinkedIn Post ─────────────────────────────────────────────────┐
│  Innovation Bootcamp insights                                   │
│  Currently: Mon Sept 16, 9:00 AM                                │
│  Drag to reschedule                                             │
│                                                                  │
│  [Cancel]  [Update Schedule]                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Lead Management (`/leads`, `/leads/[id]`)

**Purpose:** Every person who registered, downloaded, or inquired.

### List View

```
┌────────────────────────────────────────────────────────────────┐
│  Leads                                      + Add Lead Manually │
│  Everyone who's engaged with RIL                                │
└────────────────────────────────────────────────────────────────┘

┌─ Filters ──────────────────────────────────────────────────────┐
│  Status      [All ▾]  Hot · Warm · Cold · Qualified           │
│  Source      [All ▾]  Website · Social · Email · Event        │
│  Program     [All ▾]  Bootcamp Q4 · AI Workshop                │
│  Owner       [All ▾]  Unassigned · Sarah · David               │
│  Date        [Sept 2026 ▾]                      🔍 Search       │
└────────────────────────────────────────────────────────────────┘

┌─ Lead ──────────────────────────────────────────────────────────┐
│  🔥 HOT                                     Needs follow-up      │
│  Amara Okafor                                                   │
│  Founder, EduTech Nigeria  ·  amara@edutech.ng                 │
│                                                                  │
│  Source: LinkedIn post → Bootcamp registration (Sept 15)        │
│  Score: 85/100  ·  Opened 3 emails  ·  Visited site 4x         │
│  Interest: AI, Education, Fintech                               │
│                                                                  │
│  Assigned to: Sarah K.              [View Details]  [Contact]  │
└──────────────────────────────────────────────────────────────────┘

┌─ Lead ──────────────────────────────────────────────────────────┐
│  WARM                                                           │
│  David Mensah                                                   │
│  CTO, FinTech Ghana  ·  dmensah@company.com                    │
│                                                                  │
│  Source: Newsletter signup (Sept 10)                            │
│  Score: 42/100  ·  Opened 1 email  ·  No site visits           │
│  Interest: Fintech                                              │
│                                                                  │
│  Unassigned                         [View Details]  [Assign]   │
└──────────────────────────────────────────────────────────────────┘
```

### Detail View (`/leads/[id]`)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Leads                                                        │
│                                                                  │
│  🔥 HOT  ·  Score: 85/100                                       │
│  Amara Okafor                                                   │
│  Founder, EduTech Nigeria  ·  amara@edutech.ng  ·  +234 801... │
└────────────────────────────────────────────────────────────────┘

┌─ Lead Score Explained ──────────────────────────────────────────┐
│  Why this lead is scored HOT (85/100):                          │
│  • Registered for Innovation Bootcamp Q4 (+30)                  │
│  • Opened 3 emails in last 7 days (+25)                         │
│  • Visited website 4 times (+20)                                │
│  • Downloaded program guide (+10)                               │
│  • Recent engagement (last activity 1 day ago)                  │
│                                                                  │
│  Recommended next action: Personal follow-up email              │
└──────────────────────────────────────────────────────────────────┘

┌─ Engagement History ────────────────────────────────────────────┐
│  Sept 16   Visited pricing page                    Web         │
│  Sept 15   Registered for Bootcamp Q4              Form        │
│  Sept 15   Clicked email: "Bootcamp opening soon"  Email       │
│  Sept 14   Opened email: "September newsletter"    Email       │
│  Sept 10   Clicked LinkedIn post → Landing page    Social      │
└──────────────────────────────────────────────────────────────────┘

┌─ Source Attribution ────────────────────────────────────────────┐
│  First touch:   LinkedIn post (Wire 01, Sept 10)                │
│  Last touch:    Email link (Bootcamp announcement, Sept 15)     │
│  Conversion:    Bootcamp registration                           │
└──────────────────────────────────────────────────────────────────┘

┌─ Internal Notes ────────────────────────────────────────────────┐
│  Sept 16, 2pm — Sarah K.                                        │
│  Sent personalized email about AI track. Will follow up Mon.   │
│                                                                  │
│  Sept 15, 10am — System                                         │
│  Lead score increased from WARM to HOT due to registration.     │
│                                                                  │
│  [Add Note]                                                     │
└──────────────────────────────────────────────────────────────────┘

┌─ Quick Actions ─────────────────────────────────────────────────┐
│  [Send Email]  [Mark Qualified]  [Assign to...]  [Add to List] │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- **Explainable scoring**: Never just "85/100" — always "why"
- **Attribution clarity**: First touch and last touch shown
- **Action-oriented**: "Needs follow-up" not "Status: Hot"
- **Timeline over properties**: Engagement history > static fields

---

## 7. Campaign Builder (`/campaigns`, `/campaigns/new`, `/campaigns/[id]`)

**Purpose:** Group content, leads, and performance around one initiative.

### List View

```
┌────────────────────────────────────────────────────────────────┐
│  Campaigns                                  + New Campaign      │
│  Your marketing initiatives                                     │
└────────────────────────────────────────────────────────────────┘

┌─ Campaign ──────────────────────────────────────────────────────┐
│  ACTIVE                                     Sept 1 – Sept 30    │
│  Innovation Bootcamp Q4 Launch                                  │
│  Goal: 50 registrations  ·  Current: 42  ·  84% to goal        │
│                                                                  │
│  24 content pieces  ·  127 leads  ·  $420 spent  ·  $10/lead  │
│                                              [View Campaign]    │
└──────────────────────────────────────────────────────────────────┘

┌─ Campaign ──────────────────────────────────────────────────────┐
│  ACTIVE                                     Sept 15 – Oct 15    │
│  Partnership Announcement: Tech Hub Lagos                       │
│  Goal: Awareness  ·  8,430 impressions so far                  │
│                                                                  │
│  6 content pieces  ·  18 leads  ·  $0 spent (organic)          │
│                                              [View Campaign]    │
└──────────────────────────────────────────────────────────────────┘
```

### Campaign Detail View

```
┌────────────────────────────────────────────────────────────────┐
│  ← Campaigns                                                    │
│                                                                  │
│  ACTIVE  ·  Sept 1 – Sept 30                                   │
│  Innovation Bootcamp Q4 Launch                                  │
│  Drive 50 registrations for the next cohort                     │
└────────────────────────────────────────────────────────────────┘

┌─ Performance ───────────────────────────────────────────────────┐
│  Goal: 50 registrations                                          │
│  ████████████████████░░  42 / 50  (84%)                        │
│                                                                  │
│  Cost per registration: $10    Budget: $420 / $500 spent        │
│  Conversion rate: 8.2%         Timeline: 14 days remaining      │
└──────────────────────────────────────────────────────────────────┘

┌─ Content in This Campaign ──────────────────────────────────────┐
│  24 pieces published                       + Add Content         │
│                                                                  │
│  Blog Posts (3)         12,400 views      Top: Bootcamp recap   │
│  Social Posts (18)      42,300 impress.   Top: LinkedIn Sept 10│
│  Emails (3)             2,840 opens       Top: Launch announce  │
└──────────────────────────────────────────────────────────────────┘

┌─ Leads Generated ───────────────────────────────────────────────┐
│  127 leads total                           [View All Leads]     │
│                                                                  │
│  🔥 18 HOT     🟡 42 WARM     ⚪ 38 COLD     ✓ 29 QUALIFIED    │
│                                                                  │
│  Top source: LinkedIn (48 leads)                                │
│  Best performing content: LinkedIn post Sept 10 (22 leads)      │
└──────────────────────────────────────────────────────────────────┘

┌─ Landing Page ──────────────────────────────────────────────────┐
│  ril.org/bootcamp-q4                       [Edit Page]          │
│  3,240 visits  ·  8.2% conversion  ·  42 registrations          │
└──────────────────────────────────────────────────────────────────┘

┌─ Advertising ───────────────────────────────────────────────────┐
│  Meta Ads         $280 spent    1,240 clicks    $0.23/click    │
│  LinkedIn Ads     $140 spent      420 clicks    $0.33/click    │
│  Google Ads       $0 (not running)                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Audience Intelligence (`/audience/segments`, `/audience/insights`)

**Purpose:** Understand who engages and what they care about.

### Segments View

```
┌────────────────────────────────────────────────────────────────┐
│  Audience Segments                          + Create Segment    │
│  Who you're marketing to                                        │
└────────────────────────────────────────────────────────────────┘

┌─ Segment ───────────────────────────────────────────────────────┐
│  Early-Stage Founders                       842 leads           │
│  Pre-seed and seed stage tech entrepreneurs                     │
│                                                                  │
│  Top interests: AI, Fintech, Fundraising                        │
│  Engagement: High (avg 3.2 email opens/month)                  │
│  Conversion rate: 12%                                           │
│                                                                  │
│  [View Details]  [Create Content for This Segment]             │
└──────────────────────────────────────────────────────────────────┘

┌─ Segment ───────────────────────────────────────────────────────┐
│  Corporate Innovation Teams                 124 leads           │
│  Innovation managers and intrapreneurs                          │
│                                                                  │
│  Top interests: Digital transformation, Partnerships            │
│  Engagement: Medium (avg 1.8 email opens/month)                │
│  Conversion rate: 6%                                            │
│                                                                  │
│  [View Details]  [Create Content for This Segment]             │
└──────────────────────────────────────────────────────────────────┘
```

### Insights View (Approval Pipeline)

```
┌────────────────────────────────────────────────────────────────┐
│  Audience Insights                          3 PENDING REVIEW    │
│  What we're learning about your audience                        │
└────────────────────────────────────────────────────────────────┘

┌─ Insight ───────────────────────────────────────────────────────┐
│  Wire 01  ·  PENDING REVIEW                      Generated today│
│  Early-Stage Founders segment engages 3x more with video        │
│                                                                  │
│  Evidence:                                                      │
│  • Video posts: 840 avg engagement vs 280 for images           │
│  • 12 video posts analyzed across Sept 2026                    │
│  • Pattern consistent across LinkedIn and Instagram            │
│                                                                  │
│  If approved, this insight will recommend video content for     │
│  this segment in future repurposing sessions.                   │
│                                                                  │
│  [Approve]  [Suppress]  [View Full Analysis]                   │
└──────────────────────────────────────────────────────────────────┘

┌─ Insight ───────────────────────────────────────────────────────┐
│  Wire 02  ·  APPROVED                        Approved Sept 14   │
│  "AI" keyword drives 2.4x more registrations than "tech"        │
│                                                                  │
│  Evidence: 42 registrations from AI-focused content vs 18 from │
│  general tech content (same reach)                              │
│                                                                  │
│  ✓ Now influencing content recommendations                      │
│                                                                  │
│  [View Impact]  [Revoke Approval]                               │
└──────────────────────────────────────────────────────────────────┘

┌─ Insight ───────────────────────────────────────────────────────┐
│  Wire 03  ·  SUPPRESSED                      Suppressed Sept 12 │
│  Weekend posts generate higher engagement                       │
│                                                                  │
│  Reason for suppression: Sample size too small (4 posts)        │
│  Added by: Sarah K.                                             │
│                                                                  │
│  [Restore]  [Delete Permanently]                                │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- **Pending → Approved gate**: Nothing auto-applies
- **Evidence shown**: Always "why we think this"
- **Impact explained**: "If approved, this will..."
- **Suppression with reason**: Not just "hide," but "why hidden"

---

## 9. Analytics Dashboard (`/analytics`)

**Purpose:** What's working, what's not, backed by data.

```
┌────────────────────────────────────────────────────────────────┐
│  Analytics                                  September 2026      │
│  Your marketing performance                 [Export Report]     │
└────────────────────────────────────────────────────────────────┘

┌─ Key Metrics ───────────────────────────────────────────────────┐
│  vs August 2026                                                 │
│                                                                  │
│  Leads Generated     Website Visitors     Email Subscribers    │
│  127  ↑ 23%         8,430  ↑ 18%         1,240  ↑ 12%         │
│                                                                  │
│  Content Published   Social Growth        Conversion Rate      │
│  24 pieces           +340  ↑ 8%          9.2%  ↓ 1.8%         │
└──────────────────────────────────────────────────────────────────┘

┌─ Lead Generation Breakdown ─────────────────────────────────────┐
│  127 leads in September                                         │
│                                                                  │
│  By Source:                    By Status:                       │
│  LinkedIn         48 (38%)     🔥 18 HOT      (14%)            │
│  Instagram        22 (17%)     🟡 42 WARM     (33%)            │
│  Email            19 (15%)     ⚪ 38 COLD     (30%)            │
│  Website (direct) 18 (14%)     ✓ 29 QUALIFIED (23%)           │
│  X / Twitter      12 (9%)                                       │
│  Other             8 (6%)                                       │
│                                                                  │
│  Top performing content:                                        │
│  1. LinkedIn post: "Innovation Bootcamp opens" — 22 leads      │
│  2. Email: "September newsletter" — 19 leads                   │
│  3. Blog: "Key insights from Q3" — 14 leads                    │
└──────────────────────────────────────────────────────────────────┘

┌─ Content Performance ───────────────────────────────────────────┐
│  24 pieces published in September                               │
│                                                                  │
│  By Type:              By Platform:         Engagement:         │
│  Social posts  18      LinkedIn     8       Avg 840/post       │
│  Blog posts     3      Instagram    6       Total 42.3k        │
│  Emails         3      X           4                           │
│                        Email        3                           │
│                        Website      3                           │
│                                                                  │
│  Best performing:                                               │
│  • Video content: 3.2x avg engagement                          │
│  • Posts with "AI" keyword: 2.4x conversions                   │
│  • LinkedIn thought leadership: highest quality leads          │
└──────────────────────────────────────────────────────────────────┘

┌─ Channel Performance ───────────────────────────────────────────┐
│  Platform      Posts   Reach     Engagement   Leads   CPL      │
│  LinkedIn        8     12.4k       3.2k        48    $0 (org)  │
│  Instagram       6      8.2k       2.1k        22    $140      │
│  Email           3      2.8k        840        19    $0        │
│  X / Twitter     4      4.8k        680        12    $0        │
│  Website         3      3.2k        420        18    $0        │
└──────────────────────────────────────────────────────────────────┘

┌─ Campaign ROI ──────────────────────────────────────────────────┐
│  Innovation Bootcamp Q4                                         │
│  $420 spent  →  42 registrations  →  $10 per registration      │
│  vs target: $12/registration  ·  17% better than goal          │
│                                                                  │
│  Partnership Lagos Announcement                                 │
│  $0 spent (organic)  →  8,430 impressions  →  18 leads         │
└──────────────────────────────────────────────────────────────────┘

┌─ AI-Generated Report ───────────────────────────────────────────┐
│  What happened in September:                                    │
│                                                                  │
│  LinkedIn drove 38% of all leads this month, up from 28% in    │
│  August. Video posts generated 3.2x the engagement of static   │
│  images. Content mentioning "AI" converted 2.4x better than    │
│  general tech content.                                          │
│                                                                  │
│  Recommended next actions:                                      │
│  • Increase video content production for LinkedIn              │
│  • A/B test AI-focused headlines in email campaigns            │
│  • Consider allocating more budget to Instagram ads (current   │
│    $140/month generating $6.36/lead, better than target)       │
│                                                                  │
│  ⚠️ Note: Conversion rate dropped 1.8%. Investigate landing    │
│  page performance and form friction.                            │
│                                                                  │
│  [View Full Report]  [Export PDF]                               │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- **Context first**: "127 ↑ 23%" not "127"
- **Actionable insights**: "Increase video" not "video is performing well"
- **AI section clearly labeled**: Report is AI-generated, recommendations flagged
- **Drill-down available**: Every summary links to detail view

---

## 10. Settings (`/settings`)

### AI Settings (`/settings/ai`)

```
┌────────────────────────────────────────────────────────────────┐
│  Settings  →  AI                                                │
│  Configure AI content generation                                │
└────────────────────────────────────────────────────────────────┘

┌─ AI Provider ───────────────────────────────────────────────────┐
│  Which AI service should generate content?                      │
│                                                                  │
│  ○  OpenAI        Most versatile, supports GPT-4o and GPT-5    │
│  ●  Claude        Best for long-form content (selected)        │
│  ○  Gemini        Google's latest models                       │
│  ○  None          Use template-based generation only           │
│                                                                  │
│  API Key                                                        │
│  sk-ant-api03-********************************  [Test Key]     │
│  ✓ Connected successfully  ·  Last tested: Sept 16, 2:30 PM    │
│                                                                  │
│  Model                                                          │
│  [claude-opus-5 ▾]   Sonnet 5 · Opus 5 · Haiku 4.5            │
│                                                                  │
│  [Save Changes]                                                 │
└──────────────────────────────────────────────────────────────────┘

┌─ Content Generation Settings ───────────────────────────────────┐
│  Default Tone                                                   │
│  [Professional ▾]   Professional · Casual · Inspirational       │
│                                                                  │
│  Brand Voice                                                    │
│  RIL is direct, operational, and grounded. We speak to         │
│  entrepreneurs as peers, not as a distant institution...        │
│  [Edit Brand Voice]                                             │
│                                                                  │
│  Auto-Generate Insights                                         │
│  ☑ Automatically detect audience patterns                      │
│  ☐ Auto-approve low-risk insights (not recommended)            │
│                                                                  │
│  [Save Changes]                                                 │
└──────────────────────────────────────────────────────────────────┘

┌─ Integration Status ────────────────────────────────────────────┐
│  Service          Status        Last Sync                       │
│  Claude API       ✓ Connected   Sept 16, 2:30 PM              │
│  Buffer           ✓ Connected   Sept 15, 10:00 AM             │
│  Email (Brevo)    ⚠ Expires     Sept 18 (reconnect needed)    │
│  Meta Ads         ✓ Connected   Sept 10                        │
│  Google Analytics ✓ Connected   Sept 1                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Design System Tokens

### Colors (Extended from DESIGN.md)

```css
/* Core palette */
--ink: hsl(222 22% 12%);
--paper: hsl(0 0% 100%);
--ground: hsl(240 6% 97%);
--flag: hsl(221 83% 53%);
--paper-dim: hsl(220 14% 95%);
--rule: hsl(220 13% 87%);
--ink-soft: hsl(222 12% 36%);

/* Status colors (used with stamps, never alone) */
--status-pending: hsl(221 83% 53%);     /* flag blue */
--status-approved: hsl(142 76% 36%);    /* deep green */
--status-hot: hsl(4 90% 58%);           /* warm red */
--status-warm: hsl(38 92% 50%);         /* amber */
--status-cold: hsl(220 13% 87%);        /* rule gray */
--status-failed: hsl(0 84% 60%);        /* error red */

/* Chart colors (from dataviz skill) */
--chart-01: hsl(221 83% 53%);
--chart-02: hsl(142 76% 36%);
--chart-03: hsl(38 92% 50%);
--chart-04: hsl(4 90% 58%);
--chart-05: hsl(280 60% 50%);
```

### Typography Scale

```css
/* Fluid scale using clamp() */
--text-xs: clamp(0.6875rem, 0.65rem + 0.2vw, 0.75rem);     /* 11–12px */
--text-sm: clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem);  /* 14–15px */
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);      /* 16–18px */
--text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.5rem);        /* 18–24px */
--text-xl: clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem);       /* 24–36px */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Letter spacing */
--tracking-tight: -0.025em;  /* headlines */
--tracking-normal: 0;
--tracking-wide: 0.06em;     /* mono labels */
```

### Spacing Scale

```css
--space-xs: 0.5rem;    /* 8px */
--space-sm: 0.75rem;   /* 12px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 2.5rem;   /* 40px — section separation */
--space-3xl: 3rem;     /* 48px */
```

### Radius Scale

```css
--radius-sm: 6px;   /* stamps */
--radius-md: 8px;   /* buttons */
--radius-lg: 10px;  /* cards */
--radius-xl: 14px;  /* large cards */
--radius-full: 999px; /* pills (rare) */
```

### Shadows

```css
/* Quiet two-layer shadow */
--shadow-card: 
  0 1px 2px hsla(222 22% 12% / 0.04),
  0 2px 8px hsla(222 22% 12% / 0.06);

--shadow-hover:
  0 2px 4px hsla(222 22% 12% / 0.06),
  0 4px 12px hsla(222 22% 12% / 0.08);
```

---

## Component Library

### Status Stamps

```tsx
// Squared stamp component
<StatusStamp status="pending" />
<StatusStamp status="approved" />
<StatusStamp status="hot" />

/* Renders as: */
┌──────────────┐
│ PENDING      │  ← 11px mono uppercase, 1px flag border
└──────────────┘
```

### Decision Card (Signature Pattern)

```tsx
<DecisionCard
  wireNumber="01"
  title="Innovation Bootcamp insights"
  description="Blog post from keynote video"
  status="pending_review"
  primaryAction="Review"
  secondaryAction="Edit"
/>

/* Renders as: */
┌───────────────────────────────────────────────────────────┐
│  Wire 01  ·  PENDING REVIEW                               │
│  Innovation Bootcamp insights                             │
│  Blog post from keynote video · 1,240 words              │
│                                                           │
│                                    [Edit]  [Review]       │
└───────────────────────────────────────────────────────────┘
```

### Ledger Row

```tsx
<LedgerRow
  label="Leads Generated"
  value={127}
  change={23}
  changeType="increase"
/>

/* Renders as: */
Leads Generated          127  ↑ 23%
```

### Progress Bar with Context

```tsx
<ProgressBar
  current={42}
  target={50}
  label="registrations"
/>

/* Renders as: */
Goal: 50 registrations
████████████████████░░  42 / 50  (84%)
```

---

## Responsive Behavior

### Breakpoints

```css
--breakpoint-sm: 640px;   /* phone landscape */
--breakpoint-md: 768px;   /* tablet */
--breakpoint-lg: 1024px;  /* laptop */
--breakpoint-xl: 1280px;  /* desktop */
```

### Layout Shifts

**Desktop (≥1024px):**
- Left rail navigation (240px fixed)
- Two-column content where useful (detail + sidebar)
- Cards in grid (2–3 columns)

**Tablet (768–1023px):**
- Collapsible rail (hamburger menu)
- Single column content
- Cards in grid (2 columns)

**Mobile (<768px):**
- Bottom tab bar (Home, Content, Leads, More)
- Single column everything
- Horizontal scroll for calendar week view
- Cards stack vertically

---

## Motion & Interaction

### One Authored Moment: Rise-and-Fade

```css
@keyframes rise-fade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Applied to new decision cards entering the queue */
.decision-card-enter {
  animation: rise-fade 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Stagger: each card delayed by 60ms */
.decision-card-enter:nth-child(1) { animation-delay: 0ms; }
.decision-card-enter:nth-child(2) { animation-delay: 60ms; }
.decision-card-enter:nth-child(3) { animation-delay: 120ms; }
```

### Button Interactions

```css
/* Press: scale down slightly */
button:active {
  transform: scale(0.96);
  transition: transform 80ms ease-out;
}

/* Hover: deepen background */
button:hover {
  background: hsl(222 22% 8%); /* 4% darker than ink */
  transition: background 150ms ease;
}

/* Focus: 2px ink ring with offset */
button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
```

### No Other Motion

Everything else is **instant**: state changes, status updates, filters, tabs. No loading spinners except for AI generation (which takes real time). No skeleton screens except for initial page load with actual data pending.

---

## Empty States

### Pattern: Helpful, Not Cute

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                  No activities yet                        │
│                                                           │
│  Log your first RIL event, workshop, or partnership to   │
│  start turning activities into marketing content.         │
│                                                           │
│                  [Log First Activity]                     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Rules:**
- One sentence explaining what this view shows
- One sentence explaining what action creates the first item
- Primary action button (not just text)
- No illustrations, no emoji, no "Oops!" or "Uh oh"

---

## Error States

### Pattern: Clear Recovery Path

```
┌───────────────────────────────────────────────────────────┐
│  ⚠️  Failed to publish to Instagram                      │
│                                                           │
│  Your Instagram connection expired. Reconnect your       │
│  account to resume publishing.                            │
│                                                           │
│  [Reconnect Instagram]  [Skip This Post]                 │
└───────────────────────────────────────────────────────────┘
```

**Rules:**
- State what failed (never generic "error")
- Explain why it failed
- Provide 1–2 recovery actions
- Never blame the user

---

## Loading States

### Skeleton Loaders (Rare)

Only for initial page load when data is genuinely pending:

```
┌─ Content ──────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░                              ░░░░░░░░░       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│  ░░░░░░░░░░░░░  ·  ░░░░░░░░░░░░░░░  ·  ░░░░░░░          │
└────────────────────────────────────────────────────────────┘
```

### Spinners (For AI Generation)

Only when AI is actually processing:

```
┌───────────────────────────────────────────────────────────┐
│  ⟳  Generating content...                                 │
│     This may take 2–3 minutes                             │
└───────────────────────────────────────────────────────────┘
```

---

## Approval Workflow Visual Language

### Status Pipeline

Every content asset moves through one path:

```
Idea → AI Generated → Editing → Review → Approved → Scheduled → Published → Analysing
       ╰───────────────── Human gate ─────────────╯
```

### Visual Indicators

**Status Stamps (always uppercase mono):**
- `IDEA` — Paper-dim background, ink text
- `AI GENERATED` — Flag border, flag text (needs attention)
- `EDITING` — Ink border, ink text
- `REVIEW` — Flag border, flag text (needs approval)
- `APPROVED` — Green border, green text
- `SCHEDULED` — Ink border, ink text + date/time
- `PUBLISHED` — Green border, green text + link
- `FAILED` — Red border, red text + retry action

**Color never carries meaning alone** — the word is always present.

---

## Accessibility Standards

### WCAG AA Compliance

- **Contrast ratios:**
  - Ink on Paper: 14.2:1 (AAA)
  - Ink-Soft on Paper: 4.8:1 (AA)
  - Flag on Paper: 4.5:1 (AA)
  - All status colors tested for sufficient contrast

- **Focus indicators:**
  - 2px outline with 2px offset
  - Never rely on color alone
  - Visible on all interactive elements

- **Motion:**
  - Respects `prefers-reduced-motion`
  - No essential info conveyed through animation

- **Screen readers:**
  - Semantic HTML (`<main>`, `<nav>`, `<article>`)
  - ARIA labels on icon-only buttons
  - Status stamps include `aria-label` with context
  - Skip links for keyboard navigation

---

## Mobile-Specific Patterns

### Bottom Tab Navigation

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [Content of current view]                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
┌─ Navigation ────────────────────────────────────────────────┐
│   🏠        📄        👥        📊        ⋯               │
│  Home    Content   Leads   Analytics   More               │
│   ●                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Swipe Gestures

- Swipe left on lead card → Quick actions (Assign, Qualify, Email)
- Swipe right on content card → Move to archive
- Pull to refresh on list views

### Touch Targets

- Minimum 44×44px for all interactive elements
- Increased padding on mobile cards
- Larger tap areas around small text links

---

## Print Styles

For analytics reports and campaign summaries:

```css
@media print {
  /* Hide navigation, buttons, interactive elements */
  nav, button, .no-print { display: none; }
  
  /* Expand cards to full width */
  .card { box-shadow: none; border: 1px solid var(--rule); }
  
  /* Force light background */
  body { background: white; color: black; }
  
  /* Page breaks */
  .campaign-section { break-inside: avoid; }
}
```

---

## Do's and Don'ts

### Do:

✓ **Stamp every status** as an uppercase word (PENDING, APPROVED) before using color  
✓ **Show numbers with context**: "127 ↑ 23%" not "127"  
✓ **Explain AI reasoning**: "Why this lead is scored HOT (85/100)"  
✓ **Use quiet cards** on soft ground, not a stat-card wall  
✓ **Give clear next actions**: "Review" not "View details"  
✓ **Trace every asset** back to its source (Wire 01, Activity, Campaign)  
✓ **Put attention items first**: awaiting approval above recent activity  
✓ **Use mono for data**: dates, counts, codes, wire numbers  
✓ **Provide empty state guidance**: what to do, not "nothing here yet"  
✓ **Group by workflow**, not by data type (Activities > Content > Leads > Analytics)  

### Don't:

✗ **Don't** use kickers above headings  
✗ **Don't** rely on color alone for status  
✗ **Don't** use emoji or glyph icons  
✗ **Don't** show raw AI outputs without "AI GENERATED" stamp  
✗ **Don't** hide the approval gate in settings  
✗ **Don't** use gradient text or glass morphism  
✗ **Don't** animate everything (one authored moment only)  
✗ **Don't** show spinners for instant operations  
✗ **Don't** use technical jargon ("entity," "instance," "pipeline")  
✗ **Don't** make users guess what "Wire 01" refers to (always show activity name)  

---

## Implementation Notes

### Tech Stack Alignment

This design spec aligns with the existing stack:

- **Next.js 16**: App Router, Server Components, Suspense boundaries
- **Tailwind CSS**: Design tokens mapped to Tailwind config
- **shadcn/ui**: Component primitives (Button, Card, Input) match design system
- **Recharts**: Charts follow dataviz skill palette
- **Lucide Icons**: Minimal icon usage (search, arrows, platform logos only)

### Design Token Generation

```bash
# Generate CSS custom properties from DESIGN.md
npm run generate-tokens

# Output: src/styles/tokens.css
```

### Component Storybook

```bash
# Run component library in isolation
npm run storybook

# Components documented:
# - StatusStamp
# - DecisionCard
# - LedgerRow
# - ProgressBar
# - EmptyState
# - ErrorState
```

---

## Phase 1 Screens (MVP)

To ship the minimum viable product, build these screens first:

1. **Marketing Command Centre** (`/dashboard`) — Your daily operating view
2. **Activity Hub** (`/activities`, `/activities/new`, `/activities/[id]`)
3. **Content Repurposing Flow** (`/activities/[id]/repurpose`)
4. **Content Library** (`/library`)
5. **Content Calendar** (`/calendar`)
6. **Basic Lead List** (`/leads`)
7. **Settings → AI** (`/settings/ai`)

Everything else (Campaigns, Audience, Analytics, Trends) can follow in Phase 2.

---

## Design QA Checklist

Before shipping any screen:

- [ ] All statuses are stamped words, not color-only
- [ ] Focus states visible on all interactive elements
- [ ] Empty state provides clear next action
- [ ] Error messages explain recovery path
- [ ] Loading states only where genuinely needed
- [ ] Mobile touch targets ≥ 44×44px
- [ ] Contrast ratios meet WCAG AA
- [ ] No motion for users with `prefers-reduced-motion`
- [ ] Screen reader can navigate entire flow
- [ ] "AI GENERATED" stamp on all AI outputs
- [ ] Source attribution visible (Wire number, Activity, Campaign)

---

**End of UI Redesign Specification**

This document defines the complete visual design for the RIL AI Marketing Operating System. Every module from the PRD is represented here with its layout, interactions, and visual language.

The design extends the proven "Studio" aesthetic across the full platform while keeping the interface approachable for marketing teams, not engineers. Every screen answers "what needs my attention" before "what data exists."

Next steps: Prototype key flows in Figma, validate with the marketing team, then build Phase 1 screens.
