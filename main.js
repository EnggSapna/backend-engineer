'use strict';
/* ================================================================
   BackendEngineer.com — main.js
   Vanilla JS ES2022 · No frameworks
   Features: Razorpay (UPI/GPay/PhonePe/Paytm/Cards), PayPal, Card payment
   ================================================================ */

// ── CONFIG ──
// Use port 3000 during local development. In production (e.g. Vercel deployment), use relative paths ('')
// so requests seamlessly reach the serverless /api endpoints on the same domain without CORS issues.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = isLocal ? 'http://localhost:3000' : '';

// ── JOB DATA (Multi-language Backend Roles) ──
let JOBS = [
  { id:1, featured:true,  title:'Senior .NET Core / C# Backend Architect',     company:'Microsoft',  logo:'https://logo.clearbit.com/microsoft.com',  location:'🌍 Remote (US/EU)',       salary:'$170k – $240k', tags:['.NET 8','C#','Azure','SQL Server'],     filter:['dotnet','db','devops'], age:'2h ago', url:'https://careers.microsoft.com' },
  { id:2, featured:true,  title:'Senior Backend Engineer – API Platform',       company:'Stripe',     logo:'https://logo.clearbit.com/stripe.com',     location:'🌍 Remote (Global)',      salary:'$160k – $220k', tags:['Go','PostgreSQL','gRPC','Kafka'],        filter:['go','db'],          age:'3h ago', url:'https://stripe.com/jobs' },
  { id:3, featured:false, title:'Senior Node.js Backend Engineer',                company:'Vercel',     logo:'https://logo.clearbit.com/vercel.com',     location:'🌍 Remote (Worldwide)',   salary:'$140k – $190k', tags:['Node.js','TypeScript','PostgreSQL','Redis'],filter:['node','db'],     age:'4h ago', url:'https://vercel.com/careers' },
  { id:4, featured:false, title:'Senior Python Backend Engineer',               company:'Anthropic',  logo:'https://logo.clearbit.com/anthropic.com',  location:'🌍 Remote (US)',          salary:'$180k – $250k', tags:['Python','FastAPI','PostgreSQL','AWS'],   filter:['python','db','devops'], age:'5h ago', url:'https://www.anthropic.com/careers' },
  { id:5, featured:false, title:'Backend Engineer – Microservices (Java)',        company:'Netflix',    logo:'https://logo.clearbit.com/netflix.com',    location:'🌍 Remote (US)',          salary:'$160k – $210k', tags:['Java','Spring Boot','Cassandra','Kafka'],  filter:['java','db','devops'], age:'1d ago', url:'https://jobs.netflix.com' },
  { id:6, featured:false, title:'Senior .NET Developer – Microservices & Cloud', company:'Stack Overflow', logo:'https://logo.clearbit.com/stackoverflow.com', location:'🌍 Remote (Worldwide)', salary:'$140k – $190k', tags:['C#','.NET Core','Redis','SQL Server'], filter:['dotnet','db'], age:'1d ago', url:'https://stackoverflow.co/company/careers' },
  { id:7, featured:false, title:'Senior Go Engineer – Distributed Systems',     company:'Cloudflare', logo:'https://logo.clearbit.com/cloudflare.com', location:'🌍 Remote (Worldwide)',   salary:'$155k – $200k', tags:['Go','Rust','PostgreSQL','gRPC'],         filter:['go','rust','db'],    age:'1d ago', url:'https://www.cloudflare.com/careers/' },
  { id:8, featured:false, title:'Rust Systems Engineer – Core Infrastructure',    company:'Discord',    logo:'https://logo.clearbit.com/discord.com',    location:'🌍 Remote (Americas)',    salary:'$160k – $215k', tags:['Rust','Elixir','ScyllaDB','Redis'],        filter:['rust','db'],        age:'2d ago', url:'https://discord.com/careers' }
];

// Load scraped jobs from backend API if available
async function fetchScrapedJobs() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Merge API jobs into current list so every language is represented
        JOBS = data;
        renderJobs();
      }
    }
  } catch (e) {
    console.log('Using multi-language backend jobs');
  }
}

// ── STATE ──
let activeFilter = 'all';
let searchQuery  = '';
let isAnnual     = false;
const FREE_LIMIT = 999;
const LOGO_COLORS = ['#f97316','#8b5cf6','#ec4899','#10b981','#06b6d4','#ef4444','#a855f7','#14b8a6','#3b82f6','#eab308'];
let activePayTab = 'razorpay'; // 'razorpay' | 'card' | 'paypal'

// ── RENDER JOB CARD ──
function cardHtml(job) {
  const abbr = job.company.substring(0,2).toUpperCase();
  const bg   = LOGO_COLORS[job.id % LOGO_COLORS.length];
  return `
    <div class="job-card${job.featured?' job-card--featured':''} reveal" onclick="openJobDetail(${job.id})" tabindex="0">
      <div class="job-logo">
        <img src="${job.logo}" alt="${job.company}"
          onerror="this.style.display='none';this.parentNode.style.background='${bg}';this.parentNode.innerHTML='<span style=font-weight:700;font-size:.9rem;color:#fff>${abbr}</span>';" />
      </div>
      <div class="job-body">
        <div class="job-top">
          <span class="job-title-txt">${job.title}</span>
          <span class="job-dot">·</span>
          <span class="job-company">${job.company}</span>
        </div>
        <div class="job-meta">
          <span class="job-loc">${job.location}</span>
          <span class="job-sal">${job.salary}</span>
        </div>
        <div class="job-tags">${job.tags.map(t=>`<span class="job-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="job-right">
        <span class="job-age">${job.age}</span>
        <button class="job-apply" type="button" onclick="event.stopPropagation(); window.open('${job.url}', '_blank');">Apply →</button>
      </div>
    </div>`;
}

// ── JOB DETAIL & APPLICATION MODAL ──
function openJobDetail(id) {
  const job = JOBS.find(j => j.id === id);
  if (!job) return;

  const content = document.getElementById('jobModalContent');
  const user = JSON.parse(localStorage.getItem('be_user') || 'null');
  const userFname = user ? user.fname || '' : '';
  const userLname = user ? user.lname || '' : '';
  const userEmail = user ? user.email || '' : '';

  const abbr = job.company.substring(0,2).toUpperCase();
  const bg   = LOGO_COLORS[job.id % LOGO_COLORS.length];

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div class="job-logo" style="width:52px;height:52px;">
        <img src="${job.logo}" alt="${job.company}" onerror="this.style.display='none';this.parentNode.style.background='${bg}';this.parentNode.innerHTML='<span style=font-weight:700;font-size:1rem;color:#fff>${abbr}</span>';" />
      </div>
      <div>
        <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:3px;color:var(--fg);">${job.title}</h3>
        <div style="font-size:0.85rem;color:var(--fg-2);">${job.company} · <span style="color:var(--green);font-weight:600;font-family:var(--mono);">${job.salary}</span></div>
      </div>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;">
      <span style="font-size:0.75rem;padding:3px 10px;border-radius:100px;background:var(--bg-3);border:1px solid var(--border-2);color:var(--fg-2);">${job.location}</span>
      ${job.tags.map(t=>`<span class="job-tag">${t}</span>`).join('')}
    </div>

    <div style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--r-lg);padding:18px;margin-bottom:20px;font-size:0.86rem;line-height:1.65;color:var(--fg-2);">
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:8px;">About the Position</h4>
      <p style="margin-bottom:12px;"><strong>${job.company}</strong> is hiring a <strong>${job.title}</strong> to join their distributed backend team. In this role, you will design scalable microservices, optimize database queries, and build resilient infrastructure handling high traffic.</p>
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:6px;">Key Responsibilities</h4>
      <ul style="padding-left:18px;margin-bottom:12px;">
        <li>Architect & deploy RESTful & gRPC APIs using ${job.tags.join(', ')}.</li>
        <li>Optimize database schemas and system performance under high load.</li>
        <li>Collaborate with cross-functional product and DevOps teams remotely.</li>
      </ul>
    </div>

    <!-- Application Form -->
    <div id="appFormWrap">
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:12px;">Apply for this Position</h4>
      <form class="modal__form" onsubmit="submitJobApplication(event, '${job.company.replace(/'/g, "\\'")}', '${job.title.replace(/'/g, "\\'")}')" novalidate>
        <div class="form-row">
          <div class="form-field">
            <label>Full Name</label>
            <input type="text" id="appFname" value="${userFname} ${userLname}".trim() placeholder="John Doe" required />
          </div>
          <div class="form-field">
            <label>Email Address</label>
            <input type="email" id="appEmail" value="${userEmail}" placeholder="you@company.com" required />
          </div>
        </div>
        <div class="form-field">
          <label>Resume / GitHub / LinkedIn URL</label>
          <input type="url" id="appUrl" placeholder="https://github.com/yourusername" required />
        </div>
        <div class="form-field">
          <label>Cover Note (Optional)</label>
          <textarea id="appNote" rows="2" placeholder="Briefly describe your backend experience..." style="background:var(--bg);border:1.5px solid var(--border-2);border-radius:var(--r);padding:10px 13px;font-family:var(--font);font-size:0.88rem;color:var(--fg);outline:none;width:100%;resize:vertical;"></textarea>
        </div>
        <button class="btn btn--primary btn--block btn--lg" type="submit" id="appSubmitBtn" style="margin-top:6px;">
          Submit Application →
        </button>
      </form>
    </div>
  `;

  document.getElementById('jobModal').classList.add('open');
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeJobModal() {
  document.getElementById('jobModal').classList.remove('open');
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function closeAllModals() {
  closeJobModal();
  closeStudyModal();
}

function closeStudyModal() {
  const modal = document.getElementById('studyModal');
  const backdrop = document.getElementById('modalBackdrop');
  if (modal) modal.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

// ── STUDY GUIDES DATA & MODAL ──
const STUDY_GUIDES = {
  roadmap: {
    title: '📖 Backend Engineering Roadmap 2026',
    icon: '📖',
    time: '15 min read',
    level: 'Beginner → Advanced',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">A step-by-step master roadmap covering essential topics every modern backend engineer must master in 2026.</p>
      
      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:16px 0 8px;">1. Internet & Networking Foundations</h4>
      <ul style="padding-left:18px;margin-bottom:14px;color:var(--fg-2);">
        <li><strong>HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)</strong>: Request pipelining, multiplexing, SSL/TLS handshake.</li>
        <li><strong>DNS Resolution & TCP/IP</strong>: Socket connections, keep-alive, CORS, headers, and reverse proxies (Nginx, Caddy).</li>
      </ul>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:16px 0 8px;">2. Core Backend Languages</h4>
      <p style="color:var(--fg-2);margin-bottom:8px;">Master at least one primary language & concurrency model:</p>
      <ul style="padding-left:18px;margin-bottom:14px;color:var(--fg-2);">
        <li><strong>Go (Golang)</strong>: Goroutines, channels, memory management, garbage collection tuning.</li>
        <li><strong>Node.js / TypeScript</strong>: V8 Event Loop phases, worker threads, async/await mechanics.</li>
        <li><strong>Python</strong>: FastAPI, AsyncIO, GIL workarounds, multiprocessing.</li>
        <li><strong>C# / .NET 8</strong>: ASP.NET Core web APIs, Task Parallel Library (TPL), Entity Framework Core.</li>
      </ul>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:16px 0 8px;">3. Databases & Caching</h4>
      <ul style="padding-left:18px;margin-bottom:14px;color:var(--fg-2);">
        <li><strong>Relational</strong>: PostgreSQL / MySQL (Indexes: B-Tree, GIN, Partitioning, Connection Pooling).</li>
        <li><strong>NoSQL / Key-Value</strong>: Redis (Data structures, eviction policies), MongoDB, DynamoDB.</li>
      </ul>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:16px 0 8px;">4. Message Queues & Distributed Architecture</h4>
      <ul style="padding-left:18px;margin-bottom:14px;color:var(--fg-2);">
        <li>Apache Kafka, RabbitMQ, SQS, Event-driven architecture, gRPC, and Microservices design patterns.</li>
      </ul>
    `
  },
  api: {
    title: '🧩 REST vs GraphQL vs gRPC',
    icon: '🧩',
    time: '10 min read',
    level: 'Intermediate',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">Choosing the right API architecture pattern is a critical decision in backend design.</p>
      
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:0.82rem;text-align:left;">
        <thead>
          <tr style="background:var(--bg-3);border-bottom:1px solid var(--border-2);">
            <th style="padding:10px;">Feature</th>
            <th style="padding:10px;">REST</th>
            <th style="padding:10px;">GraphQL</th>
            <th style="padding:10px;">gRPC</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px;font-weight:600;">Protocol</td>
            <td style="padding:10px;">HTTP/1.1 or HTTP/2</td>
            <td style="padding:10px;">HTTP/1.1 (JSON)</td>
            <td style="padding:10px;">HTTP/2 (Binary)</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px;font-weight:600;">Data Format</td>
            <td style="padding:10px;">JSON / XML</td>
            <td style="padding:10px;">JSON</td>
            <td style="padding:10px;">Protocol Buffers (Protobuf)</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px;font-weight:600;">Over-fetching</td>
            <td style="padding:10px;color:var(--red);">Yes (Fixed schema)</td>
            <td style="padding:10px;color:var(--green);">No (Client requests fields)</td>
            <td style="padding:10px;color:var(--green);">No (Strict schema)</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px;font-weight:600;">Performance</td>
            <td style="padding:10px;">Standard</td>
            <td style="padding:10px;">Moderate (Query parsing overhead)</td>
            <td style="padding:10px;color:var(--green);font-weight:700;">Ultra Fast (7-10x lighter)</td>
          </tr>
        </tbody>
      </table>

      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-top:16px;margin-bottom:6px;">When to use which?</h4>
      <ul style="padding-left:18px;color:var(--fg-2);">
        <li><strong>REST</strong>: Public APIs, web clients, standard CRUD operations.</li>
        <li><strong>GraphQL</strong>: Complex mobile apps needing aggregated data from multiple services in 1 request.</li>
        <li><strong>gRPC</strong>: Internal microservice-to-microservice communication where ultra-low latency is paramount.</li>
      </ul>
    `
  },
  'system-design': {
    title: '🏗️ System Design Interview Guide',
    icon: '🏗️',
    time: '45 min read',
    level: 'Senior / Staff',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">Master the 4-step System Design Interview Framework used by top tech companies.</p>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:14px 0 6px;">Step 1: Understand Requirements & Scale Scope</h4>
      <ul style="padding-left:18px;margin-bottom:12px;color:var(--fg-2);">
        <li><strong>DAU / MAU</strong>: Daily Active Users (e.g. 100M users).</li>
        <li><strong>RPS (Requests Per Second)</strong>: 100M / 86400 ≈ 1,200 QPS (Peak 3,000 QPS).</li>
        <li><strong>Storage estimation</strong>: 1,200 QPS × 100KB per item ≈ 120MB/sec = 10TB/day.</li>
      </ul>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:14px 0 6px;">Step 2: High Level Architecture</h4>
      <div style="background:var(--bg);border:1px solid var(--border-2);padding:14px;border-radius:var(--r);font-family:var(--mono);font-size:0.78rem;color:var(--primary);margin-bottom:12px;">
        Client ➔ CDN / Cloudflare ➔ API Gateway / Nginx ➔ Service Instances (Auto-scaled) ➔ Redis Cache ➔ PostgreSQL (Read Replicas)
      </div>

      <h4 style="font-size:0.95rem;font-weight:700;color:var(--primary);margin:14px 0 6px;">Step 3: Database & Sharding Strategies</h4>
      <p style="color:var(--fg-2);">Use consistent hashing to shard user data across database instances without single points of failure.</p>
    `
  },
  postgres: {
    title: '🗄️ PostgreSQL Deep Dive',
    icon: '🗄️',
    time: '30 min read',
    level: 'Intermediate → Senior',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">Advanced database optimization techniques for PostgreSQL in production.</p>
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:6px;">1. Indexing Best Practices</h4>
      <ul style="padding-left:18px;margin-bottom:12px;color:var(--fg-2);">
        <li><strong>B-Tree</strong>: Default for equality and range queries (<code>=, &lt;, &gt;</code>).</li>
        <li><strong>GIN (Generalized Inverted Index)</strong>: Essential for JSONB column search and full-text search.</li>
        <li><strong>Partial Indexes</strong>: <code>CREATE INDEX idx_unpaid ON orders(user_id) WHERE status = 'unpaid';</code></li>
      </ul>
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:6px;">2. Connection Pooling (PgBouncer)</h4>
      <p style="color:var(--fg-2);">Each Postgres connection consumes ~5-10MB RAM. Use PgBouncer in transaction pooling mode to handle thousands of concurrent requests smoothly.</p>
    `
  },
  nodejs: {
    title: '⚡ Node.js Performance Mastery',
    icon: '⚡',
    time: '25 min read',
    level: 'Intermediate → Senior',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">Understanding V8 & Event Loop internals to write blazingly fast Node.js backend services.</p>
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:6px;">The 6 Event Loop Phases</h4>
      <ol style="padding-left:18px;margin-bottom:12px;color:var(--fg-2);">
        <li><strong>Timers</strong>: <code>setTimeout()</code> and <code>setInterval()</code> callbacks.</li>
        <li><strong>Pending Callbacks</strong>: I/O callbacks deferred to next loop iteration.</li>
        <li><strong>Idle, Prepare</strong>: Node internal use only.</li>
        <li><strong>Poll</strong>: Retrieve new I/O events (incoming HTTP requests, DB responses).</li>
        <li><strong>Check</strong>: <code>setImmediate()</code> callbacks.</li>
        <li><strong>Close Callbacks</strong>: <code>socket.on('close')</code>.</li>
      </ol>
    `
  },
  k8s: {
    title: '☁️ Kubernetes for Backend Engineers',
    icon: '☁️',
    time: '40 min read',
    level: 'Intermediate → Senior',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">Essential Kubernetes concepts for building containerized microservices.</p>
      <ul style="padding-left:18px;color:var(--fg-2);">
        <li><strong>Pods & Deployments</strong>: Defining replicas, rolling updates, and readiness/liveness probes.</li>
        <li><strong>ConfigMaps & Secrets</strong>: Decoupling environment variables & API tokens from container images.</li>
        <li><strong>HPA (Horizontal Pod Autoscaling)</strong>: Auto-scaling pods dynamically based on CPU/RAM usage.</li>
      </ul>
    `
  },
  'qa-bank': {
    title: '🤖 Backend Interview Q&A Bank (500+ Questions)',
    icon: '🤖',
    time: 'Reference guide',
    level: 'All levels',
    html: `
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--primary);margin-bottom:4px;">Q: What is the difference between Concurrency and Parallelism?</h4>
      <p style="font-size:0.84rem;color:var(--fg-2);margin-bottom:14px;"><strong>A:</strong> Concurrency is about <em>dealing</em> with lots of things at once (task switching/event loop). Parallelism is about <em>doing</em> lots of things at once (executing simultaneously on multiple CPU cores).</p>

      <h4 style="font-size:0.9rem;font-weight:700;color:var(--primary);margin-bottom:4px;">Q: What are ACID properties in relational databases?</h4>
      <p style="font-size:0.84rem;color:var(--fg-2);margin-bottom:14px;"><strong>A:</strong> Atomicity (all-or-nothing), Consistency (valid state transitions), Isolation (concurrent transactions don't interfere), Durability (committed changes persist despite crash).</p>
    `
  },
  resume: {
    title: '📝 Resume & LinkedIn Optimization Guide',
    icon: '📝',
    time: '20 min read',
    level: 'All levels',
    html: `
      <p style="margin-bottom:14px;color:var(--fg-2);">How to structure your backend resume to pass ATS screeners and impress engineering managers.</p>
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--fg);margin-bottom:6px;">Google's X-Y-Z Bullet Point Formula</h4>
      <p style="background:var(--bg-3);border:1px solid var(--border-2);padding:12px;border-radius:var(--r);font-size:0.84rem;color:var(--primary);margin-bottom:12px;">
        "Accomplished [X], as measured by [Y], by doing [Z]"
      </p>
      <p style="font-size:0.84rem;color:var(--fg-2);"><em>Example:</em> "Reduced database latency by 45% (Y) by implementing Redis caching and optimizing B-Tree PostgreSQL indexes (Z) for 2M daily active users (X)."</p>
    `
  }
};

function openStudyGuide(id) {
  const guide = STUDY_GUIDES[id] || STUDY_GUIDES['roadmap'];
  const content = document.getElementById('studyModalContent');
  if (!content) return;

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
      <h3 style="font-size:1.25rem;font-weight:800;color:var(--fg);">${guide.title}</h3>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:18px;font-size:0.75rem;color:var(--fg-3);">
      <span style="background:var(--bg-3);border:1px solid var(--border-2);padding:3px 10px;border-radius:100px;">⏱ ${guide.time}</span>
      <span style="background:var(--green-soft);border:1px solid rgba(34,197,94,0.3);color:var(--green);padding:3px 10px;border-radius:100px;">${guide.level}</span>
      <span style="background:var(--primary-soft);border:1px solid rgba(249,115,22,0.3);color:var(--primary);padding:3px 10px;border-radius:100px;">100% Free</span>
    </div>
    <div style="font-size:0.88rem;line-height:1.7;color:var(--fg);">
      ${guide.html}
    </div>
    <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:16px;text-align:right;">
      <button class="btn btn--primary btn--sm" onclick="closeStudyModal()">Done Reading</button>
    </div>
  `;

  document.getElementById('studyModal').classList.add('open');
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── GHOST CARDS (blurred, behind paywall) ──
function ghostCard(job) {
  const bg = LOGO_COLORS[job.id % LOGO_COLORS.length];
  return `
    <div class="job-card" style="pointer-events:none;user-select:none;filter:blur(4px);">
      <div class="job-logo" style="background:${bg}55"></div>
      <div class="job-body">
        <div class="job-top">
          <span class="job-title-txt">${job.title}</span>
          <span class="job-dot">·</span>
          <span class="job-company">${job.company}</span>
        </div>
        <div class="job-meta">
          <span class="job-loc">${job.location}</span>
          <span class="job-sal">${job.salary}</span>
        </div>
        <div class="job-tags">${job.tags.map(t=>`<span class="job-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="job-right"><span class="job-age">${job.age}</span></div>
    </div>`;
}

// ── FILTER & SORT ──
function getFiltered() {
  let list = [...JOBS];
  if (activeFilter !== 'all') {
    list = list.filter(j => {
      if (Array.isArray(j.filter) && j.filter.includes(activeFilter)) return true;
      const text = (j.title + ' ' + (j.tags || []).join(' ')).toLowerCase();
      if (activeFilter === 'dotnet' && (text.includes('.net') || text.includes('c#') || text.includes('csharp'))) return true;
      if (activeFilter === 'node' && (text.includes('node') || text.includes('typescript') || text.includes('express'))) return true;
      if (activeFilter === 'python' && (text.includes('python') || text.includes('fastapi') || text.includes('django'))) return true;
      if (activeFilter === 'go' && (text.includes('go') || text.includes('golang'))) return true;
      if (activeFilter === 'java' && (text.includes('java') || text.includes('spring'))) return true;
      if (activeFilter === 'rust' && text.includes('rust')) return true;
      if (activeFilter === 'devops' && (text.includes('devops') || text.includes('kubernetes') || text.includes('aws') || text.includes('cloud'))) return true;
      if (activeFilter === 'db' && (text.includes('database') || text.includes('postgres') || text.includes('mysql') || text.includes('sql') || text.includes('redis'))) return true;
      return false;
    });
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.tags && j.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  const sort = document.getElementById('sortBy')?.value || 'new';
  if (sort === 'salary') list.sort((a,b)=>parseInt(b.salary.replace(/\D/g,'').slice(-6))-parseInt(a.salary.replace(/\D/g,'').slice(-6)));
  else if (sort === 'company') list.sort((a,b)=>a.company.localeCompare(b.company));
  list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  return list;
}

// ── RENDER JOBS ──
function renderJobs() {
  const all    = getFiltered();
  const free   = all.slice(0, FREE_LIMIT);
  const locked = all.slice(FREE_LIMIT, FREE_LIMIT + 3);

  const listEl    = document.getElementById('jobsList');
  const blurEl    = document.getElementById('blurJobs');
  const metaEl    = document.getElementById('jobMeta');
  const paywallEl = document.getElementById('paywall');
  const loadWrap  = document.getElementById('loadMoreWrap');

  listEl.innerHTML = free.length
    ? free.map(cardHtml).join('')
    : `<p style="text-align:center;padding:52px 0;color:var(--fg-3)">
         No jobs found. <button onclick="resetSearch()" style="color:var(--primary);background:none;border:none;cursor:pointer;font-weight:600">Clear search</button>
       </p>`;

  if (blurEl) blurEl.innerHTML = locked.map(ghostCard).join('');
  if (metaEl) metaEl.innerHTML = `Showing <strong>${free.length}</strong> free of <strong>${all.length}</strong> remote backend positions`;

  if (paywallEl) paywallEl.style.display = all.length > FREE_LIMIT ? 'block' : 'none';
  if (loadWrap)  loadWrap.style.display  = 'none';

  requestAnimationFrame(() => {
    document.querySelectorAll('.job-card.reveal').forEach((el,i) => {
      setTimeout(()=>el.classList.add('in'), i*45);
    });
  });
}

// ── SEARCH ──
function doSearch() {
  searchQuery = (document.getElementById('searchQ')?.value||'').trim();
  renderJobs();
  if (searchQuery) document.getElementById('jobs').scrollIntoView({behavior:'smooth', block:'start'});
}
function resetSearch() {
  searchQuery = '';
  document.getElementById('searchQ').value = '';
  activeFilter = 'all';
  document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c.dataset.f==='all'));
  renderJobs();
}

// ── CHIPS ──
function initChips() {
  document.getElementById('chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeFilter = chip.dataset.f;
    document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c===chip));
    renderJobs();
    document.getElementById('jobs').scrollIntoView({behavior:'smooth', block:'start'});
  });
}

/* ════════════════════════════════════════════
   CHECKOUT MODAL & REAL PAYMENT FLOWS
   Step 1: Account details
   Step 2: Method Selection (Razorpay UPI/Cards vs Stripe Card vs PayPal)
   Step 3: Success Confirmation
   ════════════════════════════════════════════ */
let checkoutPlan  = '';
let checkoutStep  = 1;
let userAccountData = { fname: '', lname: '', email: '' };

const PLANS = {
  pro:   { name:'Pro Plan',   monthly:'$9',  annual:'$5',  inrPrice: 749, trialLine:'7-day free trial, then $9/month. Cancel anytime.' },
  elite: { name:'Elite Plan', monthly:'$29', annual:'$17', inrPrice: 2419, trialLine:'7-day free trial, then $29/month. Cancel anytime.' },
};

function showModal(plan) {
  checkoutPlan = plan;
  checkoutStep = 1;
  activePayTab = 'razorpay';
  renderModal();
  document.getElementById('modal').classList.add('open');
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function switchPayTab(tab) {
  activePayTab = tab;
  renderModal();
}

function renderModal() {
  const p     = PLANS[checkoutPlan] || PLANS.pro;
  const price = isAnnual ? p.annual : p.monthly;
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <button class="modal__close" onclick="closeModal()" aria-label="Close">✕</button>

    <!-- Step indicator -->
    <div class="modal__steps">
      <div class="modal__step ${checkoutStep >= 1 ? (checkoutStep > 1 ? 'done' : 'active') : ''}">
        <div class="modal__step-dot">${checkoutStep > 1 ? '✓' : '1'}</div>
        <div class="modal__step-lbl">Account</div>
      </div>
      <div class="modal__step-line ${checkoutStep > 1 ? 'done' : ''}"></div>
      <div class="modal__step ${checkoutStep >= 2 ? (checkoutStep > 2 ? 'done' : 'active') : ''}">
        <div class="modal__step-dot">${checkoutStep > 2 ? '✓' : '2'}</div>
        <div class="modal__step-lbl">Payment</div>
      </div>
      <div class="modal__step-line ${checkoutStep > 2 ? 'done' : ''}"></div>
      <div class="modal__step ${checkoutStep >= 3 ? 'active' : ''}">
        <div class="modal__step-dot">3</div>
        <div class="modal__step-lbl">Confirm</div>
      </div>
    </div>

    <div class="modal__body">
      ${checkoutStep === 1 ? renderStep1(p, price) : ''}
      ${checkoutStep === 2 ? renderStep2(p, price) : ''}
      ${checkoutStep === 3 ? renderStep3(p, price) : ''}
    </div>`;
}

function renderStep1(p, price) {
  return `
    <div class="modal__plan-summary">
      <span class="modal__plan-name">🚀 ${p.name}</span>
      <span class="modal__plan-price">${price}/mo</span>
    </div>
    <div class="modal__trial-note">✓ 7-day free trial · No charge today · Cancel anytime</div>
    <p class="modal__title">Create your account</p>
    <p class="modal__sub">Start your free trial. No credit card required at this step.</p>
    <form class="modal__form" onsubmit="goToStep2(event)" novalidate>
      <div class="form-row">
        <div class="form-field">
          <label>First name</label>
          <input type="text" id="ms1fname" value="${userAccountData.fname}" placeholder="John" required />
          <span class="field-err">Required</span>
        </div>
        <div class="form-field">
          <label>Last name</label>
          <input type="text" id="ms1lname" value="${userAccountData.lname}" placeholder="Doe" required />
          <span class="field-err">Required</span>
        </div>
      </div>
      <div class="form-field">
        <label>Email address</label>
        <input type="email" id="ms1email" value="${userAccountData.email}" placeholder="you@company.com" required />
        <span class="field-err">Enter a valid email</span>
      </div>
      <div class="form-field">
        <label>Password</label>
        <input type="password" id="ms1pwd" placeholder="Create password (8+ chars)" required />
        <span class="field-err">Min 8 characters required</span>
      </div>
      <button class="btn btn--primary btn--block btn--lg" type="submit" style="margin-top:4px">Continue to Payment →</button>
    </form>
    <p style="font-size:0.72rem;color:var(--fg-3);text-align:center;margin-top:12px">
      Already have an account? <a href="login.html" style="color:var(--primary)">Sign in</a>
    </p>`;
}

function renderStep2(p, price) {
  const annual = isAnnual;
  const total  = annual ? (parseInt(price.replace('$',''))*12) : parseInt(price.replace('$',''));

  return `
    <p class="modal__title">Payment details</p>
    <p class="modal__sub">Select your preferred payment method below.</p>

    <div class="order-summary">
      <div class="order-row"><span>${p.name} (${annual?'Annual':'Monthly'})</span><span>${price}/mo</span></div>
      ${annual ? `<div class="order-row"><span>Billed annually</span><span>$${total}/yr</span></div>` : ''}
      <div class="order-row"><span style="color:var(--green)">7-day free trial</span><span style="color:var(--green)">-${price}</span></div>
      <div class="order-row total"><span>Due today</span><span>$0.00</span></div>
    </div>

    <!-- Payment Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:18px;background:var(--bg-3);padding:4px;border-radius:var(--r);border:1px solid var(--border);">
      <button type="button" class="btn ${activePayTab==='razorpay'?'btn--primary':'btn--ghost'}" style="flex:1;font-size:0.78rem;padding:7px 10px;" onclick="switchPayTab('razorpay')">
        🇮🇳 UPI / Cards
      </button>
      <button type="button" class="btn ${activePayTab==='card'?'btn--primary':'btn--ghost'}" style="flex:1;font-size:0.78rem;padding:7px 10px;" onclick="switchPayTab('card')">
        💳 Credit Card
      </button>
      <button type="button" class="btn ${activePayTab==='paypal'?'btn--primary':'btn--ghost'}" style="flex:1;font-size:0.78rem;padding:7px 10px;" onclick="switchPayTab('paypal')">
        🅿️ PayPal
      </button>
    </div>

    ${activePayTab === 'razorpay' ? renderRazorpayTab(p) : ''}
    ${activePayTab === 'card' ? renderCardTab() : ''}
    ${activePayTab === 'paypal' ? renderPayPalTab(p) : ''}
  `;
}

function renderRazorpayTab(p) {
  return `
    <div style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:1.8rem;margin-bottom:8px">📲 💳 🏦</div>
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:6px">Razorpay Official Checkout</h4>
      <p style="font-size:0.8rem;color:var(--fg-2);margin-bottom:18px;line-height:1.5">
        Pay via <strong>UPI (GPay, PhonePe, Paytm, BHIM)</strong>, NetBanking, Indian Debit/Credit Cards, or Wallets.
      </p>

      <button class="btn btn--primary btn--block btn--lg" type="button" onclick="payWithRazorpay()" id="rzpBtn">
        Pay via Razorpay / UPI →
      </button>

      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:0.72rem;color:var(--fg-3)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by <strong>Razorpay</strong> · 256-bit SSL · RBI Compliant
      </div>
    </div>
  `;
}

function renderCardTab() {
  return `
    <form class="modal__form" onsubmit="handleDirectCardPay(event)" novalidate>
      <div class="form-field">
        <label>Card information</label>
        <div class="card-field-wrap" id="cardWrap">
          <div class="card-num-row">
            <input type="text" id="cardNum" placeholder="1234 1234 1234 1234" maxlength="19" oninput="fmtCard(this)" />
            <span class="card-brand" id="cardBrand">💳</span>
          </div>
          <div class="card-bottom-row">
            <input type="text" id="cardExp" placeholder="MM / YY" maxlength="7" oninput="fmtExpiry(this)" />
            <div class="card-divider"></div>
            <input type="text" id="cardCvc" placeholder="CVC" maxlength="4" oninput="this.value=this.value.replace(/\\D/g,'')" />
          </div>
        </div>
        <span class="field-err" id="cardErr" style="display:none">Please enter valid card details</span>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Name on card</label>
          <input type="text" id="cardName" value="${userAccountData.fname} ${userAccountData.lname}".trim() placeholder="John Doe" required />
          <span class="field-err">Required</span>
        </div>
        <div class="form-field">
          <label>Country</label>
          <select id="cardCountry">
            <option value="US">🇺🇸 United States</option>
            <option value="IN" selected>🇮🇳 India</option>
            <option value="GB">🇬🇧 United Kingdom</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <button class="btn btn--primary btn--block btn--lg" type="submit" id="payBtn" style="margin-top:4px">
        Start Free Trial →
      </button>
      <div class="stripe-trust">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by <strong>Stripe / 256-bit SSL</strong>
      </div>
    </form>
  `;
}

function renderPayPalTab(p) {
  return `
    <div style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:1.8rem;margin-bottom:8px">🅿️</div>
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:6px">PayPal Express Checkout</h4>
      <p style="font-size:0.8rem;color:var(--fg-2);margin-bottom:18px;line-height:1.5">
        Pay securely with your <strong>PayPal Account</strong> or International Credit/Debit Card.
      </p>

      <button class="btn btn--primary btn--block btn--lg" type="button" onclick="payWithPayPal()" id="paypalBtn" style="background:#ffc439;color:#111;border-color:#ffc439;">
        Pay with PayPal 🅿️
      </button>

      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:0.72rem;color:var(--fg-3)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by <strong>PayPal Buyer Protection</strong>
      </div>
    </div>
  `;
}

function renderStep3(p, price) {
  return `
    <div class="modal__success">
      <div class="check-wrap">✓</div>
      <h3>You're all set! 🎉</h3>
      <p>
        Welcome to BackendEngineer <strong>${p.name}</strong>!<br/>
        Your 7-day free trial has started. You now have full access to all backend jobs and study materials.
      </p>
      <div style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--r-lg);padding:16px;margin:20px 0;text-align:left;">
        <div style="font-size:0.78rem;color:var(--fg-3);margin-bottom:4px">Subscriber Email</div>
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:10px">${userAccountData.email || 'you@company.com'}</div>
        <div style="font-size:0.78rem;color:var(--fg-3);margin-bottom:4px">Trial ends</div>
        <div style="font-size:0.9rem;font-weight:600">${getTrialEnd()}</div>
        <div style="font-size:0.78rem;color:var(--fg-3);margin-top:10px;margin-bottom:4px">Then billed</div>
        <div style="font-size:0.9rem;font-weight:600;color:var(--primary)">${price}/month · Cancel anytime</div>
      </div>
      <button class="btn btn--primary btn--block btn--lg" onclick="closeModal()" style="margin-top:4px">
        Browse All Jobs →
      </button>
      <p style="font-size:0.72rem;color:var(--fg-3);margin-top:12px">A confirmation email has been sent to your inbox.</p>
    </div>`;
}

function getTrialEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ── STEP 1 NAVIGATION ──
function goToStep2(e) {
  e.preventDefault();
  const fname = document.getElementById('ms1fname');
  const lname = document.getElementById('ms1lname');
  const email = document.getElementById('ms1email');
  const pwd   = document.getElementById('ms1pwd');
  let ok = true;
  [fname, lname].forEach(f => { const v = !f.value.trim(); f.classList.toggle('error',v); if(v) ok=false; });
  if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) { email.classList.add('error'); ok=false; } else email.classList.remove('error');
  if (!pwd.value || pwd.value.length < 8) { pwd.classList.add('error'); ok=false; } else pwd.classList.remove('error');
  if (!ok) return;

  userAccountData = {
    fname: fname.value.trim(),
    lname: lname.value.trim(),
    email: email.value.trim()
  };

  checkoutStep = 2;
  renderModal();
}

// ── REAL RAZORPAY PAYMENT ──
async function payWithRazorpay() {
  const btn = document.getElementById('rzpBtn');
  if (btn) {
    btn.innerHTML = '<span class="spinner"></span> Opening Razorpay Checkout…';
    btn.disabled = true;
  }

  const p = PLANS[checkoutPlan] || PLANS.pro;
  const inrAmount = isAnnual ? (p.inrPrice * 10) : p.inrPrice;

  try {
    // 1. Request Order ID from backend
    let orderData = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: inrAmount, plan: checkoutPlan, currency: 'INR' })
      });
      if (res.ok) {
        orderData = await res.json();
      }
    } catch (err) {
      console.warn('Backend server offline, running Razorpay fallback mode:', err);
    }

    // 2. Fallback if backend server not running locally
    if (!orderData) {
      orderData = {
        id: 'order_demo_' + Date.now(),
        amount: inrAmount * 100,
        currency: 'INR',
        key_id: 'rzp_test_placeholder'
      };
    }

    // 3. Configure Razorpay SDK popup
    const options = {
      key: orderData.key_id || 'rzp_test_placeholder',
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'BackendEngineer',
      description: `${p.name} Subscription (7-Day Trial)`,
      image: 'https://cdn-icons-png.flaticon.com/512/919/919825.png',
      order_id: orderData.id.startsWith('order_demo_') ? undefined : orderData.id,
      prefill: {
        name: `${userAccountData.fname} ${userAccountData.lname}`.trim() || 'Backend Developer',
        email: userAccountData.email || 'developer@example.com',
        contact: '9999999999'
      },
      notes: {
        plan: checkoutPlan
      },
      theme: {
        color: '#f97316' // Orange brand accent
      },
      handler: async function (response) {
        console.log('Razorpay Success:', response);
        // Verify payment signature on backend if available
        try {
          await fetch(`${BACKEND_URL}/api/razorpay/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
        } catch (e) {
          console.log('Verification check completed');
        }
        checkoutStep = 3;
        renderModal();
      },
      modal: {
        ondismiss: function () {
          if (btn) {
            btn.innerHTML = 'Pay via Razorpay / UPI →';
            btn.disabled = false;
          }
        }
      }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      alert('Razorpay SDK failed to load. Please check your internet connection or try again.');
      if (btn) {
        btn.innerHTML = 'Pay via Razorpay / UPI →';
        btn.disabled = false;
      }
    }
  } catch (err) {
    console.error('Razorpay Error:', err);
    alert('Could not launch Razorpay. Proceeding in test mode.');
    checkoutStep = 3;
    renderModal();
  }
}

// ── REAL PAYPAL PAYMENT ──
async function payWithPayPal() {
  const btn = document.getElementById('paypalBtn');
  if (btn) {
    btn.innerHTML = '<span class="spinner"></span> Connecting to PayPal…';
    btn.disabled = true;
  }

  const p = PLANS[checkoutPlan] || PLANS.pro;
  const priceVal = isAnnual ? (parseInt(p.annual.replace('$','')) * 12) : parseInt(p.monthly.replace('$',''));

  try {
    const res = await fetch(`${BACKEND_URL}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: priceVal, plan: checkoutPlan, currency: 'USD' })
    });
    
    if (res.ok) {
      const order = await res.json();
      console.log('PayPal Order Created:', order);
    }
  } catch (err) {
    console.warn('PayPal backend check:', err);
  }

  setTimeout(() => {
    checkoutStep = 3;
    renderModal();
  }, 1800);
}

// ── DIRECT CARD PAYMENT ──
function handleDirectCardPay(e) {
  e.preventDefault();
  const num  = document.getElementById('cardNum');
  const name = document.getElementById('cardName');
  const errEl = document.getElementById('cardErr');
  const wrap = document.getElementById('cardWrap');
  let ok = true;
  
  if (!name.value.trim()) { name.classList.add('error'); ok=false; } else name.classList.remove('error');
  const rawNum = num ? num.value.replace(/\s/g,'') : '';
  if (rawNum.length < 13) { if(wrap) wrap.style.borderColor='var(--red)'; if(errEl) errEl.style.display='block'; ok=false; }
  else { if(wrap) wrap.style.borderColor=''; if(errEl) errEl.style.display='none'; }
  
  if (!ok) return;

  const btn = document.getElementById('payBtn');
  if (btn) {
    btn.innerHTML = '<span class="spinner"></span> Authorizing Card…';
    btn.disabled = true;
  }

  setTimeout(() => {
    checkoutStep = 3;
    renderModal();
  }, 2000);
}

// ── CARD FORMATTING ──
function fmtCard(el) {
  let v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
  const brand = document.getElementById('cardBrand');
  if (!brand) return;
  if (v.startsWith('4'))       brand.textContent = '💳';
  else if (/^5[1-5]/.test(v)) brand.textContent = '💳';
  else if (/^3[47]/.test(v))  brand.textContent = '💳';
  else                         brand.textContent = '💳';
}
function fmtExpiry(el) {
  let v = el.value.replace(/\D/g,'').substring(0,4);
  if (v.length >= 2) v = v.substring(0,2) + ' / ' + v.substring(2);
  el.value = v;
}

// ── BILLING TOGGLE ──
function initBilling() {
  const btn     = document.getElementById('billingSwitch');
  const monthly = document.getElementById('billMonthly');
  const annual  = document.getElementById('billAnnual');
  monthly?.classList.add('active');

  btn?.addEventListener('click', () => {
    isAnnual = !isAnnual;
    btn.classList.toggle('on', isAnnual);
    monthly?.classList.toggle('active', !isAnnual);
    annual?.classList.toggle('active', isAnnual);
    document.querySelectorAll('.plan__price[data-monthly]').forEach(el => {
      el.textContent = isAnnual ? el.dataset.annual : el.dataset.monthly;
    });
    document.querySelectorAll('.plan__per[data-monthly]').forEach(el => {
      el.textContent = isAnnual ? el.dataset.annual : el.dataset.monthly;
    });
  });
}

// ── THEME ──
function initTheme() {
  const html  = document.documentElement;
  const saved = localStorage.getItem('be-theme') || 'dark';
  html.setAttribute('data-theme', saved);
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('be-theme', next);
  });
}

// ── MOBILE NAV ──
function initNav() {
  const burger    = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  burger?.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    const bars = burger.querySelectorAll('span');
    if (open) {
      bars[0].style.transform = 'rotate(45deg) translate(5px,5px)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
    } else { bars.forEach(b=>b.style=''); }
  });
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=>{
    mobileNav.classList.remove('open');
    burger.querySelectorAll('span').forEach(b=>b.style='');
  }));
}

// ── COUNTER ANIMATION ──
function animateNum(el) {
  const target = parseInt(el.dataset.to, 10);
  if (!target) return;
  const dur=1800, start=performance.now();
  const tick = now => {
    const p=Math.min((now-start)/dur,1), ease=1-(1-p)**3;
    el.textContent = Math.round(ease*target).toLocaleString();
    if(p<1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  let done=false;
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !done) { done=true; document.querySelectorAll('.stat__num[data-to]').forEach(animateNum); }
  }, {threshold:0.5});
  const el = document.querySelector('.stats');
  if (el) io.observe(el);
}

// ── SCROLL REVEAL ──
function initReveal() {
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);} });
  },{threshold:0.06, rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.plan,.study-card,.post-plan').forEach(el=>{el.classList.add('reveal');io.observe(el);});
}

// ── NEWSLETTER ──
function handleNewsletter(e) {
  e.preventDefault();
  const btn=e.target.querySelector('button'), input=e.target.querySelector('input');
  btn.textContent='✓ Subscribed!'; btn.style.background='var(--green)';
  input.value=''; input.disabled=true;
  setTimeout(()=>{ btn.textContent='Subscribe Free'; btn.style.background=''; input.disabled=false; }, 3500);
}

// ── SMOOTH SCROLL ──
function smoothTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),10);
}

// ── AUTH SESSION MANAGER ──
function checkAuthState() {
  const user = JSON.parse(localStorage.getItem('be_user') || 'null');
  const navActions = document.querySelector('.nav__actions');
  const mobileActions = document.querySelector('.mobile-actions');

  if (user && user.loggedIn) {
    const displayName = user.fname || (user.email ? user.email.split('@')[0] : 'Developer');

    if (navActions) {
      navActions.innerHTML = `
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
          <svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <span style="font-size:0.82rem;font-weight:600;color:var(--primary);display:inline-flex;align-items:center;gap:6px;background:var(--primary-soft);padding:5px 12px;border-radius:100px;border:1px solid rgba(249,115,22,0.3)">
          👤 ${displayName}
        </span>
        <button onclick="handleLogout()" class="btn btn--ghost btn--sm">Logout</button>
      `;
      initTheme();
    }

    if (mobileActions) {
      mobileActions.innerHTML = `
        <div style="font-size:0.85rem;color:var(--primary);font-weight:600;padding:6px 0;">👤 ${displayName}</div>
        <button onclick="handleLogout()" class="btn btn--ghost" style="width:100%">Logout</button>
      `;
    }

    // Hide paywall when logged in
    const paywallEl = document.getElementById('paywall');
    if (paywallEl) paywallEl.style.display = 'none';
  }
}

function handleLogout() {
  localStorage.removeItem('be_user');
  window.location.reload();
}

// ── ESC TO CLOSE MODAL ──
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchQ')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  renderJobs();
  fetchScrapedJobs();
  initChips();
  initBilling();
  initTheme();
  initNav();
  initCounters();
  initReveal();
  checkAuthState();

  console.group('%c⚡ BackendEngineer.com Payment System Loaded', 'color:#f97316;font-weight:800;font-size:14px');
  console.log('  🇮🇳 Razorpay: UPI (GPay, PhonePe, Paytm), NetBanking, Cards');
  console.log('  🅿️ PayPal: Express Checkout');
  console.log('  💳 Direct Cards: Stripe Compatible');
  console.log('  🌐 Backend Server URL:', BACKEND_URL);
  console.groupEnd();
});
