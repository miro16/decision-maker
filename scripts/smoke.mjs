// Smoke test: proves the built app, the Cloudflare adapter, the Supabase auth flow,
// and that decisions, options, criteria and scores stay private to their owner.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

import { randomUUID } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const email = `smoke-${Date.now()}@example.com`;
const otherEmail = `smoke-other-${Date.now()}@example.com`;
const flowEmail = `smoke-flow-${Date.now()}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const ownerJar = new Map();
const otherJar = new Map();
const flowJar = new Map();

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

const TABLE_HEADING = ">Decision table<";
const MANAGE_HEADING = ">Manage options<";
// The first dialog in the page ends the visible sections (table, tie-breaker); dialogs are rendered after them.
const DIALOGS_START = "<dialog";

// Option and criterion ids live in the manage dialogs below the table, so the search starts at the options dialog title.
// The table above lists the same names but has no `name="id"` field.
function hiddenIdAfter(body, marker) {
  const manageFrom = body.indexOf(MANAGE_HEADING);
  if (manageFrom === -1) return "";
  const scoped = body.slice(manageFrom);
  const from = scoped.indexOf(marker);
  if (from === -1) return "";
  const match = scoped.slice(from).match(/name="id"[^>]*value="([^"]+)"/);
  return match?.[1] ?? "";
}

const TIE_HEADING = ">Tie-breaker<";

// Table assertions look only at the table section: from its heading up to the tie-breaker or the first dialog.
function tableOnly(page) {
  const from = page.body.indexOf(TABLE_HEADING);
  const ends = [page.body.indexOf(TIE_HEADING), page.body.indexOf(DIALOGS_START)].filter((index) => index > from);
  return { ...page, body: from === -1 ? "" : page.body.slice(from, ends.length ? Math.min(...ends) : undefined) };
}

// The tie-breaker section: from its heading up to the first dialog; empty when the section is not rendered.
function tieBreakerOnly(page) {
  const from = page.body.indexOf(TIE_HEADING);
  const to = page.body.indexOf(DIALOGS_START);
  return { ...page, body: from === -1 ? "" : page.body.slice(from, to === -1 ? undefined : to) };
}

// One table row, found by the option name in its row header.
function rowOf(page, name) {
  const section = tableOnly(page).body;
  const header = new RegExp(`scope="row"[^>]*>\\s*${name}\\s*<`);
  const row = section.split("<tr").find((part) => header.test(part));
  return { ...page, body: row ?? "" };
}

// The decision the existing steps work on, read from the Location of the create redirect.
let decisionId = "";
let cityId = "";
// The decisions of the fresh account that covers selection, fallback and the delete confirmation.
let alphaId = "";
let betaId = "";

function idFromLocation(location) {
  return location.match(/^\/dashboard\?decision=([0-9a-f-]{36})$/i)?.[1] ?? "";
}

// Child writes always name their decision; the id is read when the step runs.
function child(path, form, getId = () => decisionId, cookieJar = ownerJar) {
  return () => request(path, { method: "POST", form: { decision_id: getId(), ...form }, cookieJar });
}

// The form may be a function so it can use ids learned while earlier steps ran.
function decisionWrite(form, cookieJar = ownerJar) {
  return () =>
    request("/api/decisions", { method: "POST", form: typeof form === "function" ? form() : form, cookieJar });
}

const ok =
  (getId = () => decisionId) =>
  () => ({ status: 302, location: `/dashboard?decision=${getId()}`, exactLocation: true });
const errorAt =
  (getId = () => decisionId) =>
  () => ({ status: 302, location: `/dashboard?decision=${getId()}&error=` });
const exactError = (message) => ({
  status: 302,
  location: `/dashboard?error=${encodeURIComponent(message)}`,
  exactLocation: true,
});

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
      form: {
        decision_id: decisionId,
        option_id: ids[optionKey],
        [`score_${ids.price}`]: price,
        [`score_${ids.battery}`]: battery,
      },
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
    decisionWrite({ intent: "create", title: "" }),
    exactError("Enter a title up to 200 characters"),
  ],
  [
    "dashboard has no stored title after blank rejection",
    () => request("/dashboard"),
    {
      status: 200,
      bodyIncludes: ["What are you deciding?", 'name="title"'],
      bodyExcludes: ["Which laptop?", "Which city?", "Your decisions"],
    },
  ],
  [
    "owner creates Which laptop?",
    async () => {
      const result = await request("/api/decisions", {
        method: "POST",
        form: { intent: "create", title: "Which laptop?" },
      });
      decisionId = idFromLocation(result.location);
      return result;
    },
    () => ({ status: 302, location: `/dashboard?decision=${decisionId}`, exactLocation: true }),
  ],
  [
    "owner dashboard shows Which laptop?",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?", "Your decisions", 'aria-current="page"'] },
  ],
  ["blank option name is rejected", child("/api/options", { intent: "create", name: "" }), errorAt()],
  [
    "dashboard has no option after blank rejection",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?"], bodyExcludes: ["MacBook", "ThinkPad"] },
  ],
  ["owner creates MacBook", child("/api/options", { intent: "create", name: "MacBook" }), ok()],
  ["owner creates Price at weight 3", child("/api/criteria", { intent: "create", name: "Price", weight: "3" }), ok()],
  [
    "owner dashboard shows MacBook and Price (3)",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["MacBook", "Price (3)"] },
  ],
  [
    "owner creates Battery at weight 1",
    child("/api/criteria", { intent: "create", name: "Battery", weight: "1" }),
    ok(),
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
    "owner dashboard keeps Which laptop?",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?", "MacBook", "Price (3)"] },
  ],
  ["duplicate macbook is rejected", child("/api/options", { intent: "create", name: "macbook" }), errorAt()],
  [
    "owner dashboard keeps MacBook after duplicate",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["MacBook"] },
  ],
  [
    "weight 9 on Range is rejected",
    child("/api/criteria", { intent: "create", name: "Range", weight: "9" }),
    errorAt(),
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
        form: {
          decision_id: decisionId,
          intent: "update",
          id: hiddenIdAfter(page.body, "MacBook"),
          name: "ThinkPad",
        },
      });
    },
    ok(),
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
        form: { decision_id: decisionId, intent: "delete", id: hiddenIdAfter(page.body, "ThinkPad") },
      });
    },
    ok(),
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
        last = await request("/api/options", {
          method: "POST",
          form: { decision_id: decisionId, intent: "create", name },
        });
        if (last.status !== 302 || last.location !== `/dashboard?decision=${decisionId}`) return last;
      }
      return last;
    },
    ok(),
  ],
  [
    "ranking shows no scores yet before any score is saved",
    async () => tableOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["No scores yet"], bodyExcludes: ["Total "] },
  ],
  ["owner saves a complete grid for ScoreA", saveScores("a", "5", "5"), ok()],
  ["owner saves a complete grid for ScoreB", saveScores("b", "1", "1"), ok()],
  [
    "table keeps the options in entry order and shows every total",
    async () => tableOnly(await request("/dashboard")),
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
    "no tie at first place shows no tie-breaker",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Total 20"], bodyExcludes: [">Tie-breaker<"] },
  ],
  [
    "ScoreA row shows rank 1 with the highest total",
    async () => rowOf(await request("/dashboard"), "ScoreA"),
    { status: 200, bodyIncludes: ["Total 20", ">1.<"], bodyExcludes: ["incomplete", ">tie<"] },
  ],
  [
    "ScoreB row shows rank 2 with the lower total",
    async () => rowOf(await request("/dashboard"), "ScoreB"),
    { status: 200, bodyIncludes: ["Total 4", ">2.<"], bodyExcludes: ["incomplete", ">tie<"] },
  ],
  [
    "ScoreC row shows rank 3 and is incomplete",
    async () => rowOf(await request("/dashboard"), "ScoreC"),
    { status: 200, bodyIncludes: ["incomplete (2 missing)", ">3.<"], bodyExcludes: [">tie<"] },
  ],
  [
    "score fields attach to their option's row form",
    async () => {
      const ids = await scoreIds();
      const page = tableOnly(await request("/dashboard"));
      const attached = ["a", "b", "c"].every((key) => {
        const row = page.body.split("<tr").find((part) => part.includes(`id="scores-${ids[key]}"`)) ?? "";
        return (
          row.includes(`form="scores-${ids[key]}"`) &&
          row.includes(`name="score_${ids.price}"`) &&
          row.includes(`name="score_${ids.battery}"`) &&
          row.includes(`name="option_id" value="${ids[key]}"`)
        );
      });
      return { ...page, status: attached ? 200 : 500 };
    },
    { status: 200 },
  ],
  ["owner clears the Battery score of ScoreB", saveScores("b", "1", ""), ok()],
  [
    "partial grid shows ScoreB as incomplete with the sum of the scores that exist",
    async () => tableOnly(await request("/dashboard")),
    {
      status: 200,
      bodyIncludes: ["Total 20", "Total 3", "incomplete (1 missing)"],
      bodyExcludes: ["Total 4", ">tie<"],
      bodyOrder: [["ScoreA", "ScoreB"]],
    },
  ],
  [
    "ScoreB row shows rank 2 and the incomplete marker",
    async () => rowOf(await request("/dashboard"), "ScoreB"),
    { status: 200, bodyIncludes: ["Total 3", ">2.<", "incomplete (1 missing)"] },
  ],
  [
    "partial grid with a clear leader shows no tie-breaker",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Total 20"], bodyExcludes: [">Tie-breaker<"] },
  ],
  ["owner saves Total 6 for ScoreA", saveScores("a", "1", "3"), ok()],
  ["owner saves Total 6 for ScoreB", saveScores("b", "1", "3"), ok()],
  ["owner scores only Price for ScoreC, which also totals 6 but is incomplete", saveScores("c", "2", ""), ok()],
  [
    "first place shared with an incomplete option shows the tie marker but no tie-breaker",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: [">tie<", "incomplete (1 missing)", "Total 6"], bodyExcludes: [">Tie-breaker<"] },
  ],
  ["owner clears the scores of ScoreC again", saveScores("c", "", ""), ok()],
  ["owner saves equal totals for ScoreA", saveScores("a", "2", "1"), ok()],
  ["owner saves equal totals for ScoreB", saveScores("b", "2", "1"), ok()],
  [
    "equal totals share rank 1 with a tie marker and the next rank skips to 3",
    async () => tableOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["Total 7", ">1.<", ">tie<", ">3.<"], bodyExcludes: [">2.<", "Total 20", "Total 3"] },
  ],
  [
    "two fully scored options sharing first place get a tie-breaker with only those options",
    async () => tieBreakerOnly(await request("/dashboard")),
    {
      status: 200,
      bodyIncludes: [">Tie-breaker<", "ScoreA", "ScoreB", "2 options share first place with Total 7"],
      bodyExcludes: ["ScoreC", "Total 20"],
    },
  ],
  ...[
    ["score 0", "0", "3"],
    ["score 6", "5", "6"],
    ["score abc", "abc", "5"],
  ].flatMap(([label, price, battery]) => [
    [`${label} is rejected`, saveScores("a", price, battery), errorAt()],
    [
      `${label} stores nothing`,
      async () => tableOnly(await request("/dashboard")),
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
          decision_id: decisionId,
          option_id: "00000000-0000-4000-8000-000000000000",
          [`score_${ids.price}`]: "5",
          [`score_${ids.battery}`]: "5",
        },
      });
    },
    errorAt(),
  ],
  [
    "second account cannot save scores on the owner's option",
    async () => {
      const ids = await scoreIds();
      return request("/api/scores", {
        method: "POST",
        form: {
          decision_id: decisionId,
          option_id: ids.a,
          [`score_${ids.price}`]: "1",
          [`score_${ids.battery}`]: "1",
        },
        cookieJar: otherJar,
      });
    },
    exactError("Create a decision first"),
  ],
  [
    "second account does not see the owner's scores or ranking",
    () => request("/dashboard", { cookieJar: otherJar }),
    { status: 200, bodyExcludes: ["ScoreA", "ScoreB", "Ranking", "Total ", "incomplete", ">tie<", ">Tie-breaker<"] },
  ],
  [
    "owner ranking is unchanged after the second account's attempt",
    async () => tableOnly(await request("/dashboard")),
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
          form: { decision_id: decisionId, intent: "delete", id: hiddenIdAfter(page.body, name) },
        });
        if (last.status !== 302 || last.location !== `/dashboard?decision=${decisionId}`) return last;
      }
      return last;
    },
    ok(),
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
          form: { decision_id: decisionId, intent: "create", name: `N${String(n).padStart(2, "0")}` },
        });
        if (last.status !== 302 || last.location !== `/dashboard?decision=${decisionId}`) return last;
      }
      return last;
    },
    ok(),
  ],
  ["21st option N21 is rejected", child("/api/options", { intent: "create", name: "N21" }), errorAt()],
  [
    "owner dashboard has N20 and not N21",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["N20"], bodyExcludes: ["N21"] },
  ],
  [
    "second account cannot rename the owner's decision",
    decisionWrite(() => ({ intent: "rename", id: decisionId, title: "Hijacked" }), otherJar),
    exactError("Decision not found"),
  ],
  [
    "second account cannot delete the owner's decision",
    decisionWrite(() => ({ intent: "delete", id: decisionId }), otherJar),
    exactError("Decision not found"),
  ],
  [
    "owner decision survives the second account's rename and delete",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?", "N20"], bodyExcludes: ["Hijacked"] },
  ],
  ...[
    ["options", { intent: "create", name: "Intruder" }],
    ["criteria", { intent: "create", name: "Intruder", weight: "2" }],
    ["scores", { option_id: "00000000-0000-4000-8000-000000000000" }],
  ].flatMap(([path, form]) => [
    [
      `${path} reject a decision_id of another account`,
      child(`/api/${path}`, form, () => decisionId, otherJar),
      exactError("Create a decision first"),
    ],
    [
      `${path} reject a malformed decision_id`,
      child(`/api/${path}`, form, () => "not-a-uuid"),
      exactError("Create a decision first"),
    ],
    [
      `${path} reject a missing decision_id`,
      () => request(`/api/${path}`, { method: "POST", form }),
      exactError("Create a decision first"),
    ],
  ]),
  [
    "owner dashboard has no Intruder after the rejected writes",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which laptop?", "N20"], bodyExcludes: ["Intruder"] },
  ],
  [
    "owner rename with a malformed id is not found",
    decisionWrite({ intent: "rename", id: "not-a-uuid", title: "Anything" }),
    exactError("Decision not found"),
  ],
  [
    "unknown decision intent is refused",
    decisionWrite({ intent: "archive", title: "Anything" }),
    exactError("Could not save the decision"),
  ],
  [
    "owner creates a second decision Which city?",
    async () => {
      const result = await request("/api/decisions", {
        method: "POST",
        form: { intent: "create", title: "Which city?" },
      });
      cityId = idFromLocation(result.location);
      return result;
    },
    () => ({ status: 302, location: `/dashboard?decision=${cityId}`, exactLocation: true }),
  ],
  [
    "dashboard shows the newest decision with its own children",
    () => request("/dashboard"),
    // The decision list names every decision, so only the children prove which decision is open.
    { status: 200, bodyIncludes: ["Which city?", "Which laptop?"], bodyExcludes: ["N20", "Price (3)"] },
  ],
  [
    "owner renames the second decision",
    () => request("/api/decisions", { method: "POST", form: { intent: "rename", id: cityId, title: "Which town?" } }),
    ok(() => cityId),
  ],
  [
    "dashboard shows the new title and not the old one",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which town?", "Which laptop?"], bodyExcludes: ["Which city?"] },
  ],
  [
    "blank rename is rejected",
    () => request("/api/decisions", { method: "POST", form: { intent: "rename", id: cityId, title: "  " } }),
    errorAt(() => cityId),
  ],
  [
    "title is unchanged after the blank rename",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Which town?"] },
  ],
  [
    "owner adds an option and a criterion to the second decision",
    async () => {
      const first = await child("/api/options", { intent: "create", name: "CityOption" }, () => cityId)();
      if (first.location !== `/dashboard?decision=${cityId}`) return first;
      return child("/api/criteria", { intent: "create", name: "Walkable", weight: "2" }, () => cityId)();
    },
    ok(() => cityId),
  ],
  [
    "owner scores the option of the second decision",
    async () => {
      const page = await request("/dashboard");
      return request("/api/scores", {
        method: "POST",
        form: {
          decision_id: cityId,
          option_id: hiddenIdAfter(page.body, "CityOption"),
          [`score_${hiddenIdAfter(page.body, "Walkable (2)")}`]: "5",
        },
      });
    },
    ok(() => cityId),
  ],
  [
    "second decision shows its own ranking",
    async () => tableOnly(await request("/dashboard")),
    { status: 200, bodyIncludes: ["CityOption", "Total 10"] },
  ],
  [
    "owner deletes the second decision",
    () => request("/api/decisions", { method: "POST", form: { intent: "delete", id: cityId } }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "delete removed the second decision with its options, criteria and scores",
    () => request("/dashboard"),
    {
      status: 200,
      bodyIncludes: ["Which laptop?", "N20", "Price (3)"],
      bodyExcludes: ["Which town?", "CityOption", "Walkable", "Total 10"],
    },
  ],
  [
    "writing to the deleted decision is refused",
    child("/api/options", { intent: "create", name: "Ghost" }, () => cityId),
    exactError("Create a decision first"),
  ],
  [
    "deleting the deleted decision again is not found",
    decisionWrite(() => ({ intent: "delete", id: cityId })),
    exactError("Decision not found"),
  ],
  [
    "owner fills the account up to 20 decisions",
    async () => {
      let last = { status: 0, location: "", body: "" };
      for (let n = 1; n <= 19; n += 1) {
        last = await request("/api/decisions", {
          method: "POST",
          form: { intent: "create", title: `Cap${String(n).padStart(2, "0")}` },
        });
        if (last.status !== 302 || !idFromLocation(last.location)) return last;
      }
      return last;
    },
    { status: 302, location: "/dashboard?decision=" },
  ],
  [
    "21st decision is refused",
    decisionWrite({ intent: "create", title: "Cap20" }),
    exactError("You can have at most 20 decisions"),
  ],
  [
    "dashboard still shows the newest decision and not the refused one",
    () => request("/dashboard"),
    { status: 200, bodyIncludes: ["Cap19"], bodyExcludes: ["Cap20"] },
  ],
  [
    "second account has its own decision allowance",
    decisionWrite({ intent: "create", title: "Other decision" }, otherJar),
    { status: 302, location: "/dashboard?decision=" },
  ],
  [
    "owner does not see the second account's decision",
    () => request("/dashboard"),
    { status: 200, bodyExcludes: ["Other decision"] },
  ],
  // Selection, fallback and the delete confirmation use a fresh account, because the owner account is at the cap.
  [
    "flow account signs up",
    () => request("/api/auth/signup", { method: "POST", form: { email: flowEmail, password }, cookieJar: flowJar }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "flow account signs in",
    () => request("/api/auth/signin", { method: "POST", form: { email: flowEmail, password }, cookieJar: flowJar }),
    { status: 302, location: "/" },
  ],
  [
    "flow account creates Alpha decision",
    async () => {
      const result = await request("/api/decisions", {
        method: "POST",
        form: { intent: "create", title: "Alpha decision" },
        cookieJar: flowJar,
      });
      alphaId = idFromLocation(result.location);
      return result;
    },
    () => ({ status: 302, location: `/dashboard?decision=${alphaId}`, exactLocation: true }),
  ],
  [
    "flow account creates Beta decision",
    async () => {
      const result = await request("/api/decisions", {
        method: "POST",
        form: { intent: "create", title: "Beta decision" },
        cookieJar: flowJar,
      });
      betaId = idFromLocation(result.location);
      return result;
    },
    () => ({ status: 302, location: `/dashboard?decision=${betaId}`, exactLocation: true }),
  ],
  [
    "flow account adds AlphaOption to Alpha decision",
    child("/api/options", { intent: "create", name: "AlphaOption" }, () => alphaId, flowJar),
    ok(() => alphaId),
  ],
  [
    "flow account adds BetaOption to Beta decision",
    child("/api/options", { intent: "create", name: "BetaOption" }, () => betaId, flowJar),
    ok(() => betaId),
  ],
  [
    "dashboard without a selection opens the newest decision",
    () => request("/dashboard", { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["Your decisions", "Alpha decision", "Beta decision", "BetaOption"],
      bodyExcludes: ["AlphaOption", "Decision not found"],
    },
  ],
  [
    "decision selected by id shows only its own options",
    () => request(`/dashboard?decision=${alphaId}`, { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["Alpha decision", "AlphaOption", 'aria-current="page"'],
      bodyExcludes: ["BetaOption", "Decision not found"],
    },
  ],
  [
    "the other decision shows only its own options",
    () => request(`/dashboard?decision=${betaId}`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Beta decision", "BetaOption"], bodyExcludes: ["AlphaOption", "Decision not found"] },
  ],
  [
    "decisions render as tiles that link to each decision",
    () => request(`/dashboard?decision=${alphaId}`, { cookieJar: flowJar }),
    () => ({
      status: 200,
      bodyIncludes: [
        `href="/dashboard?decision=${alphaId}"`,
        `href="/dashboard?decision=${betaId}"`,
        "aspect-square",
        'data-dialog-open="dialog-new-decision"',
      ],
    }),
  ],
  [
    "editing dialogs are in the page, the delete confirmation is not",
    () => request(`/dashboard?decision=${alphaId}`, { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: [
        'id="dialog-new-decision"',
        'id="dialog-edit-decision"',
        'id="dialog-options"',
        'id="dialog-criteria"',
        ">Manage options<",
        ">Manage criteria<",
      ],
      bodyExcludes: ['id="dialog-confirm-delete"'],
    },
  ],
  [
    "the delete confirmation is a dialog that opens on load",
    () => request(`/dashboard?decision=${alphaId}&confirm=delete`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ['id="dialog-confirm-delete"', "data-auto-open"] },
  ],
  [
    "unknown decision id falls back to the newest decision with a message",
    () => request(`/dashboard?decision=${randomUUID()}`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Decision not found", "BetaOption"], bodyExcludes: ["AlphaOption"] },
  ],
  [
    "malformed decision id falls back to the newest decision with a message",
    () => request("/dashboard?decision=not-a-uuid", { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Decision not found", "BetaOption"], bodyExcludes: ["AlphaOption"] },
  ],
  [
    "another account's decision id is not found",
    () => request(`/dashboard?decision=${decisionId}`, { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["Decision not found", "BetaOption"],
      bodyExcludes: ["AlphaOption", "Which laptop?", "N20"],
    },
  ],
  [
    "plain dashboard has no delete confirmation",
    () => request(`/dashboard?decision=${alphaId}`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Delete decision"], bodyExcludes: ["Delete permanently"] },
  ],
  [
    "confirm=delete renders the confirmation",
    () => request(`/dashboard?decision=${alphaId}&confirm=delete`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Delete permanently", "Cancel", "Alpha decision"] },
  ],
  [
    "the decision still exists after the confirm=delete GET",
    () => request(`/dashboard?decision=${alphaId}`, { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["Alpha decision", "Beta decision", "AlphaOption"],
      bodyExcludes: ["Decision not found"],
    },
  ],
  [
    "confirming the delete of the newest decision redirects to the dashboard",
    () => request("/api/decisions", { method: "POST", form: { intent: "delete", id: betaId }, cookieJar: flowJar }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "dashboard resolves to the newest remaining decision",
    () => request("/dashboard", { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["Alpha decision", "AlphaOption"],
      bodyExcludes: ["Beta decision", "BetaOption", "Decision not found"],
    },
  ],
  [
    "confirm=delete without a decision parameter renders no confirmation",
    () => request("/dashboard?confirm=delete", { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Alpha decision"], bodyExcludes: ["Delete permanently"] },
  ],
  [
    "confirm=delete with an unknown decision id renders no confirmation",
    () => request(`/dashboard?decision=${randomUUID()}&confirm=delete`, { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["Decision not found"], bodyExcludes: ["Delete permanently"] },
  ],
  [
    "confirming the delete of the last decision redirects to the dashboard",
    () => request("/api/decisions", { method: "POST", form: { intent: "delete", id: alphaId }, cookieJar: flowJar }),
    { status: 302, location: "/dashboard", exactLocation: true },
  ],
  [
    "deleting the last decision shows the add form",
    () => request("/dashboard", { cookieJar: flowJar }),
    {
      status: 200,
      bodyIncludes: ["What are you deciding?", "Add decision"],
      bodyExcludes: ["Alpha decision", "AlphaOption", "Your decisions", "Delete permanently"],
    },
  ],
  [
    "confirm=delete without any decision renders no confirmation",
    () => request("/dashboard?confirm=delete", { cookieJar: flowJar }),
    { status: 200, bodyIncludes: ["What are you deciding?"], bodyExcludes: ["Delete permanently"] },
  ],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
];

let failed = 0;
for (const [name, run, expectation] of steps) {
  const actual = await run();
  // An expectation may be a function so it can use ids learned while the step ran.
  const expected = typeof expectation === "function" ? expectation() : expectation;
  const passed =
    actual.status === expected.status && locationMatches(actual, expected) && bodyMatches(actual, expected);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!passed) {
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
