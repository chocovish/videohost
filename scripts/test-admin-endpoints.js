// Test script for Admin Area APIs
const BASE_URL = process.env.APP_URL || "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING ADMIN AREA TEST SUITE ===");

  // 1. Test Login with invalid password
  console.log("\n1. Testing Login with Invalid Password...");
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password" }),
  });
  console.log("Status:", badLoginRes.status);
  const badLoginData = await badLoginRes.json();
  console.log("Response:", badLoginData);
  if (badLoginRes.status !== 401) {
    throw new Error("Expected 401 for bad password");
  }

  // 2. Test Login with correct password
  console.log("\n2. Testing Login with Correct Password...");
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "admin123" }),
  });
  console.log("Status:", loginRes.status);
  const loginData = await loginRes.json();
  console.log("Response:", loginData);
  if (!loginRes.ok || !loginData.success) {
    throw new Error("Failed to login with correct password");
  }

  // Extract session cookie
  const setCookie = loginRes.headers.get("set-cookie");
  console.log("Set-Cookie:", setCookie ? setCookie.split(";")[0] : "None");
  if (!setCookie || !setCookie.includes("admin_auth_session=")) {
    throw new Error("Expected admin_auth_session cookie in response");
  }
  const cookieHeader = setCookie.split(";")[0];

  // 3. Test Admin Auth Me endpoint
  console.log("\n3. Testing /api/admin/auth/me...");
  const meRes = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meData = await meRes.json();
  console.log("Auth Me:", meData);
  if (!meData.authenticated) {
    throw new Error("Expected authenticated: true");
  }

  // 4. Test Admin Overview
  console.log("\n4. Testing /api/admin/overview...");
  const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Cookie: cookieHeader },
  });
  const overviewData = await overviewRes.json();
  console.log("Overview Stats:", JSON.stringify(overviewData.stats, null, 2));
  if (!overviewData.success || !overviewData.stats) {
    throw new Error("Failed to fetch overview stats");
  }

  // 5. Test Custom Plans (Create, List)
  console.log("\n5. Testing Custom Plans API...");
  const planName = `VIP Custom Test ${Date.now().toString().slice(-4)}`;
  const createPlanRes = await fetch(`${BASE_URL}/api/admin/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      name: planName,
      storageLimitGb: 250,
      minutesLimit: 5000,
      maxResolution: "4k",
      seatLimit: 10,
      priceMonthlyCents: 149900,
      commissionPercent: 3.5,
    }),
  });
  const createPlanData = await createPlanRes.json();
  console.log("Create Plan Status:", createPlanRes.status, createPlanData);
  if (!createPlanRes.ok || !createPlanData.success) {
    throw new Error("Failed to create custom plan");
  }
  const createdPlanId = createPlanData.plan.id;

  // List plans
  const listPlansRes = await fetch(`${BASE_URL}/api/admin/plans`, {
    headers: { Cookie: cookieHeader },
  });
  const listPlansData = await listPlansRes.json();
  console.log(`Total plans count: ${listPlansData.plans.length}`);
  const foundPlan = listPlansData.plans.find((p) => p.id === createdPlanId);
  if (!foundPlan || !foundPlan.isCustom) {
    throw new Error("Created custom plan not found in listing");
  }
  console.log("Found Created Plan:", foundPlan.name, `(${foundPlan.storageLimitGb}GB, ${foundPlan.commissionPercent}% fee)`);

  // 6. Test Users Listing & Block/Unblock
  console.log("\n6. Testing Users API...");
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: cookieHeader },
  });
  const usersData = await usersRes.json();
  console.log(`Total users found: ${usersData.users.length}`);

  if (usersData.users.length > 0) {
    const testUser = usersData.users[0];
    console.log(`Testing block/unblock on user: ${testUser.email} (${testUser.id})`);

    // Block user
    const blockRes = await fetch(`${BASE_URL}/api/admin/users/block`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        userId: testUser.id,
        isBlocked: true,
        reason: "Automated test block",
      }),
    });
    const blockData = await blockRes.json();
    console.log("Block response:", blockData);
    if (!blockData.success || !blockData.user.isBlocked) {
      throw new Error("Failed to block user");
    }

    // Unblock user
    const unblockRes = await fetch(`${BASE_URL}/api/admin/users/block`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        userId: testUser.id,
        isBlocked: false,
      }),
    });
    const unblockData = await unblockRes.json();
    console.log("Unblock response:", unblockData);
    if (!unblockData.success || unblockData.user.isBlocked) {
      throw new Error("Failed to unblock user");
    }
  }

  // 7. Test Organizations Listing & Plan/Storage Modification
  console.log("\n7. Testing Organizations API...");
  const orgsRes = await fetch(`${BASE_URL}/api/admin/organizations`, {
    headers: { Cookie: cookieHeader },
  });
  const orgsData = await orgsRes.json();
  console.log(`Total organizations found: ${orgsData.organizations.length}`);

  if (orgsData.organizations.length > 0) {
    const testOrg = orgsData.organizations[0];
    console.log(`Modifying test org: ${testOrg.name} (${testOrg.id})`);

    // Change org plan to the custom plan and set custom storage limit 500 GB
    const patchOrgRes = await fetch(`${BASE_URL}/api/admin/organizations/${testOrg.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        planId: createdPlanId,
        customStorageLimitGb: 500,
      }),
    });
    const patchOrgData = await patchOrgRes.json();
    console.log("Patch Org Response:", patchOrgData);
    if (!patchOrgData.success || patchOrgData.organization.planId !== createdPlanId) {
      throw new Error("Failed to update organization plan and storage limit");
    }
    console.log("Org updated with custom plan and 500GB storage limit successfully!");
  }

  // 8. Test Payouts API (List & Status Updates)
  console.log("\n8. Testing Payouts API...");
  const payoutsRes = await fetch(`${BASE_URL}/api/admin/payouts`, {
    headers: { Cookie: cookieHeader },
  });
  const payoutsData = await payoutsRes.json();
  console.log(`Total payout requests: ${payoutsData.withdrawals.length}`);

  if (payoutsData.withdrawals.length > 0) {
    const testPayout = payoutsData.withdrawals[0];
    console.log(`Testing status update on payout: ${testPayout.id}`);

    // Mark as PROCESSING
    const procRes = await fetch(`${BASE_URL}/api/admin/payouts/${testPayout.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        status: "PROCESSING",
        adminNotes: "Bank transfer initiated via automated test",
      }),
    });
    const procData = await procRes.json();
    console.log("Processing update:", procData);
    if (!procData.success || procData.withdrawal.status !== "PROCESSING") {
      throw new Error("Failed to mark payout as PROCESSING");
    }

    // Mark as COMPLETED with Transaction Ref
    const compRes = await fetch(`${BASE_URL}/api/admin/payouts/${testPayout.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        status: "COMPLETED",
        transactionId: `UTR_TEST_${Date.now()}`,
        transactionProof: "Bank Wire Confirmation #98210",
        adminNotes: "Settled successfully via NEFT/Wire",
      }),
    });
    const compData = await compRes.json();
    console.log("Completed update:", compData);
    if (!compData.success || compData.withdrawal.status !== "COMPLETED" || !compData.withdrawal.transactionId) {
      throw new Error("Failed to mark payout as COMPLETED with transaction info");
    }
    console.log("Payout marked COMPLETED with UTR:", compData.withdrawal.transactionId);
  }

  // 9. Test Logout
  console.log("\n9. Testing Admin Logout...");
  const logoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  const logoutData = await logoutRes.json();
  console.log("Logout response:", logoutData);

  // Verify unauthorized after logout
  const meAfterLogout = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: { Cookie: "admin_auth_session=" },
  });
  const meAfterLogoutData = await meAfterLogout.json();
  console.log("Auth Me after logout:", meAfterLogoutData);
  if (meAfterLogoutData.authenticated) {
    throw new Error("Should not be authenticated after logout");
  }

  console.log("\n✅ ALL ADMIN AREA API AND WORKFLOW TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
