import type { EnquiryStatus } from "@prisma/client";

export type AdminEnquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: EnquiryStatus;
  carId: string | null;
  createdAt: string;
  updatedAt: string;
  car: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    year: number;
  } | null;
};
