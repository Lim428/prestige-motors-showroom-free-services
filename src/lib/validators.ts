import { z } from "zod";

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const httpUrlSchema = z
  .string()
  .trim()
  .url("A valid web URL is required.")
  .max(2000)
  .refine(isHttpUrl, "Only HTTP or HTTPS URLs are supported.");
const storedImageUrlSchema = z
  .string()
  .trim()
  .min(1, "Image URL is required.")
  .max(2000)
  .refine(
    (value) => value.startsWith("/api/uploads/cars/") || isHttpUrl(value),
    "Use an uploaded image or a valid HTTP/HTTPS image URL."
  );

export const transmissionSchema = z.enum(["AUTOMATIC", "MANUAL"]);
export const fuelTypeSchema = z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]);
export const carStatusSchema = z.enum(["AVAILABLE", "RESERVED", "SOLD"]);
export const carStatusUpdateSchema = z
  .object({
    status: carStatusSchema
  })
  .strict();
export const enquiryStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "CLOSED",
  "ARCHIVED"
]);

const currentYear = new Date().getFullYear();

export const carImageInputSchema = z.object({
  url: storedImageUrlSchema,
  altText: z.string().min(2, "Image alt text is required.").max(140),
  width: z.coerce.number().int().positive().default(1600),
  height: z.coerce.number().int().positive().default(1000),
  sortOrder: z.coerce.number().int().min(0).default(0)
});

export const carInputSchema = z.object({
  brand: z.string().trim().min(2, "Brand is required.").max(60),
  model: z.string().trim().min(1, "Model is required.").max(80),
  year: z.coerce
    .number()
    .int()
    .min(1970, "Year must be 1970 or newer.")
    .max(currentYear + 1, "Year is too far in the future."),
  mileage: z.coerce.number().int().min(0).max(2_000_000),
  transmission: transmissionSchema,
  fuelType: fuelTypeSchema,
  engine: z.string().trim().min(2, "Engine is required.").max(80),
  price: z.coerce.number().positive("Price must be greater than zero."),
  condition: z.string().trim().min(2, "Condition is required.").max(80),
  description: z
    .string()
    .trim()
    .min(1, "Description is required."),
  features: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one feature."),
  status: carStatusSchema.default("AVAILABLE"),
  images: z
    .array(carImageInputSchema)
    .min(1, "Upload or provide at least one vehicle image.")
    .max(12)
});

export const carQuerySchema = z.object({
  search: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  fuel: fuelTypeSchema.optional(),
  transmission: transmissionSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minYear: z.coerce.number().int().min(1970).optional(),
  maxYear: z.coerce.number().int().max(currentYear + 1).optional(),
  sort: z
    .enum([
      "newest",
      "price-asc",
      "price-desc",
      "year-asc",
      "year-desc"
    ])
    .default("newest")
});

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(100),
  email: z.string().trim().email("A valid email is required.").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Message is too short.").max(2000),
  carId: z.string().uuid().optional()
});

export const enquiryUpdateSchema = z.object({
  status: enquiryStatusSchema
});

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200)
});

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(800),
  history: z.array(assistantMessageSchema).max(8).default([])
});

export const leadStatusSchema = z.enum([
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "APPOINTMENT_SET",
  "NEGOTIATING",
  "WON",
  "LOST",
  "ARCHIVED"
]);
export const leadSourceSchema = z.enum([
  "AI_ASSISTANT",
  "WEBSITE",
  "WHATSAPP",
  "ENQUIRY",
  "TEST_DRIVE",
  "TRADE_IN",
  "MANUAL"
]);
export const leadPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const appointmentStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW"
]);
export const appointmentTypeSchema = z.enum([
  "TEST_DRIVE",
  "SHOWROOM_VISIT",
  "VIDEO_CALL"
]);
export const tradeInStatusSchema = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "APPRAISED",
  "ACCEPTED",
  "DECLINED",
  "ARCHIVED"
]);
export const alertTypeSchema = z.enum(["PRICE_DROP", "NEW_STOCK", "BOTH"]);
export const alertChannelSchema = z.enum(["EMAIL", "SMS", "WHATSAPP"]);
export const alertStatusSchema = z.enum([
  "PENDING_VERIFICATION",
  "ACTIVE",
  "PAUSED",
  "MATCHED",
  "UNSUBSCRIBED"
]);
export const analyticsEventNameSchema = z.enum([
  "PAGE_VIEW",
  "VEHICLE_VIEW",
  "WHATSAPP_CLICK",
  "PHONE_CLICK",
  "GALLERY_INTERACTION",
  "AI_CHAT_STARTED",
  "FINANCE_CALCULATED",
  "COMPARE_USED",
  "CAR_SAVED",
  "TRUST_REPORT_DOWNLOADED"
]);
export const inspectionStatusSchema = z.enum([
  "NOT_INSPECTED",
  "IN_PROGRESS",
  "VERIFIED",
  "NEEDS_ATTENTION"
]);
export const trustDocumentCategorySchema = z.enum([
  "INSPECTION_REPORT",
  "SERVICE_RECORD",
  "WARRANTY",
  "CERTIFICATE",
  "OTHER"
]);

const consentSchema = z.literal(true, {
  errorMap: () => ({ message: "Consent is required." })
});
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid calendar date.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm.");
const nullableIsoDateSchema = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

export const leadInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(100),
    email: z.string().trim().email("A valid email is required.").max(160),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    consent: consentSchema,
    vehicleIds: z.array(z.string().uuid()).max(4).default([]),
    summary: z.string().trim().max(3000).optional().or(z.literal("")),
    transcript: z.array(assistantMessageSchema).max(50).default([]),
    budgetMin: z.coerce.number().min(0).max(100_000_000).optional(),
    budgetMax: z.coerce.number().min(0).max(100_000_000).optional()
  })
  .strict()
  .refine(
    (value) =>
      value.budgetMin === undefined ||
      value.budgetMax === undefined ||
      value.budgetMin <= value.budgetMax,
    { message: "Minimum budget cannot exceed maximum budget.", path: ["budgetMin"] }
  );

export const leadAdminQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  priority: leadPrioritySchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const leadAdminUpdateSchema = z
  .object({
    status: leadStatusSchema.optional(),
    priority: leadPrioritySchema.optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    nextFollowUpAt: nullableIsoDateSchema,
    summary: z.string().trim().max(5000).nullable().optional(),
    note: z.string().trim().min(1).max(3000).optional()
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update."
  });

export const appointmentAvailabilityQuerySchema = z.object({
  date: dateSchema,
  carId: z.string().uuid().optional()
});

export const appointmentInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(100),
    email: z.string().trim().email("A valid email is required.").max(160),
    phone: z.string().trim().min(6, "Phone number is required.").max(40),
    date: dateSchema,
    time: timeSchema,
    type: appointmentTypeSchema.default("TEST_DRIVE"),
    carId: z.string().uuid().optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    consent: consentSchema
  })
  .strict();

export const appointmentAdminQuerySchema = z.object({
  status: appointmentStatusSchema.optional(),
  date: dateSchema.optional(),
  range: z.enum(["UPCOMING", "TODAY", "PAST", "ALL"]).default("UPCOMING"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const appointmentAdminUpdateSchema = z
  .object({
    status: appointmentStatusSchema.optional(),
    date: dateSchema.optional(),
    time: timeSchema.optional(),
    notes: z.string().trim().max(3000).nullable().optional()
  })
  .strict()
  .refine(
    (value) =>
      (value.date === undefined && value.time === undefined) ||
      (value.date !== undefined && value.time !== undefined),
    { message: "Provide both date and time when rescheduling.", path: ["date"] }
  )
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update."
  });

export const tradeInImageInputSchema = z
  .object({
    url: storedImageUrlSchema,
    publicId: z.string().trim().max(500).optional(),
    altText: z.string().trim().max(160).optional(),
    sortOrder: z.coerce.number().int().min(0).max(5).optional()
  })
  .strict();

export const tradeInInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(100),
    email: z.string().trim().email("A valid email is required.").max(160),
    phone: z.string().trim().min(6, "Phone number is required.").max(40),
    make: z.string().trim().min(1, "Vehicle make is required.").max(80),
    model: z.string().trim().min(1, "Vehicle model is required.").max(100),
    year: z.coerce.number().int().min(1970).max(currentYear + 1),
    mileage: z.coerce.number().int().min(0).max(2_000_000),
    registration: z.string().trim().max(40).optional().or(z.literal("")),
    condition: z.string().trim().min(2, "Condition is required.").max(100),
    expectedPrice: z.coerce.number().positive().max(100_000_000).optional(),
    notes: z.string().trim().max(3000).optional().or(z.literal("")),
    images: z.array(tradeInImageInputSchema).max(6).default([]),
    consent: consentSchema
  })
  .strict();

export const tradeInAdminQuerySchema = z.object({
  status: tradeInStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const tradeInAdminUpdateSchema = z
  .object({
    status: tradeInStatusSchema.optional(),
    appraisalAmount: z.coerce.number().positive().max(100_000_000).nullable().optional(),
    adminNotes: z.string().trim().max(5000).nullable().optional()
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update."
  });

export const stockAlertInputSchema = z
  .object({
    name: z.string().trim().max(100).optional().or(z.literal("")),
    email: z.string().trim().email("A valid email is required.").max(160),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    channel: alertChannelSchema.default("EMAIL"),
    type: alertTypeSchema.default("NEW_STOCK"),
    carId: z.string().uuid().optional(),
    criteria: z
      .object({
        brand: z.string().trim().max(80).optional().or(z.literal("")),
        model: z.string().trim().max(100).optional().or(z.literal("")),
        minPrice: z.coerce.number().min(0).max(100_000_000).optional(),
        maxPrice: z.coerce.number().min(0).max(100_000_000).optional(),
        fuelType: fuelTypeSchema.optional()
      })
      .strict()
      .default({}),
    consent: consentSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.channel !== "EMAIL" && !value.phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A phone number is required for SMS or WhatsApp alerts.",
        path: ["phone"]
      });
    }
    if (
      value.criteria.minPrice !== undefined &&
      value.criteria.maxPrice !== undefined &&
      value.criteria.minPrice > value.criteria.maxPrice
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum price cannot exceed maximum price.",
        path: ["criteria", "minPrice"]
      });
    }
    if (
      value.type === "PRICE_DROP" &&
      !value.carId &&
      !value.criteria.brand &&
      !value.criteria.model
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a vehicle, brand, or model for price-drop alerts.",
        path: ["carId"]
      });
    }
  });

export const stockAlertAdminQuerySchema = z.object({
  status: alertStatusSchema.optional(),
  type: alertTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const stockAlertAdminUpdateSchema = z
  .object({ status: alertStatusSchema })
  .strict();

const analyticsValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

export const analyticsEventInputSchema = z
  .object({
    event: analyticsEventNameSchema,
    carId: z.string().uuid().optional(),
    sessionId: z.string().trim().max(120).optional(),
    path: z.string().trim().max(500).optional(),
    referrer: httpUrlSchema
      .refine((value) => value.length <= 1000, "Referrer URL is too long.")
      .optional(),
    metadata: z.record(analyticsValueSchema).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.metadata && Object.keys(value.metadata).length > 20) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Analytics metadata supports up to 20 properties.",
        path: ["metadata"]
      });
    }
  });

export const analyticsDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30)
});

export const notificationQuerySchema = z.object({
  unreadOnly: z.enum(["true", "false"]).transform((value) => value === "true").default("false"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const notificationUpdateSchema = z.object({ read: z.boolean() }).strict();

export const trustDocumentInputSchema = z
  .object({
    category: trustDocumentCategorySchema,
    title: z.string().trim().min(2).max(160),
    url: httpUrlSchema,
    issuedAt: z.string().datetime({ offset: true }).nullable().optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    verified: z.boolean().default(false)
  })
  .strict();

export const vehicleTrustInputSchema = z
  .object({
    inspectionStatus: inspectionStatusSchema.optional(),
    inspectionScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
    inspectionSummary: z.string().trim().max(5000).nullable().optional(),
    serviceHistorySummary: z.string().trim().max(5000).nullable().optional(),
    warrantyMonths: z.coerce.number().int().min(0).max(120).nullable().optional(),
    warrantyProvider: z.string().trim().max(160).nullable().optional(),
    ownershipCount: z.coerce.number().int().min(0).max(50).nullable().optional(),
    accidentFree: z.boolean().nullable().optional(),
    lastInspectedAt: z.string().datetime({ offset: true }).nullable().optional(),
    reportUrl: httpUrlSchema.nullable().optional(),
    documents: z.array(trustDocumentInputSchema).max(25).optional()
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one trust field to update."
  });

export type CarInput = z.infer<typeof carInputSchema>;
export type CarQuery = z.infer<typeof carQuerySchema>;
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
export type TradeInInput = z.infer<typeof tradeInInputSchema>;
export type StockAlertInput = z.infer<typeof stockAlertInputSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventInputSchema>;
