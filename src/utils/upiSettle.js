import { Linking } from "react-native";

const UPI_ID_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export function normalizeUpiId(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidUpiId(value) {
  return UPI_ID_RE.test(normalizeUpiId(value));
}

export function buildUpiPayQuery({ pa, pn, amount, note }) {
  const params = new URLSearchParams({
    pa: normalizeUpiId(pa),
    pn: String(pn || "Trivense").slice(0, 50),
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: String(note || "Trivense settle").slice(0, 50),
  });
  return params.toString();
}

export function buildWhoOwesMessage({ boardName, settlements, joinUrl }) {
  const lines = [`Who owes whom — ${boardName || "Trivense"}`, ""];
  if (!settlements?.length) {
    lines.push("All settled.");
  } else {
    for (const row of settlements) {
      const amount = Number(row.amount || 0).toFixed(2);
      lines.push(`${row.from} → ${row.to}: ₹${amount}`);
    }
  }
  if (joinUrl) {
    lines.push("", `Join / open board: ${joinUrl}`);
  }
  lines.push("", "Unlimited expenses on Free. No daily cap.");
  return lines.join("\n");
}

export async function openUpiPayment({ pa, pn, amount, note }) {
  const query = buildUpiPayQuery({ pa, pn, amount, note });
  const urls = [
    `upi://pay?${query}`,
    `tez://upi/pay?${query}`,
    `gpay://upi/pay?${query}`,
    `phonepe://pay?${query}`,
  ];

  for (const url of urls) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next scheme
    }
  }

  await Linking.openURL(urls[0]);
  return true;
}
