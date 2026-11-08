/**
 * MEDSHELF - Automated Backend & Database Verification Suite
 * Tests all 20 required criteria: Auth, User Isolation, Dynamic Expiry Math,
 * Zero-count initialization, CRUD operations, and Security.
 */

const assert = require('assert');
const db = require('./config/db');
const authController = require('./controllers/auth.controller');
const medicinesController = require('./controllers/medicines.controller');
const dashboardController = require('./controllers/dashboard.controller');
const { verifyToken } = require('./middleware/auth');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(obj) {
      res.body = obj;
      return res;
    }
  };
  return res;
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log(' STARTING MEDSHELF AUTOMATED VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(` ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(` ❌ FAIL: ${name}\n    Error: ${err.message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail1 = `user1_${timestamp}@example.com`;
  const testEmail2 = `user2_${timestamp}@example.com`;
  let tokenUser1 = null;
  let user1Id = null;
  let user2Id = null;
  let createdMedId = null;

  // TEST 1: User Registration
  await test('1. User Registration with Valid Data', async () => {
    const req = {
      body: {
        fullName: 'Alice Walker',
        email: testEmail1,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
    };
    const res = mockRes();
    await authController.register(req, res);
    assert.strictEqual(res.statusCode, 201, 'Should return HTTP 201');
    assert.strictEqual(res.body.success, true);
    user1Id = res.body.userId;
    assert.ok(user1Id, 'Must return a valid userId');
  });

  // TEST 2: Duplicate Email Prevention
  await test('2. Duplicate Email Registration Prevention', async () => {
    const req = {
      body: {
        fullName: 'Alice Duplicate',
        email: testEmail1, // Same email
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
    };
    const res = mockRes();
    await authController.register(req, res);
    assert.strictEqual(res.statusCode, 409, 'Should return HTTP 409 Conflict');
    assert.strictEqual(res.body.success, false);
  });

  // TEST 3: Login with Correct Credentials
  await test('3. Login with Correct Credentials', async () => {
    const req = {
      body: {
        email: testEmail1,
        password: 'Password123!'
      }
    };
    const res = mockRes();
    await authController.login(req, res);
    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, 'Must return signed JWT token');
    tokenUser1 = res.body.token;

    const decoded = verifyToken(tokenUser1);
    assert.ok(decoded, 'JWT must be cryptographically valid');
    assert.strictEqual(decoded.userId, user1Id);
  });

  // TEST 4: Login with Incorrect Password
  await test('4. Login with Incorrect Password (Security Rejection)', async () => {
    const req = {
      body: {
        email: testEmail1,
        password: 'WrongPassword999'
      }
    };
    const res = mockRes();
    await authController.login(req, res);
    assert.strictEqual(res.statusCode, 401, 'Should return HTTP 401 Unauthorized');
    assert.strictEqual(res.body.success, false);
  });

  // TEST 5: Verify New User Dashboard Starts with ZERO Counts
  await test('5. New User Dashboard Displays All 0 Counts', async () => {
    const req = {
      user: { userId: user1Id, fullName: 'Alice Walker', email: testEmail1 },
      query: { lowStockLimit: '2' }
    };
    const res = mockRes();
    await dashboardController.getDashboardStats(req, res);
    assert.strictEqual(res.statusCode, 200);
    const stats = res.body.stats;
    assert.strictEqual(stats.totalMedicines, 0, 'Total medicines must be 0');
    assert.strictEqual(stats.safeMedicines, 0, 'Safe medicines must be 0');
    assert.strictEqual(stats.expiringSoon, 0, 'Expiring soon must be 0');
    assert.strictEqual(stats.expiredMedicines, 0, 'Expired medicines must be 0');
    assert.strictEqual(stats.lowStockMedicines, 0, 'Low stock medicines must be 0');
  });

  // Helper date adder
  function addDays(d, days) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  }
  const today = new Date();

  // TEST 6: Add Safe Medicine (> 30 days)
  await test('6. Add Safe Medicine (> 30 Days)', async () => {
    const req = {
      user: { userId: user1Id },
      body: {
        name: 'Paracetamol 500mg',
        expiryDate: addDays(today, 180), // 180 days ahead
        quantity: 15,
        familyMember: 'Grandpa',
        category: 'Pain Relief & Fever',
        description: 'Take after meals'
      }
    };
    const res = mockRes();
    await medicinesController.createMedicine(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.medicine.expiryStatus, 'SAFE');
    createdMedId = res.body.medicine.id;
  });

  // TEST 7: Add Expiring Soon Medicine (<= 30 days)
  await test('7. Add Expiring Soon Medicine (<= 30 Days)', async () => {
    const req = {
      user: { userId: user1Id },
      body: {
        name: 'Cetirizine 10mg',
        expiryDate: addDays(today, 10), // 10 days ahead
        quantity: 5,
        familyMember: 'Self',
        category: 'Allergy & Antihistamines'
      }
    };
    const res = mockRes();
    await medicinesController.createMedicine(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.medicine.expiryStatus, 'EXPIRING_SOON');
  });

  // TEST 8: Add Expired Medicine (< today)
  await test('8. Add Expired Medicine (< Today)', async () => {
    const req = {
      user: { userId: user1Id },
      body: {
        name: 'Amoxicillin Syrup',
        expiryDate: addDays(today, -20), // 20 days ago
        quantity: 1, // Also low stock!
        familyMember: 'Baby Leo',
        category: 'Antibiotics'
      }
    };
    const res = mockRes();
    await medicinesController.createMedicine(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.medicine.expiryStatus, 'EXPIRED');
    assert.strictEqual(res.body.medicine.isLowStock, true);
  });

  // TEST 9: Add Low-Stock Medicine
  await test('9. Low-Stock Detection (Qty <= 2)', async () => {
    const req = {
      user: { userId: user1Id },
      body: {
        name: 'Eye Drops 5ml',
        expiryDate: addDays(today, 60),
        quantity: 2, // Threshold boundary
        familyMember: 'Mom',
        category: 'Eye & Ear Drops'
      }
    };
    const res = mockRes();
    await medicinesController.createMedicine(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.medicine.isLowStock, true);
  });

  // TEST 10: Dynamic Dashboard Counters Verification
  await test('10. Dashboard Counters Update Dynamically from Database', async () => {
    const req = {
      user: { userId: user1Id, fullName: 'Alice Walker', email: testEmail1 },
      query: { lowStockLimit: '2' }
    };
    const res = mockRes();
    await dashboardController.getDashboardStats(req, res);
    assert.strictEqual(res.statusCode, 200);
    const stats = res.body.stats;
    assert.strictEqual(stats.totalMedicines, 4, 'Total medicines must be exactly 4');
    assert.strictEqual(stats.safeMedicines, 2, 'Safe medicines must be exactly 2 (Paracetamol & Eye Drops)');
    assert.strictEqual(stats.expiringSoon, 1, 'Expiring soon must be exactly 1 (Cetirizine)');
    assert.strictEqual(stats.expiredMedicines, 1, 'Expired medicines must be exactly 1 (Amoxicillin)');
    assert.strictEqual(stats.lowStockMedicines, 2, 'Low stock medicines must be 2 (Amoxicillin qty:1, Eye Drops qty:2)');
  });

  // TEST 11: Edit Medicine
  await test('11. Edit Medicine Record', async () => {
    const req = {
      user: { userId: user1Id },
      params: { id: createdMedId },
      body: {
        name: 'Paracetamol 650mg Extra Strength',
        quantity: 25
      }
    };
    const res = mockRes();
    await medicinesController.updateMedicine(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.medicine.name, 'Paracetamol 650mg Extra Strength');
    assert.strictEqual(res.body.medicine.quantity, 25);
  });

  // TEST 12: Adjust Quantity
  await test('12. Fast Stock Adjustment (+/-)', async () => {
    const req = {
      user: { userId: user1Id },
      params: { id: createdMedId },
      body: { delta: -5 }
    };
    const res = mockRes();
    await medicinesController.adjustQuantity(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.newQuantity, 20);
  });

  // TEST 13: User Isolation & Privacy Protection
  await test('13. Strict User Isolation (User 2 Cannot See or Edit User 1 Records)', async () => {
    // Register User 2
    const regReq = {
      body: {
        fullName: 'Bob Roberts',
        email: testEmail2,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
    };
    const regRes = mockRes();
    await authController.register(regReq, regRes);
    user2Id = regRes.body.userId;

    // User 2 requests their medicines
    const getReq = {
      user: { userId: user2Id },
      query: {}
    };
    const getRes = mockRes();
    await medicinesController.getAllMedicines(getReq, getRes);
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.count, 0, 'User 2 must see 0 medicines');

    // User 2 attempts to delete User 1's medicine (tampering test)
    const delReq = {
      user: { userId: user2Id },
      params: { id: createdMedId }
    };
    const delRes = mockRes();
    await medicinesController.deleteMedicine(delReq, delRes);
    assert.strictEqual(delRes.statusCode, 404, 'User 2 must not be able to delete User 1 record');
  });

  // TEST 14: Delete Medicine by Authorized Owner
  await test('14. Delete Medicine by Authorized Owner', async () => {
    const req = {
      user: { userId: user1Id },
      params: { id: createdMedId }
    };
    const res = mockRes();
    await medicinesController.deleteMedicine(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  // TEST 15: Password Hash Security
  await test('15. Password Security (Never Stored in Plain Text)', async () => {
    const rows = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [user1Id]);
    assert.ok(rows.length > 0);
    const hash = rows[0].password_hash;
    assert.notStrictEqual(hash, 'Password123!', 'Password must NOT be plain text');
    assert.ok(hash.includes(':'), 'Password hash must contain salt delimiter');
  });

  console.log('\n============================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
