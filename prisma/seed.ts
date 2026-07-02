import { JobStatus, PrismaClient } from "@prisma/client";
import { DEFAULT_PIPELINE_STAGES } from "../src/lib/constants";

const prisma = new PrismaClient();

const MASTER_ADMIN_EMAIL = "evgeniy.sabadash@snoopgame.net";

async function seedMasterAdmin() {
  console.log("Seeding master admin user...");

  await prisma.user.upsert({
    where: { email: MASTER_ADMIN_EMAIL },
    update: {
      name: "Yevhenii Sabadash",
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: MASTER_ADMIN_EMAIL,
      name: "Yevhenii Sabadash",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
}

async function clearMockRecruitingData() {
  await prisma.emailMessage.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.candidateNote.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.job.deleteMany();
}

async function createJobWithPipeline(
  title: string,
  description: string,
  status: JobStatus,
) {
  return prisma.job.create({
    data: {
      title,
      description,
      status,
      stages: {
        create: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          name: stage.name,
          orderInPipeline: stage.orderInPipeline,
        })),
      },
    },
    include: {
      stages: {
        orderBy: { orderInPipeline: "asc" },
      },
    },
  });
}

async function seedMockRecruitingData() {
  console.log("Seeding mock jobs, stages, and candidates...");

  const seniorEngineer = await createJobWithPipeline(
    "Senior Full-Stack Engineer",
    "We are looking for an experienced full-stack developer to help build our next-generation HRIS platform. You will work with Next.js, Node.js, and PostgreSQL.",
    JobStatus.OPEN,
  );

  const productDesigner = await createJobWithPipeline(
    "Product Designer",
    "Join our design team to craft intuitive recruiting experiences. Experience with design systems and user research is a plus.",
    JobStatus.OPEN,
  );

  const draftJob = await createJobWithPipeline(
    "DevOps Engineer",
    "Draft requisition — not yet published.",
    JobStatus.DRAFT,
  );

  const seStages = seniorEngineer.stages;
  const pdStages = productDesigner.stages;

  const candidates = await prisma.candidate.createMany({
    data: [
      {
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
        phone: "+1 555-0101",
        resumeLink: "https://example.com/resumes/alex-morgan.pdf",
        jobId: seniorEngineer.id,
        stageId: seStages[0].id,
      },
      {
        name: "Jordan Lee",
        email: "jordan.lee@example.com",
        phone: "+1 555-0102",
        resumeLink: "https://example.com/resumes/jordan-lee.pdf",
        jobId: seniorEngineer.id,
        stageId: seStages[1].id,
      },
      {
        name: "Sam Patel",
        email: "sam.patel@example.com",
        phone: "+1 555-0103",
        resumeLink: "https://example.com/resumes/sam-patel.pdf",
        jobId: seniorEngineer.id,
        stageId: seStages[2].id,
      },
      {
        name: "Taylor Chen",
        email: "taylor.chen@example.com",
        phone: "+1 555-0104",
        resumeLink: "https://example.com/resumes/taylor-chen.pdf",
        jobId: seniorEngineer.id,
        stageId: seStages[3].id,
      },
      {
        name: "Riley Brooks",
        email: "riley.brooks@example.com",
        phone: "+1 555-0105",
        resumeLink: "https://example.com/resumes/riley-brooks.pdf",
        jobId: seniorEngineer.id,
        stageId: seStages[4].id,
      },
      {
        name: "Casey Nguyen",
        email: "casey.nguyen@example.com",
        phone: "+1 555-0201",
        resumeLink: "https://example.com/resumes/casey-nguyen.pdf",
        jobId: productDesigner.id,
        stageId: pdStages[0].id,
      },
      {
        name: "Morgan Wright",
        email: "morgan.wright@example.com",
        phone: "+1 555-0202",
        resumeLink: "https://example.com/resumes/morgan-wright.pdf",
        jobId: productDesigner.id,
        stageId: pdStages[1].id,
      },
      {
        name: "Jamie Ortiz",
        email: "jamie.ortiz@example.com",
        phone: "+1 555-0203",
        resumeLink: "https://example.com/resumes/jamie-ortiz.pdf",
        jobId: productDesigner.id,
        stageId: pdStages[2].id,
      },
    ],
  });

  console.log(`Created 3 jobs (${draftJob.title} is DRAFT)`);
  console.log(
    `Created ${seStages.length + pdStages.length + DEFAULT_PIPELINE_STAGES.length} stages`,
  );
  console.log(`Created ${candidates.count} candidates`);
}

const SEED_EMAIL_TEMPLATES = [
  {
    title: "Запрошення на співбесіду",
    subject: "Запрошення на співбесіду: {{job_title}}",
    body: `Вітаємо, {{candidate_name}}!

Дякуємо за ваш інтерес до вакансії «{{job_title}}». Ми уважно ознайомилися з вашим резюме та хотіли б запросити вас на співбесіду.

Будь ласка, повідомте, які дати та час вам зручні для зустрічі. Ми надішлемо деталі щодо формату та посилання на відеодзвінок.

З повагою,
{{recruiter_name}}`,
  },
  {
    title: "Надіслати тестове завдання",
    subject: "Тестове завдання для вакансії «{{job_title}}»",
    body: `Вітаємо, {{candidate_name}}!

Дякуємо за участь у відборі на позицію «{{job_title}}». Наступний етап — виконання тестового завдання.

Будь ласка, ознайомтеся з умовами у вкладенні та надішліть результат протягом зазначеного терміну. Якщо виникнуть питання — відповідайте на цей лист.

З повагою,
{{recruiter_name}}`,
  },
  {
    title: "Відмова після розгляду резюме",
    subject: "Щодо вашої заявки на «{{job_title}}»",
    body: `Вітаємо, {{candidate_name}}!

Дякуємо за інтерес до вакансії «{{job_title}}» та за час, приділений підготовці заявки.

На жаль, на цьому етапі ми не можемо запропонувати вам продовження процесу відбору. Це рішення не знецінює ваш досвід — зараз ми шукаємо кандидата з іншим профілем під поточні потреби команди.

Бажаємо успіхів у подальшому пошуку!

З повагою,
{{recruiter_name}}`,
  },
] as const;

async function seedEmailTemplates() {
  console.log("Seeding email templates...");

  for (const template of SEED_EMAIL_TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { title: template.title },
    });

    if (existing) {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          subject: template.subject,
          body: template.body,
        },
      });
    } else {
      await prisma.emailTemplate.create({ data: template });
    }
  }

  console.log(`Seeded ${SEED_EMAIL_TEMPLATES.length} email templates`);
}

async function main() {
  await seedMasterAdmin();
  await clearMockRecruitingData();
  await seedMockRecruitingData();
  await seedEmailTemplates();
  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
