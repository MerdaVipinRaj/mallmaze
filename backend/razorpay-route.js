"use strict";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const ACCOUNT_RE = /^\d{5,35}$/;

const INDIAN_STATES = new Set([
  "ANDAMAN AND NICOBAR ISLANDS", "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR",
  "CHANDIGARH", "CHHATTISGARH", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DELHI", "GOA",
  "GUJARAT", "HARYANA", "HIMACHAL PRADESH", "JAMMU AND KASHMIR", "JHARKHAND", "KARNATAKA",
  "KERALA", "LADAKH", "LAKSHADWEEP", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", "MEGHALAYA",
  "MIZORAM", "NAGALAND", "ODISHA", "PUDUCHERRY", "PUNJAB", "RAJASTHAN", "SIKKIM", "TAMIL NADU",
  "TELANGANA", "TRIPURA", "UTTAR PRADESH", "UTTARAKHAND", "WEST BENGAL"
]);

function maskAccountNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return `****${digits}`;
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

function normalizeState(value) {
  const state = String(value || "").trim().toUpperCase();
  if (!state) return "TELANGANA";
  if (INDIAN_STATES.has(state)) return state;
  const alias = {
    AP: "ANDHRA PRADESH", TS: "TELANGANA", TG: "TELANGANA", KA: "KARNATAKA",
    TN: "TAMIL NADU", MH: "MAHARASHTRA", DL: "DELHI", UP: "UTTAR PRADESH", WB: "WEST BENGAL"
  };
  return alias[state] || state;
}

function extractPostalCode(address) {
  const match = String(address || "").match(/\b(\d{6})\b/);
  return match ? match[1] : "500001";
}

function extractBankFromBody(body) {
  const bank = body.bank || body.bank_details || {};
  return {
    beneficiary_name: String(bank.beneficiary_name || body.beneficiary_name || body.account_holder_name || body.owner_name || body.owner || "").trim(),
    account_number: String(bank.account_number || body.account_number || "").replace(/\s/g, ""),
    ifsc_code: String(bank.ifsc_code || body.ifsc_code || body.ifsc || "").trim().toUpperCase(),
    account_type: String(bank.account_type || body.account_type || "current").trim().toLowerCase(),
    pan: String(bank.pan || body.pan || body.owner_pan || "").trim().toUpperCase()
  };
}

function validateBankDetails(bank) {
  const errors = [];
  if (!bank.beneficiary_name || bank.beneficiary_name.length < 2) errors.push("Beneficiary name is required");
  if (!ACCOUNT_RE.test(bank.account_number)) errors.push("Valid bank account number is required (5–35 digits)");
  if (!IFSC_RE.test(bank.ifsc_code)) errors.push("Valid IFSC code is required (e.g. HDFC0001234)");
  if (!["current", "savings"].includes(bank.account_type)) errors.push("Account type must be current or savings");
  return errors;
}

function publicBankDetails(store) {
  const bank = store.bank || {};
  return {
    beneficiary_name: bank.beneficiary_name || store.owner_name || "",
    account_number_masked: bank.account_number_masked || maskAccountNumber(bank.account_number),
    ifsc_code: bank.ifsc_code || "",
    account_type: bank.account_type || "",
    pan_last4: bank.pan ? String(bank.pan).slice(-4) : ""
  };
}

function publicStore(store) {
  if (!store) return store;
  const { bank, ...rest } = store;
  return {
    ...rest,
    bank: publicBankDetails(store),
    payout_ready: String(store.payout_status || "") === "active" && Boolean(store.payout_account_ref)
  };
}

async function razorpayRequest(path, { method = "GET", body } = {}, creds) {
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com${path}`, {
    method,
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.error?.description || json.error?.reason || json.message || `Razorpay ${method} ${path} failed`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = json;
    throw error;
  }
  return json;
}

async function createLinkedAccountForStore(store, bank, contact, creds) {
  const address = String(store.address || "Main Road").trim();
  const city = String(store.city || "Hyderabad").trim();
  const state = normalizeState(store.state || city);
  const postal = extractPostalCode(address);
  const payload = {
    email: String(contact.email || `${store.id}@mallmaze.local`).slice(0, 64),
    phone: String(contact.phone || store.phone || "9999999999").replace(/\D/g, "").slice(-10),
    type: "route",
    reference_id: String(store.id).slice(0, 20),
    legal_business_name: String(store.name || "Local Store").slice(0, 200),
    business_type: "proprietorship",
    contact_name: String(store.owner_name || bank.beneficiary_name || "Store Owner").slice(0, 120),
    profile: {
      category: "ecommerce",
      subcategory: "others",
      addresses: {
        registered: {
          street1: address.slice(0, 100) || "Main Road",
          street2: city.slice(0, 100),
          city: city.slice(0, 64),
          state,
          postal_code: postal,
          country: "IN"
        }
      }
    }
  };
  if (bank.pan && /^[A-Z]{5}\d{4}[A-Z]$/i.test(bank.pan)) {
    payload.legal_info = { pan: bank.pan.toUpperCase() };
  }
  return razorpayRequest("/v2/accounts", { method: "POST", body: payload }, creds);
}

async function requestRouteProduct(accountId, creds) {
  return razorpayRequest(`/v2/accounts/${accountId}/products`, {
    method: "POST",
    body: { product_name: "route", tnc_accepted: true }
  }, creds);
}

async function addBankAccountToLinkedAccount(accountId, bank, creds) {
  return razorpayRequest(`/v2/accounts/${accountId}/bank_account`, {
    method: "POST",
    body: {
      ifsc_code: bank.ifsc_code,
      account_number: bank.account_number,
      beneficiary_name: bank.beneficiary_name,
      account_type: bank.account_type === "savings" ? "savings" : "current"
    }
  }, creds);
}

async function provisionStorePayout(store, bankInput, contact, creds, options = {}) {
  const bank = { ...extractBankFromBody({ bank: bankInput, ...bankInput }) };
  const errors = validateBankDetails(bank);
  if (errors.length) {
    const err = new Error(errors.join(". "));
    err.code = "BANK_VALIDATION";
    throw err;
  }

  const now = new Date().toISOString();
  const storedBank = {
    beneficiary_name: bank.beneficiary_name,
    account_number: bank.account_number,
    account_number_masked: maskAccountNumber(bank.account_number),
    ifsc_code: bank.ifsc_code,
    account_type: bank.account_type,
    pan: bank.pan || ""
  };

  if (!creds.keyId || !creds.keySecret) {
    return {
      bank: storedBank,
      payout_account_ref: `acc_mock_${store.id}`,
      payout_status: "active",
      payout_error: "",
      payout_updated_at: now,
      payout_mock: true
    };
  }

  let accountId = String(store.payout_account_ref || "").trim();
  if (!accountId) {
    const account = await createLinkedAccountForStore(store, bank, contact, creds);
    accountId = account.id;
  }

  try {
    await requestRouteProduct(accountId, creds);
  } catch (error) {
    if (!/already/i.test(String(error.message || ""))) throw error;
  }

  await addBankAccountToLinkedAccount(accountId, bank, creds);

  return {
    bank: storedBank,
    payout_account_ref: accountId,
    payout_status: "active",
    payout_error: "",
    payout_updated_at: now,
    payout_mock: false
  };
}

function computeStoreSplits(lineItems, commissionBps) {
  const byStore = new Map();
  for (const line of lineItems || []) {
    const storeId = String(line.store_id || "");
    if (!storeId) continue;
    const gross = Number(line.line_total_paise || 0);
    if (!byStore.has(storeId)) byStore.set(storeId, { store_id: storeId, gross_paise: 0 });
    byStore.get(storeId).gross_paise += gross;
  }
  return [...byStore.values()].map((row) => {
    const commission = Math.round((row.gross_paise * commissionBps) / 10000);
    const net = Math.max(0, row.gross_paise - commission);
    return {
      store_id: row.store_id,
      gross_paise: row.gross_paise,
      commission_paise: commission,
      net_payable_paise: net
    };
  });
}

function assertStoresPayoutReady(db, storeIds) {
  const missing = [];
  const notReady = [];
  for (const storeId of storeIds) {
    const store = (db.stores || []).find((s) => String(s.id) === String(storeId));
    if (!store) {
      missing.push(storeId);
      continue;
    }
    if (String(store.payout_status) !== "active" || !store.payout_account_ref) {
      notReady.push(store.name || storeId);
    }
  }
  if (missing.length) {
    return { ok: false, error: `Unknown store in cart: ${missing.join(", ")}` };
  }
  if (notReady.length) {
    return {
      ok: false,
      error: `These stores are not payout-ready yet (bank verification pending): ${notReady.join(", ")}`
    };
  }
  return { ok: true };
}

function buildOrderTransfers(splits, storeById, holdUntilUnix) {
  return splits
    .filter((split) => split.net_payable_paise > 0)
    .map((split) => {
      const store = storeById.get(String(split.store_id)) || {};
      const transfer = {
        account: store.payout_account_ref,
        amount: split.net_payable_paise,
        currency: "INR",
        notes: {
          store_id: String(split.store_id),
          gross_paise: String(split.gross_paise),
          commission_paise: String(split.commission_paise)
        }
      };
      if (holdUntilUnix) {
        transfer.on_hold = true;
        transfer.on_hold_until = holdUntilUnix;
      }
      return transfer;
    });
}

async function createRazorpayOrderWithTransfers({ amount, receipt, notes, transfers }, creds) {
  if (!creds.keyId || !creds.keySecret) {
    return {
      id: `order_mock_${Date.now()}`,
      amount,
      currency: "INR",
      receipt,
      status: "created",
      mock: true,
      notes,
      transfers: transfers || []
    };
  }
  const payload = { amount, currency: "INR", receipt, notes };
  if (Array.isArray(transfers) && transfers.length) payload.transfers = transfers;
  return razorpayRequest("/v1/orders", { method: "POST", body: payload }, creds);
}

function recordStorePayouts(db, order, splits, meta = {}) {
  const mock = Boolean(meta.mock);
  const transfers = Array.isArray(meta.transfers) ? meta.transfers : [];
  const now = new Date().toISOString();
  db.store_payouts = db.store_payouts || [];

  for (const split of splits || []) {
    const existing = db.store_payouts.find(
      (p) => p.order_id === order.id && String(p.store_id) === String(split.store_id)
    );
    if (existing) continue;

    const transfer = transfers.find((t) => String(t.notes?.store_id) === String(split.store_id));
    db.store_payouts.unshift({
      id: `payout-${Date.now()}-${split.store_id}`,
      store_id: split.store_id,
      order_id: order.id,
      gross_paise: split.gross_paise,
      commission_paise: split.commission_paise,
      net_payable_paise: split.net_payable_paise,
      status: mock ? "settled" : (transfer?.on_hold ? "on_hold" : "processing"),
      razorpay_transfer_id: transfer?.id || "",
      razorpay_account_id: transfer?.account || "",
      hold_until: transfer?.on_hold_until ? new Date(transfer.on_hold_until * 1000).toISOString() : null,
      settled_at: mock ? now : null,
      created_at: now,
      updated_at: now
    });
  }
}

function applyTransferWebhook(db, event) {
  const transfer = event.payload?.transfer?.entity || {};
  const storeId = transfer.notes?.store_id || "";
  const orderId = transfer.notes?.order_id || "";
  if (!storeId && !transfer.id) return;

  db.store_payouts = db.store_payouts || [];
  const payout = db.store_payouts.find((p) => {
    if (transfer.id && p.razorpay_transfer_id === transfer.id) return true;
    if (orderId && storeId) return p.order_id === orderId && String(p.store_id) === String(storeId);
    return false;
  });
  if (!payout) return;

  const eventName = String(event.event || "");
  const now = new Date().toISOString();
  payout.updated_at = now;
  payout.razorpay_transfer_id = transfer.id || payout.razorpay_transfer_id;

  if (["transfer.processed", "transfer.settled"].includes(eventName)) {
    payout.status = "settled";
    payout.settled_at = now;
  } else if (["transfer.failed", "transfer.reversed"].includes(eventName)) {
    payout.status = "failed";
    payout.failure_reason = transfer.error?.description || transfer.status || eventName;
  } else if (eventName === "transfer.pending") {
    payout.status = "processing";
  }
}

function attachBankToStore(store, bankBody, existingStore) {
  const incoming = extractBankFromBody(bankBody);
  const prev = existingStore?.bank || store.bank || {};
  const accountNumber = incoming.account_number || prev.account_number || "";
  const bank = {
    beneficiary_name: incoming.beneficiary_name || prev.beneficiary_name || store.owner_name || "",
    account_number: accountNumber,
    account_number_masked: maskAccountNumber(accountNumber),
    ifsc_code: incoming.ifsc_code || prev.ifsc_code || "",
    account_type: incoming.account_type || prev.account_type || "current",
    pan: incoming.pan || prev.pan || ""
  };
  return bank;
}

module.exports = {
  validateBankDetails,
  extractBankFromBody,
  attachBankToStore,
  maskAccountNumber,
  publicStore,
  publicBankDetails,
  provisionStorePayout,
  computeStoreSplits,
  assertStoresPayoutReady,
  buildOrderTransfers,
  createRazorpayOrderWithTransfers,
  recordStorePayouts,
  applyTransferWebhook,
  normalizeState
};
