const z = require('zod');

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleEntrySchema = z.object({
  day: z.enum(["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]),
  active: z.boolean().optional().default(true),
  start: z.string().regex(timeRegex, "Horário inválido (HH:mm)").optional(),
  end: z.string().regex(timeRegex, "Horário inválido (HH:mm)").optional(),
});

const scheduleSchema = z.array(scheduleEntrySchema);

const input = "[{\"day\":\"Seg\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"},{\"day\":\"Ter\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"},{\"day\":\"Qua\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"},{\"day\":\"Qui\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"},{\"day\":\"Sex\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"},{\"day\":\"Sab\",\"active\":false,\"start\":\"18:00\",\"end\":\"23:00\"},{\"day\":\"Dom\",\"active\":true,\"start\":\"18:00\",\"end\":\"22:00\"}]";

const raw = JSON.parse(input);
const result = scheduleSchema.safeParse(raw);
console.log(JSON.stringify(result, null, 2));
