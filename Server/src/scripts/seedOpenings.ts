import prisma from "../config/prisma/prisma.js";

/**
 * Seeds the database with sample job openings for testing purposes.
 * Creates a "Bruce Wayne Corp" tenant with sample hiring managers and diverse openings.
 */
async function seedOpenings() {
  try {
    console.log("🌱 Seeding openings data...");

    // Create or get the Bruce Wayne Corp tenant
    const tenant = await prisma.tenants.upsert({
      where: { tenantId: "bruce-wayne-corp-tenant-001" },
      update: {},
      create: {
        tenantId: "bruce-wayne-corp-tenant-001",
        companyName: "Bruce Wayne Corp",
      },
    });

    console.log(`✅ Tenant created/found: ${tenant.companyName}`);

    // Create sample hiring managers
    const hiringManager1 = await prisma.user.upsert({
      where: { externalId: "hm-john-doe-001" },
      update: {},
      create: {
        id: "2d7e192f-e5d9-4d7f-a174-37779987f701",
        externalId: "hm-john-doe-001",
        email: "john.doe@brucewayne.corp",
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        role: "HIRING_MANAGER",
        department: "Technology",
        tenantId: tenant.tenantId,
        provider: "KEYCLOAK",
        profileComplete: true,
      },
    });

    const hiringManager2 = await prisma.user.upsert({
      where: { externalId: "hm-jane-smith-002" },
      update: {},
      create: {
        id: "3e8f293g-f6ea-5e8g-b285-48890098g812",
        externalId: "hm-jane-smith-002",
        email: "jane.smith@brucewayne.corp",
        firstName: "Jane",
        lastName: "Smith",
        username: "janesmith",
        role: "HIRING_MANAGER",
        department: "Design",
        tenantId: tenant.tenantId,
        provider: "KEYCLOAK",
        profileComplete: true,
      },
    });

    const hiringManager3 = await prisma.user.upsert({
      where: { externalId: "hm-alfred-pennyworth-003" },
      update: {},
      create: {
        id: "4f9g304h-g7fb-6f9h-c396-59901109h923",
        externalId: "hm-alfred-pennyworth-003",
        email: "alfred.pennyworth@brucewayne.corp",
        firstName: "Alfred",
        lastName: "Pennyworth",
        username: "alfredpennyworth",
        role: "HIRING_MANAGER",
        department: "Operations",
        tenantId: tenant.tenantId,
        provider: "KEYCLOAK",
        profileComplete: true,
      },
    });

    console.log("✅ Hiring managers created/found");

    // Create an IT Vendor user for testing
    const vendorUser = await prisma.user.upsert({
      where: { externalId: "vendor-user-001" },
      update: {},
      create: {
        id: "5g0h415i-h8gc-7g0i-d407-60012210i034",
        externalId: "vendor-user-001",
        email: "vendor@techpartners.com",
        firstName: "Tech",
        lastName: "Partner",
        username: "techpartner",
        role: "IT_VENDOR",
        department: "Vendor Services",
        tenantId: tenant.tenantId,
        provider: "KEYCLOAK",
        profileComplete: true,
      },
    });

    console.log(`✅ IT Vendor user created/found: ${vendorUser.email}`);

    // Create sample openings with diverse data
    const openingsData = [
      {
        id: "1419a91d-f4b3-43b1-95aa-88324ace1afe",
        tenantId: tenant.tenantId,
        title: "Data Analyst",
        description:
          "Looking for a Data Analyst to help us make sense of our business data and create insightful reports. The ideal candidate will have experience with SQL, Python, and data visualization tools like Tableau or Power BI.",
        location: "On-site (Manchester)",
        contractType: "3 Months",
        hiringManagerId: hiringManager1.id,
        experienceMin: 1,
        experienceMax: 4,
        postedDate: new Date("2025-05-25T16:45:00.000Z"),
        expectedCompletionDate: new Date("2025-08-25T16:45:00.000Z"),
        status: "ON_HOLD" as const,
      },
      {
        id: "215eb1d3-24a1-4587-8a3d-c829ecfd6360",
        tenantId: tenant.tenantId,
        title: "UX Designer",
        description:
          "We are seeking a talented UX Designer to join our growing design team. You will be responsible for creating intuitive user experiences for our enterprise applications. Experience with Figma, user research, and prototyping is essential.",
        location: "Remote",
        contractType: "6 Months",
        hiringManagerId: hiringManager2.id,
        experienceMin: 2,
        experienceMax: 5,
        postedDate: new Date("2025-05-10T11:20:00.000Z"),
        expectedCompletionDate: new Date("2025-11-10T11:20:00.000Z"),
        status: "CLOSED" as const,
      },
      {
        id: "326fc2e4-35b2-5698-9b4e-d930fegf7471",
        tenantId: tenant.tenantId,
        title: "Senior Backend Developer",
        description:
          "Join our backend team to build scalable microservices architecture. We're looking for someone with strong Node.js/TypeScript experience, knowledge of databases (PostgreSQL, MongoDB), and familiarity with cloud services (AWS/GCP).",
        location: "Hybrid (London)",
        contractType: "12 Months",
        hiringManagerId: hiringManager1.id,
        experienceMin: 5,
        experienceMax: 10,
        postedDate: new Date("2025-06-01T09:00:00.000Z"),
        expectedCompletionDate: new Date("2026-06-01T09:00:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "437gd3f5-46c3-6709-ac5f-e041ghgh8582",
        tenantId: tenant.tenantId,
        title: "DevOps Engineer",
        description:
          "We need a DevOps Engineer to maintain and improve our CI/CD pipelines, manage Kubernetes clusters, and ensure system reliability. Experience with Docker, Terraform, and monitoring tools is required.",
        location: "Remote",
        contractType: "6 Months",
        hiringManagerId: hiringManager3.id,
        experienceMin: 3,
        experienceMax: 7,
        postedDate: new Date("2025-06-15T14:30:00.000Z"),
        expectedCompletionDate: new Date("2025-12-15T14:30:00.000Z"),
        status: "OPEN" as const,
      },
      {
        id: "548he4g6-57d4-7810-bd6g-f152hihi9693",
        tenantId: tenant.tenantId,
        title: "Project Manager",
        description:
          "Seeking an experienced Project Manager to lead cross-functional teams on digital transformation initiatives. PMP certification and Agile experience preferred. Strong communication and stakeholder management skills essential.",
        location: "On-site (Birmingham)",
        contractType: "9 Months",
        hiringManagerId: hiringManager2.id,
        experienceMin: 4,
        experienceMax: 8,
        postedDate: new Date("2025-06-20T10:00:00.000Z"),
        expectedCompletionDate: new Date("2026-03-20T10:00:00.000Z"),
        status: "OPEN" as const,
      },
    ];

    // Insert openings using upsert to avoid duplicates
    for (const openingData of openingsData) {
      const opening = await prisma.opening.upsert({
        where: { id: openingData.id },
        update: openingData,
        create: openingData,
      });
      console.log(`✅ Opening created/updated: ${opening.title}`);
    }

    console.log("\n🎉 Seed completed successfully!");
    console.log(`   - Tenant: ${tenant.companyName}`);
    console.log(`   - Hiring Managers: 3`);
    console.log(`   - IT Vendor User: 1`);
    console.log(`   - Openings: ${openingsData.length}`);
  } catch (error) {
    console.error("❌ Error seeding openings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedOpenings();
