import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { supabase } from "../config/supabase";

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function flattenExpensesForCsv(expenses, boardMap, categoryMap) {
  return expenses.map((expense) => ({
    id: expense.id,
    date: expense.date || expense.created_at,
    amount: expense.amount,
    description: expense.description || "",
    category: categoryMap[expense.category_id]?.name || "",
    board: boardMap[expense.board_id]?.name || "",
    payment_method: expense.payment_method || "",
    created_by: expense.created_by,
  }));
}

function buildCsv(rows) {
  if (!rows.length) {
    return "date,amount,description,category,board,payment_method,expense_id\n";
  }

  const headers = [
    "date",
    "amount",
    "description",
    "category",
    "board",
    "payment_method",
    "expense_id",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => escapeCsvValue(row[key])).join(",")
    ),
  ];

  return lines.join("\n");
}

export async function fetchExportData() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to export data");
  }

  const [profileRes, ownedBoardsRes, sharedLinksRes, categoriesRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("expense_boards")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("shared_users")
        .select("board_id")
        .eq("user_id", user.id)
        .eq("is_accepted", true),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  if (profileRes.error) throw profileRes.error;
  if (ownedBoardsRes.error) throw ownedBoardsRes.error;
  if (sharedLinksRes.error) throw sharedLinksRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const sharedBoardIds = (sharedLinksRes.data || []).map((link) => link.board_id);
  let sharedBoards = [];

  if (sharedBoardIds.length > 0) {
    const { data, error } = await supabase
      .from("expense_boards")
      .select("*")
      .in("id", sharedBoardIds);
    if (error) throw error;
    sharedBoards = data || [];
  }

  const boards = [...(ownedBoardsRes.data || []), ...sharedBoards];
  const boardIds = [...new Set(boards.map((board) => board.id))];
  const boardMap = boards.reduce((acc, board) => {
    acc[board.id] = board;
    return acc;
  }, {});

  let expenses = [];
  if (boardIds.length > 0) {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .in("board_id", boardIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    expenses = data || [];
  }

  const categories = categoriesRes.data || [];
  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  return {
    exportedAt: new Date().toISOString(),
    app: "Trivense",
    version: "1.0.0",
    profile: profileRes.data,
    boards,
    categories,
    expenses,
    summary: {
      boardCount: boards.length,
      expenseCount: expenses.length,
      categoryCount: categories.length,
      totalAmount: expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      ),
    },
    csvRows: flattenExpensesForCsv(expenses, boardMap, categoryMap),
  };
}

export function serializeExportData(data, format = "json") {
  if (format === "csv") {
    return buildCsv(data.csvRows || []);
  }

  const { csvRows, ...jsonPayload } = data;
  return JSON.stringify(jsonPayload, null, 2);
}

export async function writeExportFile(content, format = "json") {
  const extension = format === "csv" ? "csv" : "json";
  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `trivense-export-${stamp}.${extension}`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { fileUri, fileName, mimeType };
}

export async function shareExportFile(fileUri, mimeType, dialogTitle) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      Platform.OS === "web"
        ? "Sharing is not supported in the browser"
        : "Sharing is not available on this device"
    );
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: dialogTitle || "Export Trivense Data",
    UTI: mimeType === "text/csv" ? "public.comma-separated-values-text" : "public.json",
  });
}

export async function exportAndShare(format = "json", dialogTitle) {
  const data = await fetchExportData();
  const content = serializeExportData(data, format);
  const { fileUri, mimeType } = await writeExportFile(content, format);
  await shareExportFile(fileUri, mimeType, dialogTitle);
  return { fileUri, format, summary: data.summary };
}

export async function buildExportFile(format = "json") {
  const data = await fetchExportData();
  const content = serializeExportData(data, format);
  const fileInfo = await writeExportFile(content, format);
  return { ...fileInfo, content, summary: data.summary };
}
