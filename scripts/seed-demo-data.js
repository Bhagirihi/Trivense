#!/usr/bin/env node
/**
 * Seed TripExpanse / Trivense demo data in Supabase.
 *
 * Creates 3 users (Alice invites Bob + Carol) and ~1 year of expenses,
 * boards, categories, sharing links, and notifications.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *   node scripts/seed-demo-data.js --reset   # delete demo boards/expenses first
 *
 * Optional env:
 *   SUPABASE_SERVICE_ROLE_KEY  (optional; sign-up works with anon key if email confirm is off)
 *   DEMO_PASSWORD              (default: TrivenseDemo123!)
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD || "TrivenseDemo123!";
const reset = process.argv.includes("--reset");

const DEMO_USERS = {
  alice: {
    email: "alice@trivense-demo.local",
    name: "Priya Sharma",
    role: "owner",
  },
  bob: {
    email: "bob@trivense-demo.local",
    name: "Rahul Mehta",
    role: "member",
  },
  carol: {
    email: "carol@trivense-demo.local",
    name: "Ananya Patel",
    role: "member",
  },
};

const PAYMENT_METHODS = ["cash", "card", "upi", "net_banking"];

const EXPENSE_TEMPLATES = {
  Food: [
    { description: "Weekly grocery run", min: 800, max: 3200 },
    { description: "Restaurant dinner", min: 450, max: 2200 },
    { description: "Coffee and snacks", min: 120, max: 650 },
    { description: "Food delivery", min: 250, max: 900 },
  ],
  Transport: [
    { description: "Uber ride", min: 150, max: 850 },
    { description: "Fuel refill", min: 1200, max: 3500 },
    { description: "Metro pass", min: 200, max: 800 },
    { description: "Auto rickshaw", min: 60, max: 250 },
  ],
  Shopping: [
    { description: "Clothing purchase", min: 900, max: 4500 },
    { description: "Electronics accessory", min: 500, max: 8000 },
    { description: "Household supplies", min: 300, max: 1800 },
  ],
  Entertainment: [
    { description: "Movie tickets", min: 400, max: 1200 },
    { description: "Streaming subscription", min: 199, max: 899 },
    { description: "Concert tickets", min: 1500, max: 6000 },
  ],
  Health: [
    { description: "Pharmacy", min: 200, max: 1500 },
    { description: "Doctor visit", min: 500, max: 2500 },
    { description: "Gym membership", min: 999, max: 2999 },
  ],
  Education: [
    { description: "Online course", min: 499, max: 4999 },
    { description: "Books and stationery", min: 300, max: 2000 },
  ],
  Housing: [
    { description: "Electricity bill", min: 800, max: 4500 },
    { description: "Internet bill", min: 599, max: 1499 },
    { description: "Home maintenance", min: 500, max: 5000 },
  ],
  Travel: [
    { description: "Flight booking", min: 3500, max: 18000 },
    { description: "Hotel stay", min: 2000, max: 12000 },
    { description: "Train tickets", min: 400, max: 3500 },
    { description: "Travel insurance", min: 800, max: 3500 },
    { description: "Museum entry", min: 200, max: 1200 },
    { description: "Local tour", min: 1500, max: 8000 },
  ],
};

if (!url || !anonKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

function makeClient(persist = false) {
  return createClient(url, anonKey, {
    auth: { persistSession: persist, autoRefreshToken: persist },
  });
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(date) {
  return date.toISOString();
}

async function createUserWithAdmin(adminClient, user) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.name },
  });
  if (error) throw error;
  return data.user;
}

async function signUpOrSignIn(client, user) {
  const { error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (!signInError) return;

  const { data, error: signUpError } = await client.auth.signUp({
    email: user.email,
    password,
    options: { data: { full_name: user.name } },
  });
  if (signUpError) throw signUpError;

  if (data.session) return;

  const { error: retryError } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (retryError) throw retryError;
}

async function waitForProfile(client, userId, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await client
      .from("profiles")
      .select("id, board_id, referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.board_id) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Profile/default board not ready after signup");
}

async function getCategories(client, userId) {
  const { data, error } = await client
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);
  if (error) throw error;
  const map = {};
  for (const cat of data || []) {
    map[cat.name] = cat.id;
  }
  return map;
}

async function deleteDemoBoards(client, ownerId) {
  const demoNames = ["Europe Trip 2025", "Home Renovation", "Office Team Lunch"];
  const { data: boards } = await client
    .from("expense_boards")
    .select("id, name")
    .eq("created_by", ownerId)
    .in("name", demoNames);

  if (boards?.length) {
    const ids = boards.map((b) => b.id);
    await client.from("expense_boards").delete().in("id", ids);
  }
}

async function clearBoardExpenses(client, boardId) {
  await client.from("expenses").delete().eq("board_id", boardId);
}

function buildExpensesForBoard({
  boardId,
  categoryMap,
  creators,
  categoryNames,
  count,
  startDate,
  endDate,
  biasCategory,
}) {
  const rows = [];
  const daySpan = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  for (let i = 0; i < count; i += 1) {
    const categoryName =
      biasCategory && Math.random() < 0.65
        ? biasCategory
        : pick(categoryNames.filter((n) => categoryMap[n]));
    const template = pick(EXPENSE_TEMPLATES[categoryName] || EXPENSE_TEMPLATES.Food);
    const creator = pick(creators);
    const expenseDate = addDays(startDate, Math.floor(Math.random() * daySpan));

    rows.push({
      board_id: boardId,
      category_id: categoryMap[categoryName],
      amount: randomBetween(template.min, template.max),
      description: template.description,
      date: toIso(expenseDate),
      created_by: creator.id,
      payment_method: pick(PAYMENT_METHODS),
      created_at: toIso(expenseDate),
      updated_at: toIso(expenseDate),
    });
  }

  return rows;
}

async function insertInChunks(client, table, rows, chunkSize = 80) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client.from(table).insert(chunk);
    if (error) throw error;
  }
}

async function seedNotifications(clients, users, sharedBoardName) {
  const now = new Date();
  const byUser = {
    alice: [
      {
        user_id: users.alice.id,
        type: "info",
        title: "Expense created",
        message: "Rahul added an expense on the shared trip board",
        trip_name: sharedBoardName,
        read: false,
        icon: "cash-plus",
        icon_color: "#4CAF50",
        created_at: toIso(addDays(now, -7)),
      },
      {
        user_id: users.alice.id,
        type: "warning",
        title: "Budget alert",
        message: "Europe Trip 2025 has reached 75% of the total budget",
        trip_name: sharedBoardName,
        read: false,
        icon: "alert-circle",
        icon_color: "#FF9800",
        created_at: toIso(addDays(now, -3)),
      },
    ],
    bob: [
      {
        user_id: users.bob.id,
        type: "info",
        title: "Expense board invited",
        message: `You were invited to "${sharedBoardName}"`,
        trip_name: sharedBoardName,
        read: false,
        icon: "account-group",
        icon_color: "#3498DB",
        created_at: toIso(addDays(now, -30)),
      },
      {
        user_id: users.bob.id,
        type: "info",
        title: "Expense created",
        message: "You created an expense of ₹1,250.00",
        trip_name: "General Expenses",
        read: true,
        icon: "cash-plus",
        icon_color: "#4CAF50",
        created_at: toIso(addDays(now, -14)),
      },
    ],
    carol: [
      {
        user_id: users.carol.id,
        type: "info",
        title: "Expense board invited",
        message: `You were invited to "${sharedBoardName}"`,
        trip_name: sharedBoardName,
        read: true,
        icon: "account-group",
        icon_color: "#3498DB",
        created_at: toIso(addDays(now, -28)),
      },
      {
        user_id: users.carol.id,
        type: "info",
        title: "Category created",
        message: "Custom category Weekend Treats was created",
        trip_name: "General Expenses",
        read: true,
        icon: "tag-plus",
        icon_color: "#9C27B0",
        created_at: toIso(addDays(now, -60)),
      },
    ],
  };

  for (const key of ["alice", "bob", "carol"]) {
    await clients[key].from("notifications").delete().eq("user_id", users[key].id);
    await insertInChunks(clients[key], "notifications", byUser[key], 20);
  }
}

async function main() {
  console.log("\nTrivense demo data seed");
  console.log(`Project: ${url}`);
  console.log(`Reset mode: ${reset ? "yes" : "no"}\n`);

  const adminClient = serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

  const clients = {
    alice: makeClient(false),
    bob: makeClient(false),
    carol: makeClient(false),
  };

  const users = {};

  for (const key of ["alice", "bob", "carol"]) {
    const demo = DEMO_USERS[key];
    try {
      if (adminClient) {
        const { data: existing } = await adminClient.auth.admin.listUsers();
        const found = existing?.users?.find(
          (u) => u.email?.toLowerCase() === demo.email.toLowerCase()
        );
        if (!found) {
          await createUserWithAdmin(adminClient, demo);
          console.log(`✓ Created auth user: ${demo.email}`);
        } else {
          console.log(`• Auth user exists: ${demo.email}`);
        }
      }
      await signUpOrSignIn(clients[key], demo);
      const { data: authData } = await clients[key].auth.getUser();
      users[key] = { ...demo, id: authData.user.id };
      console.log(`✓ Signed in: ${demo.name} (${demo.email})`);
    } catch (error) {
      console.error(`✗ Failed for ${demo.email}:`, error.message);
      process.exit(1);
    }
  }

  for (const key of ["alice", "bob", "carol"]) {
    users[key].profile = await waitForProfile(clients[key], users[key].id);
    users[key].categories = await getCategories(clients[key], users[key].id);
  }

  const alice = clients.alice;
  const endDate = new Date();
  const startDate = addDays(endDate, -365);

  if (reset) {
    await deleteDemoBoards(alice, users.alice.id);
    for (const key of ["alice", "bob", "carol"]) {
      await clearBoardExpenses(clients[key], users[key].profile.board_id);
    }
    console.log("✓ Cleared previous demo boards/expenses");
  }

  const { data: existingTrip } = await alice
    .from("expense_boards")
    .select("id")
    .eq("created_by", users.alice.id)
    .eq("name", "Europe Trip 2025")
    .maybeSingle();

  if (existingTrip && !reset) {
    console.log("\nDemo data already exists (Europe Trip 2025 board found).");
    console.log("Run with --reset to re-seed.\n");
    printCredentials();
    return;
  }

  await alice
    .from("expense_boards")
    .update({
      total_budget: 25000,
      name: "General Expenses",
      description: "Monthly household and personal spending",
    })
    .eq("id", users.alice.profile.board_id);

  await alice
    .from("profiles")
    .update({ default_board_budget: 25000, has_notifications: true })
    .eq("id", users.alice.id);

  const { data: tripBoard, error: tripError } = await alice
    .from("expense_boards")
    .insert([
      {
        name: "Europe Trip 2025",
        description: "Shared summer trip — Paris, Amsterdam, Rome",
        total_budget: 150000,
        per_person_budget: 50000,
        board_color: "#3498DB",
        board_icon: "airplane",
        share_code: "TRIP26",
        created_by: users.alice.id,
      },
    ])
    .select("id")
    .single();
  if (tripError) throw tripError;

  const { data: homeBoard, error: homeError } = await alice
    .from("expense_boards")
    .insert([
      {
        name: "Home Renovation",
        description: "Kitchen and bathroom remodel 2025–2026",
        total_budget: 200000,
        board_color: "#9B59B6",
        board_icon: "home",
        share_code: "HOME26",
        created_by: users.alice.id,
      },
    ])
    .select("id")
    .single();
  if (homeError) throw homeError;

  await alice.from("profiles").update({ total_boards: 3 }).eq("id", users.alice.id);

  for (const memberKey of ["bob", "carol"]) {
    const member = users[memberKey];
    const { error: shareError } = await alice.from("shared_users").insert([
      {
        shared_by: users.alice.id,
        shared_with: member.email,
        board_id: tripBoard.id,
        user_id: member.id,
        is_accepted: true,
        accepted_at: toIso(addDays(endDate, -25 + (memberKey === "carol" ? 2 : 0))),
        status: "accepted",
      },
    ]);
    if (shareError) throw shareError;
  }
  console.log("✓ Alice invited Bob and Carol to Europe Trip 2025");

  await clients.bob
    .from("expense_boards")
    .update({ total_budget: 15000, description: "Personal monthly budget" })
    .eq("id", users.bob.profile.board_id);
  await clients.carol
    .from("expense_boards")
    .update({ total_budget: 18000, description: "Personal monthly budget" })
    .eq("id", users.carol.profile.board_id);

  const { data: customCategory, error: catError } = await clients.carol
    .from("categories")
    .insert([
      {
        name: "Weekend Treats",
        description: "Special weekend outings",
        icon: "ice-cream",
        color: "#E91E63",
        user_id: users.carol.id,
        is_default: false,
      },
    ])
    .select("id, name")
    .single();
  if (catError && !catError.message.includes("duplicate")) throw catError;
  if (customCategory) {
    users.carol.categories[customCategory.name] = customCategory.id;
  }

  const aliceExpenses = [];
  const bobExpenses = [];
  const carolExpenses = [];
  const sharedTripExpenses = [];

  aliceExpenses.push(
    ...buildExpensesForBoard({
      boardId: users.alice.profile.board_id,
      categoryMap: users.alice.categories,
      creators: [users.alice],
      categoryNames: ["Food", "Transport", "Shopping", "Housing", "Health", "Entertainment"],
      count: 90,
      startDate,
      endDate,
    })
  );

  const tripRows = buildExpensesForBoard({
    boardId: tripBoard.id,
    categoryMap: users.alice.categories,
    creators: [users.alice, users.bob, users.carol],
    categoryNames: ["Travel", "Food", "Transport", "Entertainment", "Shopping"],
    count: 120,
    startDate: addDays(endDate, -300),
    endDate,
    biasCategory: "Travel",
  });
  for (const row of tripRows) {
    if (row.created_by === users.bob.id) bobExpenses.push(row);
    else if (row.created_by === users.carol.id) carolExpenses.push(row);
    else sharedTripExpenses.push(row);
  }

  aliceExpenses.push(
    ...buildExpensesForBoard({
      boardId: homeBoard.id,
      categoryMap: users.alice.categories,
      creators: [users.alice],
      categoryNames: ["Housing", "Shopping", "Transport"],
      count: 36,
      startDate: addDays(endDate, -280),
      endDate,
      biasCategory: "Housing",
    })
  );

  bobExpenses.push(
    ...buildExpensesForBoard({
      boardId: users.bob.profile.board_id,
      categoryMap: users.bob.categories,
      creators: [users.bob],
      categoryNames: ["Food", "Transport", "Entertainment", "Health", "Education"],
      count: 52,
      startDate,
      endDate,
    })
  );

  carolExpenses.push(
    ...buildExpensesForBoard({
      boardId: users.carol.profile.board_id,
      categoryMap: users.carol.categories,
      creators: [users.carol],
      categoryNames: ["Food", "Transport", "Shopping", "Entertainment", "Weekend Treats"],
      count: 52,
      startDate,
      endDate,
    })
  );

  if (aliceExpenses.length) await insertInChunks(alice, "expenses", aliceExpenses);
  if (sharedTripExpenses.length) await insertInChunks(alice, "expenses", sharedTripExpenses);
  if (bobExpenses.length) await insertInChunks(clients.bob, "expenses", bobExpenses);
  if (carolExpenses.length) await insertInChunks(clients.carol, "expenses", carolExpenses);

  const totalExpenses =
    aliceExpenses.length +
    sharedTripExpenses.length +
    bobExpenses.length +
    carolExpenses.length;
  console.log(`✓ Inserted ${totalExpenses} expenses (1 year span)`);

  await seedNotifications(clients, users, "Europe Trip 2025");
  console.log("✓ Seeded notifications");

  console.log("\nSeed complete.\n");
  printCredentials();
}

function printCredentials() {
  console.log("Demo login credentials:");
  console.log("─".repeat(44));
  for (const key of ["alice", "bob", "carol"]) {
    const u = DEMO_USERS[key];
    console.log(`${u.name.padEnd(16)} ${u.email}`);
    console.log(`${"".padEnd(16)} Password: ${password}`);
    console.log(`${"".padEnd(16)} Role: ${u.role === "owner" ? "invites others" : "invited member"}`);
    console.log("");
  }
  console.log("Shared board: Europe Trip 2025 (share code TRIP26)");
  console.log("Alice owns 3 boards; Bob & Carol each have a personal board + shared access.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message || error);
  process.exit(1);
});
