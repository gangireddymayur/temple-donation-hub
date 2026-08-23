const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const { sign, authRequired } = require('../lib/auth');
const { rememberLocalLoginPassword } = require('../lib/cloud-session-cache');

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });
    const normalizedEmail = String(email).trim().toLowerCase();

    const [rows] = await db.query(
      'SELECT u.id, u.email, u.password_hash, u.full_name, u.company_id, u.local_mode, u.max_devices, r.role ' +
      'FROM users u LEFT JOIN user_roles r ON r.user_id = u.id ' +
      'WHERE u.email = :email AND u.is_active = 1 LIMIT 1',
      { email: normalizedEmail }
    );
    let user = rows[0];
    const isOffline = process.env.IS_OFFLINE === 'true';
    let passwordMatches = false;
    if (user?.password_hash) {
      try {
        passwordMatches = await bcrypt.compare(password, user.password_hash);
      } catch (e) {
        console.warn(`[local-auth] Invalid local password hash for ${normalizedEmail}; cloud verification will be attempted.`);
      }
    }

    // A correct local password never touches the cloud. A missing user or a
    // password mismatch gets one cloud verification attempt so a password
    // reset made in Plesk can repair the saved local credential.
    const needsBootstrap = !user;
    if ((!user || !passwordMatches) && isOffline) {
      console.log(
        needsBootstrap
          ? `[local-auth] User ${normalizedEmail} has not been bootstrapped. Attempting cloud authentication...`
          : `[local-auth] Local password mismatch for ${normalizedEmail}. Attempting one cloud verification...`
      );
      const cloudUrl = process.env.CLOUD_URL || 'https://happy-shamir.103-69-196-157.plesk.page';
      try {
        const loginRes = await fetch(`${cloudUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          const cloudToken = loginData.token;
          const remoteUser = loginData.user || {};
          const remoteUserId = user?.id || remoteUser.id || require('uuid').v4();
          const remoteCompanyId = user?.company_id || remoteUser.company_id || '00000000-0000-0000-0000-000000000000';
          const localPasswordHash = await bcrypt.hash(password, 10);
          let localDeviceLimit = Number(remoteUser.max_devices || 5);

          if (needsBootstrap) {
            console.log(`[local-auth] Cloud login successful. Fetching initial cloud backup...`);
            const backupRes = await fetch(`${cloudUrl}/api/backup`, {
              headers: { 'Authorization': `Bearer ${cloudToken}` }
            });
            if (backupRes.ok) {
              const backupPayload = await backupRes.json();
              const { restoreBackupPayload } = require('../lib/backup-helper');
              backupPayload.company_id = remoteCompanyId;
              backupPayload.company = {
                ...(backupPayload.company || {}),
                id: remoteCompanyId,
                name: backupPayload.company?.name || remoteUser.company_name || 'SignageHub Local Company',
                contact_email: backupPayload.company?.contact_email || normalizedEmail
              };
              localDeviceLimit = Number(backupPayload.company.max_screens || localDeviceLimit);
              backupPayload.company.max_devices = localDeviceLimit;

              backupPayload.users = backupPayload.users || [];
              backupPayload.users.push({
                id: remoteUserId,
                email: normalizedEmail,
                full_name: remoteUser.full_name || remoteUser.name || '',
                password_hash: localPasswordHash,
                company_id: remoteCompanyId,
                role: remoteUser.role || 'admin',
                local_mode: remoteUser.local_mode || backupPayload.company?.local_mode || 'none',
                max_devices: localDeviceLimit,
                is_active: 1
              });

              console.log(`[local-auth] Restoring initial backup to local database...`);
              await restoreBackupPayload(backupPayload, db);
              const { syncCloudUploads } = require('./storage');
              await syncCloudUploads(backupPayload, cloudUrl);
            } else {
              console.warn(`[local-auth] Cloud backup download failed with status ${backupRes.status}; saving login identity only.`);
            }

            // Guarantee that the locally usable identity exists even when the
            // backup endpoint was unavailable.
            await db.query(
              'INSERT OR IGNORE INTO companies (id, name, contact_email, plan, max_screens, status, local_mode, max_devices) ' +
              'VALUES (:id, :name, :contact_email, :plan, :max_screens, :status, :local_mode, :max_devices)',
              {
                id: remoteCompanyId,
                name: remoteUser.company_name || 'SignageHub Local Company',
                contact_email: normalizedEmail,
                plan: 'pro',
                max_screens: localDeviceLimit,
                status: 'active',
                local_mode: remoteUser.local_mode || 'none',
                max_devices: localDeviceLimit
              }
            );
            await db.query(
              'INSERT OR REPLACE INTO users (id, email, password_hash, full_name, company_id, is_active, local_mode, max_devices) ' +
              'VALUES (:id, :email, :password_hash, :full_name, :company_id, 1, :local_mode, :max_devices)',
              {
                id: remoteUserId,
                email: normalizedEmail,
                password_hash: localPasswordHash,
                full_name: remoteUser.full_name || remoteUser.name || '',
                company_id: remoteCompanyId,
                local_mode: remoteUser.local_mode || 'none',
                max_devices: localDeviceLimit
              }
            );
            await db.query('DELETE FROM user_roles WHERE user_id = :user_id', { user_id: remoteUserId });
            await db.query(
              'INSERT OR REPLACE INTO user_roles (id, user_id, role) VALUES (:id, :user_id, :role)',
              { id: require('uuid').v4(), user_id: remoteUserId, role: remoteUser.role || 'admin' }
            );
          } else {
            // Password recovery is intentionally narrow: no backup, layouts,
            // devices, schedules, or assets are fetched here.
            await db.query(
              'UPDATE users SET password_hash = :password_hash WHERE id = :id',
              { password_hash: localPasswordHash, id: user.id }
            );
            console.log(`[local-auth] Cloud password verified; refreshed the saved local credential only.`);
          }

          const [retryRows] = await db.query(
            'SELECT u.id, u.email, u.password_hash, u.full_name, u.company_id, u.local_mode, u.max_devices, r.role ' +
            'FROM users u LEFT JOIN user_roles r ON r.user_id = u.id ' +
            'WHERE u.email = :email AND u.is_active = 1 LIMIT 1',
            { email: normalizedEmail }
          );
          user = retryRows[0];
          passwordMatches = Boolean(user);
        } else {
          console.warn(`[local-auth] Cloud authentication rejected for ${normalizedEmail} with status ${loginRes.status}.`);
        }
      } catch (e) {
        console.error(`[local-auth] Cloud fallback auth error:`, e.message);
      }
    }

    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    if (!passwordMatches) {
      try {
        passwordMatches = await bcrypt.compare(password, user.password_hash);
      } catch (e) {
        passwordMatches = false;
      }
    }
    if (!passwordMatches) return res.status(401).json({ error: 'invalid credentials' });

    // Local server login restrictions: Only local network admins (role === 'admin', local_mode === 'multi') are permitted to log in.
    if (isOffline) {
      if (user.role !== 'admin' || user.local_mode !== 'multi') {
        return res.status(403).json({ error: 'Only local network admins are permitted to log in on this local server.' });
      }
      // Keep the current sign-in password in process memory only so the
      // authenticated admin can explicitly refresh cloud entitlements without
      // being prompted a second time. It is never written to disk.
      rememberLocalLoginPassword(user.id, password);
    }

    const token = sign({ id: user.id, email: user.email, role: user.role, company_id: user.company_id });
    
    // Write login audit log
    try {
      const { v4: uuidv4 } = require('uuid');
      await db.query(
        'INSERT INTO audit_logs (id, company_id, user_id, user_email, user_name, action, category, details) ' +
        'VALUES (:id, :company_id, :user_id, :user_email, :user_name, :action, :category, :details)',
        {
          id: uuidv4(),
          company_id: user.company_id || null,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.email.split('@')[0],
          action: 'AUTH_LOGIN',
          category: 'auth',
          details: `User successfully signed in to ${user.role || 'user'} console`
        }
      );
    } catch (e) {}

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, company_id: user.company_id, local_mode: user.local_mode, max_devices: user.max_devices },
    });
  } catch (err) {
    console.error('LOGIN_ERROR:', err.stack || err);
    res.status(500).json({ 
      error: 'Login failed. Check backend database connection and logs.',
      details: err.message,
      stack: err.stack
    });
  }
});

async function ensureSchema() {
  try {
    if (db.isSqlite) return;
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NULL,
        user_id VARCHAR(64) NULL,
        user_email VARCHAR(255) NULL,
        user_name VARCHAR(255) NULL,
        action VARCHAR(64) NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'general',
        details TEXT NULL,
        ip_address VARCHAR(64) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [cRel] = await db.query("SHOW COLUMNS FROM companies LIKE 'religion'");
    if (cRel.length === 0) {
      await db.query("ALTER TABLE companies ADD COLUMN religion VARCHAR(64) DEFAULT 'hinduism'");
    }

    const [uRel] = await db.query("SHOW COLUMNS FROM users LIKE 'religion'");
    if (uRel.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN religion VARCHAR(64) DEFAULT 'hinduism'");
    }

    const [cSub] = await db.query("SHOW COLUMNS FROM companies LIKE 'subscription_status'");
    if (cSub.length === 0) {
      await db.query("ALTER TABLE companies ADD COLUMN subscription_status VARCHAR(32) DEFAULT 'trial'");
    }

    const [cTrial] = await db.query("SHOW COLUMNS FROM companies LIKE 'trial_ends_at'");
    if (cTrial.length === 0) {
      await db.query("ALTER TABLE companies ADD COLUMN trial_ends_at DATETIME NULL");
    }

    const [cCust] = await db.query("SHOW COLUMNS FROM companies LIKE 'customer_info_config'");
    if (cCust.length === 0) {
      await db.query("ALTER TABLE companies ADD COLUMN customer_info_config TEXT NULL");
    }
  } catch (err) {
    console.warn('[auth.js] ensureSchema notice:', err.message);
  }
}

// POST /api/auth/register { email, password, full_name, company_name, religion }
router.post('/register', async (req, res) => {
  try {
    await ensureSchema();
    const { email, password, full_name, company_name, religion } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = :email LIMIT 1', { email: normalizedEmail });
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const { v4: uuidv4 } = require('uuid');
    const companyId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const selectedReligion = religion || 'hinduism';
    const compName = (company_name && company_name.trim()) 
      ? company_name.trim() 
      : (full_name ? `${full_name.trim()}'s Organization` : 'My Sacred Center');

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create default company with 7-day free trial
    try {
      await db.query(
        'INSERT INTO companies (id, name, contact_email, plan, max_screens, status, subscription_status, trial_ends_at, religion) ' +
        'VALUES (:id, :name, :contact_email, :plan, :max_screens, :status, :subscription_status, :trial_ends_at, :religion)',
        {
          id: companyId,
          name: compName,
          contact_email: normalizedEmail,
          plan: 'trial',
          max_screens: 2,
          status: 'active',
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt,
          religion: selectedReligion
        }
      );
    } catch (insertErr) {
      // Fallback in case columns are in legacy format
      console.warn('[auth.js] Company insert fallback:', insertErr.message);
      await db.query(
        'INSERT INTO companies (id, name, contact_email, plan, max_screens, status) ' +
        'VALUES (:id, :name, :contact_email, :plan, :max_screens, :status)',
        {
          id: companyId,
          name: compName,
          contact_email: normalizedEmail,
          plan: 'trial',
          max_screens: 2,
          status: 'active'
        }
      );
    }

    // Create user
    await db.query(
      'INSERT INTO users (id, email, password_hash, full_name, company_id, is_active, religion) ' +
      'VALUES (:id, :email, :password_hash, :full_name, :company_id, 1, :religion)',
      {
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: full_name || normalizedEmail.split('@')[0],
        company_id: companyId,
        religion: selectedReligion
      }
    );

    // Assign admin role
    await db.query(
      'INSERT INTO user_roles (id, user_id, role) VALUES (:id, :user_id, :role)',
      {
        id: uuidv4(),
        user_id: userId,
        role: 'admin'
      }
    );

    // Create initial audit log
    try {
      await db.query(
        'INSERT INTO audit_logs (id, company_id, user_id, user_email, user_name, action, category, details) ' +
        'VALUES (:id, :company_id, :user_id, :user_email, :user_name, :action, :category, :details)',
        {
          id: uuidv4(),
          company_id: companyId,
          user_id: userId,
          user_email: normalizedEmail,
          user_name: full_name || normalizedEmail.split('@')[0],
          action: 'AUTH_REGISTER',
          category: 'auth',
          details: `Registered account for "${compName}" under faith: ${selectedReligion}`
        }
      );
    } catch (e) {}

    const token = sign({ id: userId, email: normalizedEmail, role: 'admin', company_id: companyId });
    res.json({
      token,
      user: {
        id: userId,
        email: normalizedEmail,
        full_name: full_name || normalizedEmail.split('@')[0],
        role: 'admin',
        company_id: companyId,
        religion: selectedReligion
      }
    });
  } catch (err) {
    console.error('REGISTER_ERROR:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));

// PATCH /api/auth/password { password }
router.patch('/password', authRequired, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
    const password_hash = await bcrypt.hash(String(password), 10);
    await db.query('UPDATE users SET password_hash = :password_hash WHERE id = :id', { password_hash, id: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error('PASSWORD_ERROR:', err.stack || err);
    res.status(500).json({ error: 'Password update failed' });
  }
});
module.exports = router;
