import { z } from 'zod';

/**
 * Standardized Zod error message formatter.
 * Returns the first human-readable validation issue or a friendly fallback.
 */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Fill this in: Please complete all required fields.';
  return first.message;
}

/**
 * Helper to validate data against a Zod schema and return a user-friendly error string.
 */
export function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const res = schema.safeParse(data);
  if (!res.success) {
    return { success: false, error: formatZodError(res.error) };
  }
  return { success: true, data: res.data };
}

// ==========================================
// 1. Authentication Schemas
// ==========================================

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Fill this in: Email address is required.' })
    .trim()
    .min(1, 'Fill this in: Email address is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string({ required_error: 'Fill this in: Password is required.' })
    .min(1, 'Fill this in: Password is required.')
    .min(6, 'Password must be at least 6 characters.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  fullName: z
    .string({ required_error: 'Fill this in: Full name is required.' })
    .trim()
    .min(1, 'Fill this in: Full name is required.')
    .max(100, 'Name cannot exceed 100 characters.'),
  email: z
    .string({ required_error: 'Fill this in: Email address is required.' })
    .trim()
    .min(1, 'Fill this in: Email address is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string({ required_error: 'Fill this in: Password is required.' })
    .min(1, 'Fill this in: Password is required.')
    .min(6, 'Password must be at least 6 characters.'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username cannot exceed 20 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.')
    .optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// ==========================================
// 2. Timetable Class Schema
// ==========================================

export const createClassSchema = z
  .object({
    courseId: z.string().uuid().optional().nullable(),
    newCourseName: z.string().trim().max(100).optional(),
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z
      .string({ required_error: 'Fill this in: Start time is required.' })
      .min(1, 'Fill this in: Start time is required.')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:MM format.'),
    endTime: z
      .string({ required_error: 'Fill this in: End time is required.' })
      .min(1, 'Fill this in: End time is required.')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:MM format.'),
    venue: z.string().trim().max(100).optional().nullable(),
    classType: z
      .enum(['lecture', 'tutorial', 'lab', 'workshop'])
      .optional()
      .default('lecture'),
  })
  .refine((data) => Boolean(data.courseId || data.newCourseName?.trim()), {
    message: 'Fill this in: Please select or enter a course name.',
    path: ['newCourseName'],
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Class end time must be after start time.',
    path: ['endTime'],
  });

export type CreateClassInput = z.infer<typeof createClassSchema>;

// ==========================================
// 3. Task Schema
// ==========================================

export const createTaskSchema = z.object({
  text: z
    .string({ required_error: 'Fill this in: Please enter a task title.' })
    .trim()
    .min(1, 'Fill this in: Please enter a task title.')
    .max(300, 'Task description cannot exceed 300 characters.'),
  prio: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
  courseId: z.string().uuid().optional().nullable(),
  due: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ==========================================
// 4. Assessment / Exam Schema
// ==========================================

export const createAssessmentSchema = z.object({
  title: z
    .string({ required_error: 'Fill this in: Assessment title is required.' })
    .trim()
    .min(1, 'Fill this in: Assessment title is required.')
    .max(150, 'Assessment title cannot exceed 150 characters.'),
  dueDate: z
    .string({ required_error: 'Fill this in: Due date is required.' })
    .min(1, 'Fill this in: Due date is required.'),
  courseId: z.string().uuid().optional().nullable(),
  weightPercentage: z.number().min(0).max(100).optional().nullable(),
  targetStudyHours: z.number().min(0).max(1000).optional().nullable(),
  venue: z.string().trim().max(100).optional().nullable(),
  type: z
    .enum(['exam', 'test', 'assignment', 'project', 'quiz'])
    .optional()
    .default('assignment'),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

// ==========================================
// 5. Flashcard Deck & Card Schemas
// ==========================================

export const createDeckSchema = z.object({
  title: z
    .string({ required_error: 'Fill this in: Deck title is required.' })
    .trim()
    .min(1, 'Fill this in: Deck title is required.')
    .max(100, 'Deck title cannot exceed 100 characters.'),
  courseId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

export const createCardSchema = z
  .object({
    deckId: z
      .string({ required_error: 'Please select a deck first.' })
      .min(1, 'Please select a deck first.'),
    cardType: z.enum(['standard', 'true_false', 'multiple_choice']).default('standard'),
    frontText: z
      .string({ required_error: 'Fill this in: Front prompt is required.' })
      .trim()
      .min(1, 'Fill this in: Front prompt is required.')
      .max(2000, 'Front prompt cannot exceed 2000 characters.'),
    backText: z.string().trim().max(2000).optional().default(''),
    options: z.array(z.string()).optional().default([]),
    correctAnswer: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.cardType === 'standard') {
        return Boolean(data.backText?.trim());
      }
      return true;
    },
    {
      message: 'Fill this in: Back answer is required.',
      path: ['backText'],
    }
  );

export type CreateCardInput = z.infer<typeof createCardSchema>;

// ==========================================
// 6. Study Room Schemas
// ==========================================

export const createRoomSchema = z.object({
  name: z
    .string({ required_error: 'Fill this in: Room name is required.' })
    .trim()
    .min(1, 'Fill this in: Room name is required.')
    .max(60, 'Room name cannot exceed 60 characters.'),
  durationMinutes: z
    .number()
    .int('Duration must be a whole number of minutes.')
    .min(5, 'Duration must be at least 5 minutes.')
    .max(180, 'Duration cannot exceed 180 minutes.')
    .default(25),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  code: z
    .string({ required_error: 'Fill this in: Please enter a 6-character room code.' })
    .trim()
    .length(6, 'Fill this in: Room code must be exactly 6 characters.')
    .regex(/^[A-Za-z0-9]{6}$/, 'Room code must only contain letters and numbers.'),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
