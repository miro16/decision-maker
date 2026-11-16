// Smoke test: proves the built app, the Cloudflare adapter, the Supabase auth flow,
// and that one decision title stays private to its owner.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const email = `smoke-${Date.now()}@example.com`;
const otherEmail = `smoke-other-${Date.now()}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const ownerJar = new Map();
const otherJar = new Map();

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function storeCookies(response, cookieJar) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((attr) => /max-age=0/i.test(attr.trim()));
    if (expired) cookieJar.delete(name.trim());
    else cookieJar.set(name.trim(), rest.join("="));
  }
}

async function request(path, { method = "GET", form, cookieJar = ownerJar } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(cookieJar),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  storeCookies(response, cookieJar);
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

function hiddenIdAfter(body, marker) {
  const from = body.indexOf(marker);
  if (from === -1) return "";
  const match = body.slice(from).match(/name="id"[^>]*value="([^"]+)"/);
  return match?.[1] ?? "";
}

// Options and criteria are listed before the ranking, so ranking assertions look only at what follows its heading.
function rankingOnly(page) {
  const from = page.body.indexOf(">Ranking<");
  return { ...page, body: from === -1 ? "" : page.body.slice(from) };
}

async function scoreIds() {
  const page = await request("/dashboard");
  return {
    a: hiddenIdAfter(page.body, "ScoreA"),
    b: hiddenIdAfter(page.body, "ScoreB"),
    c: hiddenIdAfter(page.body, "ScoreC"),
    price: hiddenIdAfter(page.body, "Price (3)"),
    battery: hiddenIdAfter(page.body, "Battery (1)"),
  };
}

// An empty string leaves the field blank, which clears that cell.
function saveScores(optionKey, price, battery, cookieJar = ownerJar) {
  return async () => {
    const ids = await scoreIds();
    return request("/api/scores", {
      method: "POST",
      form: { option_id: ids[optionKey], [`score_${ids.price}`]: price, [`score_${ids.battery}`]: battery },
      cookieJar,
    });
  };
}

function locationMatches(actual, expected) {
  if (expected.location === undefined) return true;
  if (expected.exactLocation) return actual.location === expected.location;
  return actual.location.startsWith(expected.location);
}

function bodyMatches(actual, expected) {
  const includes = expected.bodyIncludes ?? [];
  const excludes = expected.bodyExcludes ?? [];
  const order = expected.bodyOrder ?? [];
  return (
    includes.every((part) => actual.body.includes(part)) &&
    excludes.every((part) => !actual.body.includes(part)) &&
    order.every(([first, second]) => {
      const a = actual.body.indexOf(first);
      const b = actual.body.indexOf(second);
      return a !== -1 && b !== -1 && a < b;
    })
  );
}

const steps = [
  ["home renders", () => request("/"), { status: 200 }],
  ["dashboard redirects anonymous user", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password } }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/" },
  ],
  ["dashboard renders for signed-in user", () => request("/dashboard"), { status: 200 }],
  [
    "blank title is rejected",
    () => request("/api/decisions", { method: "POST", form: { title: "" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "dashboard has no stored title after blank rejection",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ['name="title"'], bodyExcludes: ["Which laptop?", "Which city?"] },
  ],
  [
    "owner creates Which laptop?",
    () => request("/api/decisions", { method: "POST", form: { title: "Which laptop?" } }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard shows Which laptop?",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?"], bodyExcludes: ['name="title"'] },
  ],
  [
    "blank option name is rejected",
    () => request("/api/options", { method: "POST", form: { intent: "create", name: "" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "dashboard has no option after blank rejection",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?"], bodyExcludes: ["MacBook", "ThinkPad"] },
  ],
  [
    "owner creates MacBook",
    () => request("/api/options", { method: "POST", form: { intent: "create", name: "MacBook" } }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner creates Price at weight 3",
    () => request("/api/criteria", { method: "POST", form: { intent: "create", name: "Price", weight: "3" } }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard shows MacBook and Price (3)",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["MacBook", "Price (3)"] },
  ],
  [
    "owner creates Battery at weight 1",
    () => request("/api/criteria", { method: "POST", form: { intent: "create", name: "Battery", weight: "1" } }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard keeps Price (3) before Battery (1)",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["MacBook", "Price (3)", "Battery (1)"], bodyOrder: [["Price (3)", "Battery (1)"]] },
  ],
  [
    "second account signs up",
    () => request("/api/auth/signup", { method: "POST", form: { email: otherEmail, password }, cookieJar: otherJar }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "second account signs in",
    () => request("/api/auth/signin", { method: "POST", form: { email: otherEmail, password }, cookieJar: otherJar }),
    { status: 302, location: "/" },
  ],
  [
    "second account does not see Which laptop?",
    () => request("/dashboard", { cookieJar: otherJar }),
    { status: 200, bodyExcludes: ["Which laptop?", "MacBook", "Price"] },
  ],
  [
    "second title is rejected",
    () => request("/api/decisions", { method: "POST", form: { title: "Which city?" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "owner dashboard keeps Which laptop?",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?", "MacBook", "Price (3)"], bodyExcludes: ["Which city?"] },
  ],
  [
    "duplicate macbook is rejected",
    () => request("/api/options", { method: "POST", form: { intent: "create", name: "macbook" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "owner dashboard keeps MacBook after duplicate",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["MacBook"] },
  ],
  [
    "weight 9 on Range is rejected",
    () => request("/api/criteria", { method: "POST", form: { intent: "create", name: "Range", weight: "9" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "owner dashboard has no Range",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Price (3)"], bodyExcludes: ["Range"] },
  ],
  [
    "owner renames MacBook to ThinkPad",
    async () => {
      const page = await request("/dashboard");
      return request("/api/options", {
        method: "POST",
        form: { intent: "update", id: hiddenIdAfter(page.body, "MacBook"), name: "ThinkPad" },
      });
    },
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard shows ThinkPad",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["ThinkPad"], bodyExcludes: ["MacBook"] },
  ],
  [
    "owner deletes ThinkPad",
    async () => {
      const page = await request("/dashboard");
      return request("/api/options", {
        method: "POST",
        form: { intent: "delete", id: hiddenIdAfter(page.body, "ThinkPad") },
      });
    },
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard no longer shows ThinkPad",
    () => request("/dashboard"),
    { status: 200, bodyExcludes: ["ThinkPad"] },
  ],
  [
    "owner creates ScoreA, ScoreB and ScoreC",
    async () => {
      let last = { status: 0, location: "", body: "" };
      for (const name of ["ScoreA", "ScoreB", "ScoreC"]) {
        last = await request("/api/options", { method: "POST", form: { intent: "create", name } });
        if (last.status !== 302 || last.location !== "/dashboard") return last;
      }
      return last;
    },
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "ranking shows no scores yet before any score is saved",
    async () => rankingOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["No scores yet"], bodyExcludes: ["Total "] },
  ],
  [
    "owner saves a complete grid for ScoreA",
    saveScores("a", "5", "5"),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner saves a complete grid for ScoreB",
    saveScores("b", "1", "1"),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "ranking puts the higher total above the lower one",
    async () => rankingOnly(await request("/dashboard")),
    {
      status: 200,
      bodyIncludes: ["Total 20", "Total 4", "ScoreC", "incomplete (2 missing)"],
      bodyExcludes: ["No scores yet", ">tie<"],
      bodyOrder: [
        ["ScoreA", "ScoreB"],
        ["ScoreB", "ScoreC"],
      ],
    },
  ],
  [
    "owner clears the Battery score of ScoreB",
    saveScores("b", "1", ""),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "partial grid shows ScoreB as incomplete with the sum of the scores that exist",
    async () => rankingOnly(await request("/dashboard")),
    {
      status: 200,
      bodyIncludes: ["Total 20", "Total 3", "incomplete (1 missing)"],
      bodyExcludes: ["Total 4", ">tie<"],
      bodyOrder: [["ScoreA", "ScoreB"]],
    },
  ],
  [
    "owner saves equal totals for ScoreA",
    saveScores("a", "2", "1"),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner saves equal totals for ScoreB",
    saveScores("b", "2", "1"),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "equal totals share rank 1 with a tie marker and the next rank skips to 3",
    async () => rankingOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["Total 7", ">1.<", ">tie<", ">3.<"], bodyExcludes: [">2.<", "Total 20", "Total 3"] },
  ],
  ...[
    ["score 0", "0", "3"],
    ["score 6", "5", "6"],
    ["score abc", "abc", "5"],
  ].flatMap(([label, price, battery]) => [
    [`${label} is rejected`, saveScores("a", price, battery), { status: 302, location: "/dashboard?error=" }],
    [
      `${label} stores nothing`,
      async () => rankingOnly(await request("/dashboard")),
      {
        status: 200,
        bodyIncludes: ["Total 7", ">tie<"],
        bodyExcludes: ["Total 9", "Total 13", "Total 16", "Total 20", "Total 3"],
      },
    ],
  ]),
  [
    "score for an option that is not on the decision is rejected",
    async () => {
      const ids = await scoreIds();
      return request("/api/scores", {
        method: "POST",
        form: {
          option_id: "00000000-0000-4000-8000-000000000000",
          [`score_${ids.price}`]: "5",
          [`score_${ids.battery}`]: "5",
        },
      });
    },
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "second account cannot save scores on the owner's option",
    async () => {
      const ids = await scoreIds();
      return request("/api/scores", {
        method: "POST",
        form: { option_id: ids.a, [`score_${ids.price}`]: "1", [`score_${ids.battery}`]: "1" },
        cookieJar: otherJar,
      });
    },
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "second account does not see the owner's scores or ranking",
    () => request("/dashboard", { cookieJar: otherJar }),
    { status: 200, bodyExcludes: ["ScoreA", "ScoreB", "Ranking", "Total ", "incomplete", ">tie<"] },
  ],
  [
    "owner ranking is unchanged after the second account's attempt",
    async () => rankingOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["Total 7", ">tie<"], bodyExcludes: ["Total 5", "Total 20"] },
  ],
  [
    "owner deletes ScoreA, ScoreB and ScoreC that have scores",
    async () => {
      let last = { status: 0, location: "", body: "" };
      for (const name of ["ScoreA", "ScoreB", "ScoreC"]) {
        const page = await request("/dashboard");
        last = await request("/api/options", {
          method: "POST",
          form: { intent: "delete", id: hiddenIdAfter(page.body, name) },
        });
        if (last.status !== 302 || last.location !== "/dashboard") return last;
      }
      return last;
    },
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "owner dashboard has no ScoreA, ScoreB or ranking after the deletes",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Price (3)"], bodyExcludes: ["ScoreA", "ScoreB", "ScoreC", "Ranking", "Total "] },
  ],
  [
    "owner creates options N01 through N20",
    async () => {
      let last = { status: 0, location: "", body: "" };
      for (let n = 1; n <= 20; n += 1) {
        last = await request("/api/options", {
          method: "POST",
          form: { intent: "create", name: `N${String(n).padStart(2, "0")}` },
        });
        if (last.status !== 302 || last.location !== "/dashboard") return last;
      }
      return last;
    },
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "21st option N21 is rejected",
    () => request("/api/options", { method: "POST", form: { intent: "create", name: "N21" } }),
    { status: 302, location: "/dashboard?error=" },
  ],
  [
    "owner dashboard has N20 and not N21",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["N20"], bodyExcludes: ["N21"] },
  ],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
];

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const ok = actual.status === expected.status && locationMatches(actual, expected) && bodyMatches(actual, expected);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    console.log(`      expected ${expected.status} ${expected.location ?? ""}`);
    const missing = (expected.bodyIncludes ?? []).filter((part) => !actual.body.includes(part));
    const forbidden = (expected.bodyExcludes ?? []).filter((part) => actual.body.includes(part));
    if (missing.length > 0) console.log(`      body missing ${missing.join(", ")}`);
    if (forbidden.length > 0) console.log(`      body forbidden ${forbidden.join(", ")}`);
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
