#!/usr/bin/env node
/**
 * Live QA for board sharing flows against TripExpanse Supabase.
 * Usage: node scripts/qa-board-sharing.js
 * Optional env overrides:
 *   QA_USER_A_EMAIL, QA_USER_A_PASSWORD
 *   QA_USER_B_EMAIL, QA_USER_B_PASSWORD
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const stamp = Date.now();
const userA = {
  email: process.env.QA_USER_A_EMAIL || `qa-owner-${stamp}@trivense-test.local`,
  password: process.env.QA_USER_A_PASSWORD || "QaTest123456!",
  name: "QA Owner",
};
const userB = {
  email: process.env.QA_USER_B_EMAIL || `qa-member-${stamp}@trivense-test.local`,
  password: process.env.QA_USER_B_PASSWORD || "QaTest123456!",
  name: "QA Member",
};

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signUpOrSignIn(client, user) {
  const { error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (!signInError) return;

  const { data, error: signUpError } = await client.auth.signUp({
    email: user.email,
    password: user.password,
    options: { data: { full_name: user.name } },
  });
  if (signUpError) throw signUpError;

  if (data.session) return;

  const { error: retryError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (retryError) throw retryError;
}

async function main() {
  console.log(`\nTripExpanse board-sharing QA`);
  console.log(`Project: ${url}\n`);

  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    await signUpOrSignIn(clientA, userA);
    await signUpOrSignIn(clientB, userB);
    pass("Auth", `A=${userA.email}, B=${userB.email}`);
  } catch (error) {
    fail("Auth", error.message);
    return summarize(false);
  }

  const { data: authA } = await clientA.auth.getUser();
  const { data: authB } = await clientB.auth.getUser();

  let boardId;
  let shareCode;

  try {
    const { data: board, error } = await clientA
      .from("expense_boards")
      .insert([
        {
          name: `QA Board ${stamp}`,
          description: "Automated sharing QA",
          total_budget: 500,
          board_color: "#4ECDC4",
          board_icon: "airplane",
          share_code: `QA${String(stamp).slice(-4)}`,
          created_by: authA.user.id,
        },
      ])
      .select("id, share_code")
      .single();

    if (error) throw error;
    boardId = board.id;
    shareCode = board.share_code;
    pass("Create board", boardId);
  } catch (error) {
    fail("Create board", error.message);
    return summarize(false);
  }

  try {
    const { data, error } = await clientA
      .from("shared_users")
      .insert([
        {
          shared_by: authA.user.id,
          shared_with: userB.email.toLowerCase(),
          board_id: boardId,
          user_id: authB.user.id,
          is_accepted: false,
          status: "pending",
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    pass("Share by email (insert)", data.id);

    const { data: invite, error: readError } = await clientB
      .from("shared_users")
      .select("id, status, is_accepted")
      .eq("id", data.id)
      .single();

    if (readError) throw readError;
    if (invite.status !== "pending") {
      throw new Error(`Expected pending, got ${invite.status}`);
    }
    pass("Invitee can read pending invite");

    const { error: acceptError } = await clientB
      .from("shared_users")
      .update({
        user_id: authB.user.id,
        is_accepted: true,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (acceptError) throw acceptError;
    pass("Invitee accepts invitation");
  } catch (error) {
    fail("Email invite flow", error.message);
  }

  try {
    const { data: joinedBoards, error } = await clientB
      .from("shared_users")
      .select("board_id, is_accepted")
      .eq("user_id", authB.user.id)
      .eq("board_id", boardId)
      .eq("is_accepted", true);

    if (error) throw error;
    if (!joinedBoards?.length) throw new Error("Accepted share not visible to member");
    pass("Member sees accepted shared board link");
  } catch (error) {
    fail("Member board access", error.message);
  }

  try {
    const joinCode = `QAJOIN${String(stamp).slice(-4)}`;
    const { data: joinBoard, error: boardErr } = await clientA
      .from("expense_boards")
      .insert([
        {
          name: `QA Join Board ${stamp}`,
          total_budget: 300,
          share_code: joinCode,
          created_by: authA.user.id,
        },
      ])
      .select("id")
      .single();

    if (boardErr) throw boardErr;

    const { data: joinResult, error: joinError } = await clientB.rpc(
      "join_expense_board",
      { p_code: joinCode }
    );

    if (joinError) throw joinError;
    if (!joinResult?.joined && !joinResult?.accepted) {
      throw new Error(`Unexpected join result: ${JSON.stringify(joinResult)}`);
    }
    pass("Join via share_code RPC", joinResult.board_name);

    const { data: dupResult, error: dupError } = await clientB.rpc(
      "join_expense_board",
      { p_code: joinCode }
    );
    if (dupError) throw dupError;
    if (!dupResult?.already_member) {
      throw new Error("Expected already_member on duplicate join");
    }
    pass("Duplicate join returns already_member");

    await clientA.from("expense_boards").delete().eq("id", joinBoard.id);
  } catch (error) {
    fail("Join-by-code flow", error.message);
  }

  try {
    const { data: expenses, error: expError } = await clientA
      .from("expenses")
      .insert([
        {
          board_id: boardId,
          amount: 42.5,
          description: "QA shared expense",
          created_by: authA.user.id,
        },
      ])
      .select("id")
      .single();

    if (expError) throw expError;

    const { data: memberExpenses, error: readError } = await clientB
      .from("expenses")
      .select("id, amount")
      .eq("board_id", boardId);

    if (readError) throw readError;
    const found = memberExpenses?.some((e) => e.id === expenses.id);
    if (!found) throw new Error("Member cannot read shared board expenses");
    pass("Member reads shared board expenses", `$${expenses.amount}`);

    await clientA.from("expenses").delete().eq("id", expenses.id);
  } catch (error) {
    fail("Shared expense visibility", error.message);
  }

  try {
    await clientA.from("expense_boards").delete().eq("id", boardId);
    pass("Cleanup test board");
  } catch (error) {
    fail("Cleanup", error.message);
  }

  summarize(true);
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("All board-sharing QA checks passed.\n");
}

main().catch((error) => {
  console.error("Unexpected QA error:", error);
  process.exit(1);
});
