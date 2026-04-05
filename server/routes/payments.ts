/**
 * Verso Air Payment Hub — Multi-Method Payment System
 *
 * Priority order:
 *  1. Platform Wallet (internal credits, cashable) — ACTIVE
 *  2. Crypto (BTC, USDT via wallet transfers) — AVAILABLE SOON
 *  3. Mobile Money (Orange Money, MTN MoMo, Wave) — AVAILABLE SOON
 *  4. PayPal REST API — ACTIVE (simple integration)
 *  5. Bank Transfers (manual with admin verification) — ACTIVE (min $500 platform activity)
 *
 * Routes:
 *   GET  /api/payments/methods         — Available payment methods & status
 *   GET  /api/payments/wallet          — Current user's wallet
 *   POST /api/payments/wallet/create   — Initialize wallet
 *   POST /api/payments/wallet/deposit  — Add funds (from external source)
 *   POST /api/payments/wallet/withdraw — Cash out
 *   POST /api/payments/wallet/transfer — Internal transfer (tip, purchase)
 *   GET  /api/payments/transactions    — Transaction history
 *
 *   POST /api/payments/method/add      — Register a payment method
 *   GET  /api/payments/method/list     — List user's payment methods
 *   DELETE /api/payments/method/:id    — Remove a payment method
 *
 *   POST /api/payments/bank-transfer   — Submit bank transfer request
 *   GET  /api/payments/bank-transfers  — List user's bank transfer requests
 *   PUT  /api/payments/bank-transfer/:id/review — Admin approve/reject
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHOD AVAILABILITY MAP
// ═══════════════════════════════════════════════════════════════════════════════
const PAYMENT_METHODS = [
  {
    id: "wallet",
    name: "Platform Wallet",
    nameFr: "Portefeuille Verso",
    description:
      "Internal credits — deposit, earn from royalties, spend on subscriptions & boosts, cash out anytime",
    descriptionFr:
      "Crédits internes — dépôt, gains royalties, dépenses abonnements & boosts, retrait à tout moment",
    icon: "💰",
    status: "active",
    availableSoon: false,
    minDeposit: 1,
    minWithdrawal: 10,
    fees: { deposit: 0, withdrawal: 2.5 }, // 2.5% withdrawal fee
    currencies: ["USD", "EUR", "XOF"],
  },
  {
    id: "paypal",
    name: "PayPal",
    nameFr: "PayPal",
    description: "Pay or receive money via PayPal — simple and secure",
    descriptionFr:
      "Payez ou recevez de l'argent via PayPal — simple et sécurisé",
    icon: "🅿️",
    status: "active",
    availableSoon: false,
    minDeposit: 5,
    minWithdrawal: 25,
    fees: { deposit: 0, withdrawal: 3.5 },
    currencies: ["USD", "EUR", "GBP"],
  },
  {
    id: "crypto",
    name: "Crypto (BTC, USDT)",
    nameFr: "Crypto (BTC, USDT)",
    description:
      "Send and receive Bitcoin or USDT via wallet transfers — decentralized, low fees",
    descriptionFr:
      "Envoyez et recevez du Bitcoin ou USDT par transfert de portefeuille — décentralisé, frais réduits",
    icon: "₿",
    status: "coming_soon",
    availableSoon: true,
    minDeposit: 10,
    minWithdrawal: 20,
    fees: { deposit: 0, withdrawal: 1.0 },
    currencies: ["BTC", "USDT", "ETH"],
    comingSoonMessage:
      "Crypto payments launching Q2 2026 — Bitcoin & USDT via simple wallet transfers",
    comingSoonMessageFr:
      "Paiements crypto lancés Q2 2026 — Bitcoin & USDT via transferts de portefeuille simples",
  },
  {
    id: "mobile_money",
    name: "Mobile Money",
    nameFr: "Mobile Money",
    description:
      "Orange Money, MTN MoMo, Wave, M-Pesa — pay directly from your phone",
    descriptionFr:
      "Orange Money, MTN MoMo, Wave, M-Pesa — payez directement depuis votre téléphone",
    icon: "📱",
    status: "coming_soon",
    availableSoon: true,
    minDeposit: 1,
    minWithdrawal: 5,
    fees: { deposit: 0, withdrawal: 1.5 },
    currencies: ["XOF", "XAF", "GHS", "KES", "NGN"],
    providers: ["orange_money", "mtn_momo", "wave", "mpesa"],
    comingSoonMessage:
      "Mobile Money launching Q3 2026 — Orange Money, MTN, Wave for African markets",
    comingSoonMessageFr:
      "Mobile Money lancé Q3 2026 — Orange Money, MTN, Wave pour les marchés africains",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    nameFr: "Virement Bancaire",
    description:
      "Manual bank transfer with admin verification — for larger amounts ($500+ platform activity required)",
    descriptionFr:
      "Virement bancaire manuel avec vérification admin — pour les gros montants (activité plateforme $500+ requise)",
    icon: "🏦",
    status: "active",
    availableSoon: false,
    minDeposit: 50,
    minWithdrawal: 100,
    fees: { deposit: 0, withdrawal: 0 },
    currencies: ["USD", "EUR", "XOF", "GBP"],
    requiresMinActivity: 500,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GET /methods — Available payment methods & status (reads from platform_settings)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/methods", async (_req: Request, res: Response) => {
  // Try to read dynamic status from platform_settings
  let interacEnabled = false;
  let cryptoEnabled = false;
  let mobileMoneyEnabled = false;
  try {
    const settings = await pool.query(
      `SELECT setting_key, setting_value FROM platform_settings
       WHERE setting_key IN ('payment_interac_enabled', 'payment_crypto_enabled', 'payment_mobile_money_enabled')`,
    );
    for (const row of settings.rows) {
      const val = row.setting_value === true || row.setting_value === "true";
      if (row.setting_key === "payment_interac_enabled") interacEnabled = val;
      if (row.setting_key === "payment_crypto_enabled") cryptoEnabled = val;
      if (row.setting_key === "payment_mobile_money_enabled") mobileMoneyEnabled = val;
    }
  } catch {
    // Ignore — table may not exist yet
  }

  const methods = PAYMENT_METHODS.map((m) => {
    if (m.id === "crypto") return { ...m, status: cryptoEnabled ? "active" : "coming_soon", availableSoon: !cryptoEnabled };
    if (m.id === "mobile_money") return { ...m, status: mobileMoneyEnabled ? "active" : "coming_soon", availableSoon: !mobileMoneyEnabled };
    // Add Interac dynamically
    return m;
  });

  // Inject Interac if enabled
  if (interacEnabled) {
    methods.splice(2, 0, {
      id: "interac",
      name: "Interac e-Transfer",
      nameFr: "Virement Interac",
      description: "Send and receive money via Interac e-Transfer — Canada's leading payment method",
      descriptionFr: "Envoyez et recevez de l'argent via Interac — le mode de paiement #1 au Canada",
      icon: "🍁",
      status: "active",
      availableSoon: false,
      minDeposit: 5,
      minWithdrawal: 10,
      fees: { deposit: 0, withdrawal: 1.5 },
      currencies: ["CAD"],
    } as any);
  }

  res.json({ success: true, methods });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /wallet — Current user's wallet
router.get("/wallet", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);

    const wallet = await pool.query(
      `SELECT * FROM platform_wallets WHERE user_id = $1`,
      [userId],
    );

    if (wallet.rows.length === 0) {
      return res.json({
        success: true,
        wallet: null,
        message: "No wallet yet. Create one with POST /wallet/create",
      });
    }

    // Recent transactions
    const txns = await pool.query(
      `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId],
    );

    res.json({
      success: true,
      wallet: wallet.rows[0],
      recentTransactions: txns.rows,
    });
  } catch (err: any) {
    console.error("[PAYMENTS] Wallet fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch wallet" });
  }
});

// POST /wallet/create — Initialize wallet
router.post(
  "/wallet/create",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { currency } = req.body;

      // Check if wallet already exists
      const existing = await pool.query(
        `SELECT id FROM platform_wallets WHERE user_id = $1`,
        [userId],
      );
      if (existing.rows.length > 0) {
        return res
          .status(409)
          .json({
            success: false,
            error: "Wallet already exists",
            walletId: existing.rows[0].id,
          });
      }

      const result = await pool.query(
        `INSERT INTO platform_wallets (user_id, currency, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
        [userId, currency || "USD"],
      );

      res.status(201).json({
        success: true,
        message: "Wallet created",
        wallet: result.rows[0],
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Wallet create error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to create wallet" });
    }
  },
);

// POST /wallet/deposit — Add funds
router.post(
  "/wallet/deposit",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { amount, paymentMethod, externalReference, description } =
        req.body;

      const depositAmount = parseFloat(amount);
      if (!depositAmount || depositAmount <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Valid positive amount required" });
      }

      // Validate payment method
      const method = paymentMethod || "wallet";
      const methodConfig = PAYMENT_METHODS.find((m) => m.id === method);
      if (!methodConfig) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid payment method" });
      }
      if (methodConfig.availableSoon) {
        return res.status(400).json({
          success: false,
          availableSoon: true,
          message:
            methodConfig.comingSoonMessage ||
            `${methodConfig.name} — AVAILABLE SOON`,
        });
      }
      if (depositAmount < methodConfig.minDeposit) {
        return res.status(400).json({
          success: false,
          error: `Minimum deposit for ${methodConfig.name}: $${methodConfig.minDeposit}`,
        });
      }

      // Get or create wallet
      let wallet = await pool.query(
        `SELECT id, balance FROM platform_wallets WHERE user_id = $1`,
        [userId],
      );
      if (wallet.rows.length === 0) {
        wallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id, balance`,
          [userId],
        );
      }

      const walletId = wallet.rows[0].id;
      const balanceBefore = wallet.rows[0].balance || "0.00";
      const balanceAfter = (parseFloat(balanceBefore) + depositAmount).toFixed(
        2,
      );

      // Credit wallet
      await pool.query(
        `UPDATE platform_wallets SET balance = $1, total_deposited = total_deposited + $2, last_transaction_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
        [balanceAfter, depositAmount, walletId],
      );

      // Record transaction
      const txn = await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, external_reference, description, related_entity_type, status)
       VALUES ($1, $2, 'deposit', $3, $4, $5, $6, $7, $8, 'wallet', $9)
       RETURNING id, created_at`,
        [
          walletId,
          userId,
          depositAmount,
          balanceBefore,
          balanceAfter,
          method,
          externalReference || null,
          description || `Deposit via ${methodConfig.name}`,
          method === "bank" ? "pending" : "completed",
        ],
      );

      res.json({
        success: true,
        message:
          method === "bank"
            ? "Bank transfer deposit submitted — pending admin verification"
            : `$${depositAmount.toFixed(2)} deposited to wallet`,
        transaction: txn.rows[0],
        newBalance: balanceAfter,
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Deposit error:", err);
      res.status(500).json({ success: false, error: "Failed to deposit" });
    }
  },
);

// POST /wallet/withdraw — Cash out
router.post(
  "/wallet/withdraw",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const {
        amount,
        paymentMethod,
        paypalEmail,
        cryptoAddress,
        mobileNumber,
        bankDetails,
      } = req.body;

      const withdrawAmount = parseFloat(amount);
      if (!withdrawAmount || withdrawAmount <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Valid positive amount required" });
      }

      const method = paymentMethod || "paypal";
      const methodConfig = PAYMENT_METHODS.find((m) => m.id === method);
      if (!methodConfig) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid payment method" });
      }
      if (methodConfig.availableSoon) {
        return res.status(400).json({
          success: false,
          availableSoon: true,
          message:
            methodConfig.comingSoonMessage ||
            `${methodConfig.name} — AVAILABLE SOON`,
        });
      }
      if (withdrawAmount < methodConfig.minWithdrawal) {
        return res.status(400).json({
          success: false,
          error: `Minimum withdrawal for ${methodConfig.name}: $${methodConfig.minWithdrawal}`,
        });
      }

      // Check wallet
      const wallet = await pool.query(
        `SELECT id, balance FROM platform_wallets WHERE user_id = $1 AND status = 'active'`,
        [userId],
      );
      if (wallet.rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No active wallet found" });
      }

      const walletId = wallet.rows[0].id;
      const balance = parseFloat(wallet.rows[0].balance);
      const fee = withdrawAmount * (methodConfig.fees.withdrawal / 100);
      const totalDebit = withdrawAmount + fee;

      if (balance < totalDebit) {
        return res.status(402).json({
          success: false,
          error: `Insufficient balance. Need $${totalDebit.toFixed(2)} (including ${methodConfig.fees.withdrawal}% fee), you have $${balance.toFixed(2)}`,
        });
      }

      // Bank transfer minimum activity check
      if (method === "bank") {
        const activity = await pool.query(
          `SELECT COALESCE(total_deposited, 0)::numeric + COALESCE(total_earned, 0)::numeric as total_activity
         FROM platform_wallets WHERE id = $1`,
          [walletId],
        );
        const totalActivity = parseFloat(
          activity.rows[0]?.total_activity || "0",
        );
        if (totalActivity < 500) {
          return res.status(403).json({
            success: false,
            error: `Bank transfers require $500+ platform activity. Your activity: $${totalActivity.toFixed(2)}`,
          });
        }
      }

      const balanceBefore = balance.toFixed(2);
      const balanceAfter = (balance - totalDebit).toFixed(2);

      // Debit wallet
      await pool.query(
        `UPDATE platform_wallets SET balance = $1, total_withdrawn = total_withdrawn + $2, last_transaction_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
        [balanceAfter, withdrawAmount, walletId],
      );

      // Record transaction
      const txn = await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, description, related_entity_type, status, metadata)
       VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6, $7, 'payout', 'pending', $8)
       RETURNING id, created_at`,
        [
          walletId,
          userId,
          withdrawAmount,
          balanceBefore,
          balanceAfter,
          method,
          `Withdrawal via ${methodConfig.name} (fee: $${fee.toFixed(2)})`,
          JSON.stringify({
            fee,
            paypalEmail,
            cryptoAddress,
            mobileNumber,
            bankDetails,
            netAmount: (withdrawAmount - fee).toFixed(2),
          }),
        ],
      );

      res.json({
        success: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} submitted via ${methodConfig.name}. Processing within 3-5 business days.`,
        transaction: txn.rows[0],
        newBalance: balanceAfter,
        fee: fee.toFixed(2),
        netPayout: (withdrawAmount - fee).toFixed(2),
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Withdraw error:", err);
      res.status(500).json({ success: false, error: "Failed to withdraw" });
    }
  },
);

// POST /wallet/transfer — Internal transfer (tip, purchase between users)
router.post(
  "/wallet/transfer",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const senderId = parseInt(req.user!.userId);
      const {
        recipientId,
        amount,
        type,
        description,
        relatedEntityType,
        relatedEntityId,
      } = req.body;

      const txnAmount = parseFloat(amount);
      if (!txnAmount || txnAmount <= 0 || !recipientId) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Valid amount and recipientId required",
          });
      }

      const txnType = type || "transfer";
      if (
        !["transfer", "tip_sent", "boost_purchase", "purchase"].includes(
          txnType,
        )
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid transaction type" });
      }

      // Get sender wallet
      const senderWallet = await pool.query(
        `SELECT id, balance FROM platform_wallets WHERE user_id = $1 AND status = 'active'`,
        [senderId],
      );
      if (
        senderWallet.rows.length === 0 ||
        parseFloat(senderWallet.rows[0].balance) < txnAmount
      ) {
        return res
          .status(402)
          .json({ success: false, error: "Insufficient wallet balance" });
      }

      // Get or create recipient wallet
      let recipientWallet = await pool.query(
        `SELECT id, balance FROM platform_wallets WHERE user_id = $1`,
        [recipientId],
      );
      if (recipientWallet.rows.length === 0) {
        recipientWallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id, balance`,
          [recipientId],
        );
      }

      const sWallet = senderWallet.rows[0];
      const rWallet = recipientWallet.rows[0];

      const sBalanceBefore = sWallet.balance;
      const sBalanceAfter = (parseFloat(sBalanceBefore) - txnAmount).toFixed(2);
      const rBalanceBefore = rWallet.balance;
      const rBalanceAfter = (parseFloat(rBalanceBefore) + txnAmount).toFixed(2);

      // Debit sender
      await pool.query(
        `UPDATE platform_wallets SET balance = $1, total_spent = total_spent + $2, last_transaction_at = NOW() WHERE id = $3`,
        [sBalanceAfter, txnAmount, sWallet.id],
      );
      // Credit recipient
      await pool.query(
        `UPDATE platform_wallets SET balance = $1, total_earned = total_earned + $2, last_transaction_at = NOW() WHERE id = $3`,
        [rBalanceAfter, txnAmount, rWallet.id],
      );

      // Record both sides
      await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, description, related_entity_type, related_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'wallet', $7, $8, $9, 'completed'),
              ($10, $11, $12, $4, $13, $14, 'wallet', $15, $8, $9, 'completed')`,
        [
          sWallet.id,
          senderId,
          txnType,
          txnAmount,
          sBalanceBefore,
          sBalanceAfter,
          description || `Sent $${txnAmount.toFixed(2)}`,
          relatedEntityType || null,
          relatedEntityId || null,
          rWallet.id,
          recipientId,
          txnType === "tip_sent" ? "tip_received" : "transfer",
          rBalanceBefore,
          rBalanceAfter,
          description || `Received $${txnAmount.toFixed(2)}`,
        ],
      );

      res.json({
        success: true,
        message: `$${txnAmount.toFixed(2)} transferred`,
        senderBalance: sBalanceAfter,
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Transfer error:", err);
      res.status(500).json({ success: false, error: "Failed to transfer" });
    }
  },
);

// GET /transactions — Transaction history
router.get(
  "/transactions",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const {
        type,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit) || 20);
      const offset = (pageNum - 1) * limitNum;

      let where = "WHERE wt.user_id = $1";
      const params: any[] = [userId];
      if (type) {
        where += ` AND wt.type = $2`;
        params.push(type);
      }

      const count = await pool.query(
        `SELECT COUNT(*) FROM wallet_transactions wt ${where}`,
        params,
      );

      params.push(limitNum, offset);
      const result = await pool.query(
        `SELECT wt.* FROM wallet_transactions wt ${where}
       ORDER BY wt.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      res.json({
        success: true,
        transactions: result.rows,
        total: parseInt(count.rows[0].count),
        page: pageNum,
        totalPages: Math.ceil(parseInt(count.rows[0].count) / limitNum),
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Transactions error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch transactions" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS — User-registered instruments
// ═══════════════════════════════════════════════════════════════════════════════

// POST /method/add — Register a payment method
router.post(
  "/method/add",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const {
        method,
        label,
        isDefault,
        paypalEmail,
        cryptoType,
        cryptoWalletAddress,
        cryptoNetwork,
        mobileProvider,
        mobileNumber,
        mobileCountryCode,
        bankName,
        bankAccountNumber,
        bankRoutingNumber,
        bankSwiftCode,
        bankIban,
        bankCountry,
        bankHolderName,
      } = req.body;

      if (
        !method ||
        !["wallet", "paypal", "crypto", "mobile_money", "bank"].includes(method)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid method. Choose: wallet, paypal, crypto, mobile_money, bank",
          });
      }

      // Check if method is coming soon
      const methodConfig = PAYMENT_METHODS.find((m) => m.id === method);
      const availableSoon = methodConfig?.availableSoon || false;

      // If setting as default, unset other defaults
      if (isDefault) {
        await pool.query(
          `UPDATE user_payment_methods SET is_default = false WHERE user_id = $1`,
          [userId],
        );
      }

      const result = await pool.query(
        `INSERT INTO user_payment_methods (
         user_id, method, label, is_default, status, available_soon,
         paypal_email,
         crypto_type, crypto_wallet_address, crypto_network,
         mobile_provider, mobile_number, mobile_country_code,
         bank_name, bank_account_number, bank_routing_number, bank_swift_code, bank_iban, bank_country, bank_holder_name,
         verified
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id, method, label, status, available_soon, created_at`,
        [
          userId,
          method,
          label || `My ${methodConfig?.name}`,
          isDefault || false,
          availableSoon ? "coming_soon" : "active",
          availableSoon,
          paypalEmail || null,
          cryptoType || null,
          cryptoWalletAddress || null,
          cryptoNetwork || null,
          mobileProvider || null,
          mobileNumber || null,
          mobileCountryCode || null,
          bankName || null,
          bankAccountNumber || null,
          bankRoutingNumber || null,
          bankSwiftCode || null,
          bankIban || null,
          bankCountry || null,
          bankHolderName || null,
          false,
        ],
      );

      res.status(201).json({
        success: true,
        message: availableSoon
          ? `${methodConfig?.name} registered — will be available when the service launches`
          : `Payment method added: ${label || methodConfig?.name}`,
        paymentMethod: result.rows[0],
        availableSoon,
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Add method error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to add payment method" });
    }
  },
);

// GET /method/list — List user's payment methods
router.get(
  "/method/list",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);

      const result = await pool.query(
        `SELECT id, method, label, is_default, status, available_soon, verified, created_at
       FROM user_payment_methods WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
        [userId],
      );

      res.json({ success: true, methods: result.rows });
    } catch (err: any) {
      console.error("[PAYMENTS] List methods error:", err);
      res.status(500).json({ success: false, error: "Failed to list methods" });
    }
  },
);

// DELETE /method/:id — Remove a payment method
router.delete(
  "/method/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const methodId = parseInt(req.params.id);

      const result = await pool.query(
        `DELETE FROM user_payment_methods WHERE id = $1 AND user_id = $2 RETURNING id`,
        [methodId, userId],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Payment method not found" });
      }

      res.json({ success: true, message: "Payment method removed" });
    } catch (err: any) {
      console.error("[PAYMENTS] Delete method error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to remove method" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// BANK TRANSFER REQUESTS (Manual with admin verification)
// ═══════════════════════════════════════════════════════════════════════════════

// POST /bank-transfer — Submit request
router.post(
  "/bank-transfer",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { direction, amount, currency, bankReference, proofImageUrl } =
        req.body;

      if (!direction || !["deposit", "withdrawal"].includes(direction)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Direction must be 'deposit' or 'withdrawal'",
          });
      }

      const txnAmount = parseFloat(amount);
      if (!txnAmount || txnAmount <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Valid positive amount required" });
      }

      // Ensure wallet exists
      let wallet = await pool.query(
        `SELECT id FROM platform_wallets WHERE user_id = $1`,
        [userId],
      );
      if (wallet.rows.length === 0) {
        wallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id`,
          [userId],
        );
      }

      const result = await pool.query(
        `INSERT INTO bank_transfer_requests (user_id, wallet_id, direction, amount, currency, bank_reference, proof_image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id, status, created_at`,
        [
          userId,
          wallet.rows[0].id,
          direction,
          txnAmount,
          currency || "USD",
          bankReference || null,
          proofImageUrl || null,
        ],
      );

      res.status(201).json({
        success: true,
        message:
          "Bank transfer request submitted. Admin will review within 1-3 business days.",
        request: result.rows[0],
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Bank transfer error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to submit bank transfer" });
    }
  },
);

// GET /bank-transfers — List user's requests
router.get(
  "/bank-transfers",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const result = await pool.query(
        `SELECT * FROM bank_transfer_requests WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      res.json({ success: true, requests: result.rows });
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch transfers" });
    }
  },
);

// PUT /bank-transfer/:id/review — Admin approve/reject
router.put(
  "/bank-transfer/:id/review",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const reviewerId = parseInt(req.user!.userId);
      const { action, reviewNotes } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Action must be 'approve' or 'reject'",
          });
      }

      const request = await pool.query(
        `SELECT * FROM bank_transfer_requests WHERE id = $1 AND status = 'pending'`,
        [requestId],
      );
      if (request.rows.length === 0) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Request not found or already reviewed",
          });
      }

      const req_ = request.rows[0];

      if (action === "approve") {
        // Credit/debit wallet
        if (req_.direction === "deposit") {
          await pool.query(
            `UPDATE platform_wallets SET balance = balance + $1, total_deposited = total_deposited + $1, last_transaction_at = NOW()
           WHERE id = $2`,
            [req_.amount, req_.wallet_id],
          );
        } else {
          const wallet = await pool.query(
            `SELECT balance FROM platform_wallets WHERE id = $1`,
            [req_.wallet_id],
          );
          if (
            parseFloat(wallet.rows[0]?.balance || "0") < parseFloat(req_.amount)
          ) {
            return res
              .status(400)
              .json({
                success: false,
                error: "Insufficient wallet balance for withdrawal",
              });
          }
          await pool.query(
            `UPDATE platform_wallets SET balance = balance - $1, total_withdrawn = total_withdrawn + $1, last_transaction_at = NOW()
           WHERE id = $2`,
            [req_.amount, req_.wallet_id],
          );
        }

        // Record transaction
        const wallet = await pool.query(
          `SELECT balance FROM platform_wallets WHERE id = $1`,
          [req_.wallet_id],
        );
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'bank', $7, 'completed')`,
          [
            req_.wallet_id,
            req_.user_id,
            req_.direction === "deposit" ? "deposit" : "withdrawal",
            req_.amount,
            (
              parseFloat(wallet.rows[0].balance) -
              (req_.direction === "deposit"
                ? parseFloat(req_.amount)
                : -parseFloat(req_.amount))
            ).toFixed(2),
            wallet.rows[0].balance,
            `Bank transfer ${req_.direction} approved — ref: ${req_.bank_reference || "N/A"}`,
          ],
        );
      }

      // Update request status
      await pool.query(
        `UPDATE bank_transfer_requests SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
       WHERE id = $4`,
        [
          action === "approve" ? "approved" : "rejected",
          reviewerId,
          reviewNotes || null,
          requestId,
        ],
      );

      res.json({
        success: true,
        message: `Bank transfer ${action === "approve" ? "approved" : "rejected"}`,
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Review error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to review transfer" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// INTERAC e-TRANSFER (Canada) — Request-based flow
// Users submit email-linked Interac deposit/withdrawal requests.
// Admin reviews and confirms via the dashboard.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payments/interac/request
 * Submit an Interac e-Transfer request (deposit or withdrawal).
 */
router.post(
  "/interac/request",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { direction, amount, interacEmail, securityQuestion, securityAnswer } = req.body;

      if (!direction || !["deposit", "withdrawal"].includes(direction)) {
        return res.status(400).json({ success: false, error: "Direction must be 'deposit' or 'withdrawal'" });
      }
      const txnAmount = parseFloat(amount);
      if (!txnAmount || txnAmount < 5 || txnAmount > 3000) {
        return res.status(400).json({ success: false, error: "Amount must be between $5 and $3,000 CAD" });
      }
      if (!interacEmail) {
        return res.status(400).json({ success: false, error: "Interac-linked email is required" });
      }

      // Check if Interac is enabled
      const setting = await pool.query(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_interac_enabled'`,
      );
      if (setting.rows[0]?.setting_value === "false" || setting.rows[0]?.setting_value === false) {
        return res.status(403).json({ success: false, error: "Interac e-Transfer is currently disabled" });
      }

      // Ensure wallet exists
      let wallet = await pool.query(`SELECT id FROM platform_wallets WHERE user_id = $1`, [userId]);
      if (wallet.rows.length === 0) {
        wallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id`, [userId],
        );
      }

      const result = await pool.query(
        `INSERT INTO bank_transfer_requests (user_id, wallet_id, direction, amount, currency, bank_reference, proof_image_url, status)
         VALUES ($1, $2, $3, $4, 'CAD', $5, $6, 'pending')
         RETURNING id, status, created_at`,
        [
          userId,
          wallet.rows[0].id,
          direction,
          txnAmount,
          `interac:${interacEmail}`,
          securityQuestion ? JSON.stringify({ q: securityQuestion, a: securityAnswer }) : null,
        ],
      );

      res.status(201).json({
        success: true,
        message: direction === "deposit"
          ? `Send $${txnAmount} CAD via Interac e-Transfer to our email. Admin will credit your wallet within 24h.`
          : `Withdrawal request submitted. $${txnAmount} CAD will be sent to ${interacEmail} within 1-3 business days.`,
        request: result.rows[0],
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Interac request error:", err);
      res.status(500).json({ success: false, error: "Failed to process Interac request" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO WALLET — Display wallet addresses for manual transfers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payments/crypto/addresses
 * Returns the platform's crypto wallet addresses for deposits.
 * Addresses are stored in platform_settings.
 */
router.get("/crypto/addresses", requireAuth(), async (_req: Request, res: Response) => {
  try {
    const enabled = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_crypto_enabled'`,
    );
    if (enabled.rows[0]?.setting_value === "false" || enabled.rows[0]?.setting_value === false) {
      return res.json({
        success: true,
        enabled: false,
        message: "Crypto payments coming soon — Q2 2026",
        addresses: [],
      });
    }

    const addresses = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'crypto_wallet_addresses'`,
    );
    const wallets = addresses.rows[0]?.setting_value || {
      BTC: null,
      ETH: null,
      USDT: null,
    };

    res.json({ success: true, enabled: true, addresses: wallets });
  } catch (err: any) {
    console.error("[PAYMENTS] Crypto addresses error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch crypto addresses" });
  }
});

/**
 * POST /api/payments/crypto/deposit
 * Submit a crypto deposit notification (user sends crypto, then notifies platform).
 */
router.post(
  "/crypto/deposit",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { coin, txHash, amount } = req.body;

      if (!coin || !["BTC", "ETH", "USDT"].includes(coin)) {
        return res.status(400).json({ success: false, error: "Coin must be BTC, ETH, or USDT" });
      }
      if (!txHash) {
        return res.status(400).json({ success: false, error: "Transaction hash is required" });
      }
      const txnAmount = parseFloat(amount);
      if (!txnAmount || txnAmount <= 0) {
        return res.status(400).json({ success: false, error: "Valid amount required" });
      }

      let wallet = await pool.query(`SELECT id FROM platform_wallets WHERE user_id = $1`, [userId]);
      if (wallet.rows.length === 0) {
        wallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id`, [userId],
        );
      }

      const result = await pool.query(
        `INSERT INTO bank_transfer_requests (user_id, wallet_id, direction, amount, currency, bank_reference, status)
         VALUES ($1, $2, 'deposit', $3, $4, $5, 'pending')
         RETURNING id, status, created_at`,
        [userId, wallet.rows[0].id, txnAmount, coin, `crypto:${txHash}`],
      );

      res.status(201).json({
        success: true,
        message: `Crypto deposit notification received. Admin will verify the ${coin} transaction and credit your wallet.`,
        request: result.rows[0],
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Crypto deposit error:", err);
      res.status(500).json({ success: false, error: "Failed to submit crypto deposit" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE MONEY — Orange Money, MTN MoMo, Wave, M-Pesa
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payments/mobile-money/providers
 * Returns available Mobile Money providers and their status.
 */
router.get("/mobile-money/providers", async (_req: Request, res: Response) => {
  try {
    const enabled = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_mobile_money_enabled'`,
    );
    if (enabled.rows[0]?.setting_value === "false" || enabled.rows[0]?.setting_value === false) {
      return res.json({
        success: true,
        enabled: false,
        message: "Mobile Money coming soon — Q3 2026 for African markets",
        providers: [],
      });
    }

    const configResult = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'mobile_money_config'`,
    );
    const config = configResult.rows[0]?.setting_value || {};

    const providers = [
      { id: "orange_money", name: "Orange Money", countries: ["CI", "SN", "ML", "CM", "BF"], enabled: config.orange_money !== false },
      { id: "mtn_momo", name: "MTN MoMo", countries: ["GH", "UG", "CM", "CI", "RW"], enabled: config.mtn_momo !== false },
      { id: "wave", name: "Wave", countries: ["SN", "CI", "ML", "BF", "GM"], enabled: config.wave !== false },
      { id: "mpesa", name: "M-Pesa", countries: ["KE", "TZ", "CD", "MZ", "GH"], enabled: config.mpesa !== false },
    ];

    res.json({ success: true, enabled: true, providers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Failed to fetch Mobile Money providers" });
  }
});

/**
 * POST /api/payments/mobile-money/request
 * Submit a Mobile Money payment request (deposit or withdrawal).
 */
router.post(
  "/mobile-money/request",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { direction, amount, provider, phoneNumber, currency } = req.body;

      if (!direction || !["deposit", "withdrawal"].includes(direction)) {
        return res.status(400).json({ success: false, error: "Direction must be 'deposit' or 'withdrawal'" });
      }
      if (!provider || !["orange_money", "mtn_momo", "wave", "mpesa"].includes(provider)) {
        return res.status(400).json({ success: false, error: "Invalid Mobile Money provider" });
      }
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "Phone number is required" });
      }

      const txnAmount = parseFloat(amount);
      if (!txnAmount || txnAmount < 1) {
        return res.status(400).json({ success: false, error: "Minimum amount is 1" });
      }

      const enabled = await pool.query(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_mobile_money_enabled'`,
      );
      if (enabled.rows[0]?.setting_value === "false" || enabled.rows[0]?.setting_value === false) {
        return res.status(403).json({ success: false, error: "Mobile Money is not yet available" });
      }

      let wallet = await pool.query(`SELECT id FROM platform_wallets WHERE user_id = $1`, [userId]);
      if (wallet.rows.length === 0) {
        wallet = await pool.query(
          `INSERT INTO platform_wallets (user_id, status) VALUES ($1, 'active') RETURNING id`, [userId],
        );
      }

      const result = await pool.query(
        `INSERT INTO bank_transfer_requests (user_id, wallet_id, direction, amount, currency, bank_reference, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id, status, created_at`,
        [userId, wallet.rows[0].id, direction, txnAmount, currency || "XOF", `${provider}:${phoneNumber}`],
      );

      res.status(201).json({
        success: true,
        message: direction === "deposit"
          ? `Send ${txnAmount} ${currency || "XOF"} via ${provider.replace("_", " ")} to complete your deposit. Admin will credit your wallet.`
          : `Withdrawal request submitted. Funds will be sent to ${phoneNumber} via ${provider.replace("_", " ")}.`,
        request: result.rows[0],
      });
    } catch (err: any) {
      console.error("[PAYMENTS] Mobile Money error:", err);
      res.status(500).json({ success: false, error: "Failed to process Mobile Money request" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PAYMENT SETTINGS — Configure payment methods via platform_settings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payments/admin/settings
 * Returns all payment-related platform_settings for the admin dashboard.
 */
router.get(
  "/admin/settings",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, setting_key, setting_value, category, description, updated_at
         FROM platform_settings
         WHERE category IN ('payment', 'session', 'crypto', 'mobile_money', 'interac', 'general')
         ORDER BY category, setting_key`,
      );
      res.json({ success: true, settings: result.rows });
    } catch (err: any) {
      console.error("[PAYMENTS] Admin settings fetch error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch settings" });
    }
  },
);

/**
 * PUT /api/payments/admin/settings/:key
 * Update a single platform setting.
 */
router.put(
  "/admin/settings/:key",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const settingKey = req.params.key;
      const { value, description } = req.body;
      const adminId = parseInt(req.user!.userId);

      if (value === undefined) {
        return res.status(400).json({ success: false, error: "Value is required" });
      }

      // Upsert the setting
      const result = await pool.query(
        `INSERT INTO platform_settings (setting_key, setting_value, description, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = $2, description = COALESCE($3, platform_settings.description), updated_by = $4, updated_at = NOW()
         RETURNING id, setting_key, setting_value, category, description, updated_at`,
        [settingKey, JSON.stringify(value), description || null, adminId],
      );

      res.json({ success: true, setting: result.rows[0] });
    } catch (err: any) {
      console.error("[PAYMENTS] Admin settings update error:", err);
      res.status(500).json({ success: false, error: "Failed to update setting" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS TIER UPGRADE — Pay from wallet to upgrade business tier
// ═══════════════════════════════════════════════════════════════════════════════

const TIER_PRICES: Record<string, number> = {
  premium: 29.99,    // $29.99/month
  enterprise: 99.99, // $99.99/month
};

const TIER_DURATION_DAYS = 30; // 30-day billing cycle

/**
 * GET /api/payments/tier/prices
 * Returns tier pricing information.
 */
router.get("/tier/prices", (_req: Request, res: Response) => {
  res.json({
    success: true,
    tiers: [
      {
        id: "free",
        name: "Free",
        price: 0,
        features: [
          "Basic listing",
          "Category placement",
          "Contact info display",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        price: TIER_PRICES.premium,
        duration: `${TIER_DURATION_DAYS} days`,
        features: [
          "Everything in Free",
          "Vérifié badge",
          "Priority in search results",
          "Analytics dashboard",
          "Response time tracking",
          "Photo gallery (up to 20)",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: TIER_PRICES.enterprise,
        duration: `${TIER_DURATION_DAYS} days`,
        features: [
          "Everything in Premium",
          "Top placement in all searches",
          "Dedicated account manager",
          "Custom branding",
          "API access",
          "Unlimited media uploads",
          "Multi-location support",
          "Priority customer support",
        ],
      },
    ],
  });
});

/**
 * POST /api/payments/tier/upgrade
 * Upgrade a business from wallet balance.
 * Body: { businessId, tier: 'premium' | 'enterprise' }
 */
router.post(
  "/tier/upgrade",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { businessId, tier } = req.body;

      if (!businessId || !tier) {
        return res.status(400).json({ success: false, error: "businessId and tier are required" });
      }
      if (!TIER_PRICES[tier]) {
        return res.status(400).json({ success: false, error: "Tier must be 'premium' or 'enterprise'" });
      }

      // Verify business belongs to user
      const biz = await pool.query(
        `SELECT id, name, tier as current_tier, tier_expires_at FROM businesses WHERE id = $1 AND user_id = $2`,
        [businessId, userId],
      );
      if (biz.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Business not found or not owned by you" });
      }

      const price = TIER_PRICES[tier];

      // Check wallet balance
      const wallet = await pool.query(
        `SELECT id, balance FROM platform_wallets WHERE user_id = $1`,
        [userId],
      );
      if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < price) {
        return res.status(400).json({
          success: false,
          error: `Insufficient wallet balance. Need $${price}, have $${wallet.rows[0]?.balance || "0.00"}`,
        });
      }

      const walletId = wallet.rows[0].id;
      const balanceBefore = parseFloat(wallet.rows[0].balance);
      const balanceAfter = balanceBefore - price;
      const expiresAt = new Date(Date.now() + TIER_DURATION_DAYS * 24 * 60 * 60 * 1000);

      // Transaction: debit wallet + upgrade tier
      await pool.query("BEGIN");

      await pool.query(
        `UPDATE platform_wallets SET balance = $1, total_spent = CAST(COALESCE(total_spent, '0') AS NUMERIC) + $2, last_transaction_at = NOW() WHERE id = $3`,
        [balanceAfter.toFixed(2), price.toFixed(2), walletId],
      );

      await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, description, status)
         VALUES ($1, $2, 'purchase', $3, $4, $5, 'wallet', $6, 'completed')`,
        [
          walletId,
          userId,
          price.toFixed(2),
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          `Business tier upgrade to ${tier}: ${biz.rows[0].name}`,
        ],
      );

      await pool.query(
        `UPDATE businesses SET tier = $1, tier_expires_at = $2 WHERE id = $3`,
        [tier, expiresAt, businessId],
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: `Business "${biz.rows[0].name}" upgraded to ${tier}!`,
        tier,
        expiresAt: expiresAt.toISOString(),
        walletBalance: balanceAfter,
      });
    } catch (err: any) {
      await pool.query("ROLLBACK").catch(() => {});
      console.error("[PAYMENTS] Tier upgrade error:", err);
      res.status(500).json({ success: false, error: "Failed to upgrade tier" });
    }
  },
);

export default router;
