export function serializeEmailTemplate(template: {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: template.id,
    title: template.title,
    subject: template.subject,
    body: template.body,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
