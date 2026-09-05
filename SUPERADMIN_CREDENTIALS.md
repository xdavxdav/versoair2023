# ✅ ADMIN ACCOUNT CREDENTIALS — EXEMPTED & HIGHLIGHTED

## Exempt Accounts (Direct Access — No Forced Password Change)

Both accounts are created with `skipMustChange=true` — you keep your password and go straight to dashboard.

### **1. SUPERADMIN**

| Field             | Value                         |
| ----------------- | ----------------------------- |
| **Email**         | `superadmin@versoair.test` ✅ |
| **Username**      | `superadmin_test`             |
| **Role**          | `superuser` (enterprise tier) |
| **Gate Username** | `joel_007`                    |
| **Password**      | Printed on seed run           |
| **Forced Change** | ❌ NO — Direct access         |

### **2. CEO**

| Field             | Value                         |
| ----------------- | ----------------------------- |
| **Email**         | `ceo@versoair.test` ✅        |
| **Username**      | `ceo_test`                    |
| **Role**          | `superuser` (enterprise tier) |
| **Gate Username** | `ceo_master`                  |
| **Password**      | Printed on seed run           |
| **Forced Change** | ❌ NO — Direct access         |

---

## How to Set Custom Passwords

### **Option 1: Auto-generate (see in console)**

```bash
node scripts/seed-production.cjs
```

Output shows both passwords.

### **Option 2: Set both custom passwords**

```bash
export SEED_SUPERADMIN_PASSWORD="SuperadminPwd123!"
export SEED_CEO_PASSWORD="CEOPwd123!"
node scripts/seed-production.cjs
```

### **Option 3: Set one custom, one auto-generate**

```bash
export SEED_SUPERADMIN_PASSWORD="SuperadminPwd123!"
node scripts/seed-production.cjs
```

CEO password will be auto-generated and printed.

---

## 🔐 Key Differences

| Aspect                              | Regular User              | Superadmin/CEO           |
| ----------------------------------- | ------------------------- | ------------------------ |
| **Password Set**                    | Randomly generated        | Your choice via env var  |
| **Forced Change on Login**          | ✅ YES                    | ❌ NO                    |
| **Direct Dashboard Access**         | ❌ NO (must change first) | ✅ YES (immediate)       |
| **Exempt from Deletion Protection** | No                        | Yes (protected accounts) |

---

## ✅ Fixed Environment Variables

Updated `.env`:

```env
PRODUCTION_URL=https://verso-air-online.onrender.com
APP_PUBLIC_URL=https://verso-air-online.onrender.com
MAIN_APP_URL=https://verso-air-online.onrender.com
MUSIC_APP_URL=https://verso-air-online.onrender.com/music
SIBLING_URL=https://verso-air-online.onrender.com/music
SUPERADMIN_EMAIL=superadmin@versoair.test
ADMIN_EMAIL=superadmin@versoair.test
```

---

## 🚫 What Was Wrong (OLD)

❌ Superadmin forced to change password on every login  
❌ No CEO account option  
❌ No way to self-create & keep password

✅ **NOW:** Both exempt from forced change, direct dashboard access
