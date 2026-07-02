import { z } from "zod";

export const transmissionSchema = z.enum(["AUTOMATIC", "MANUAL"]);
export const fuelTypeSchema = z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]);
export const carStatusSchema = z.enum(["AVAILABLE", "RESERVED", "SOLD"]);
export const enquiryStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "CLOSED",
  "ARCHIVED"
]);

const currentYear = new Date().getFullYear();

export const carImageInputSchema = z.object({
  url: z.string().min(1, "Image URL is required."),
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

export type CarInput = z.infer<typeof carInputSchema>;
export type CarQuery = z.infer<typeof carQuerySchema>;
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
