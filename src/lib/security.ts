import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/errors";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new HttpError(401, "Admin authentication is required.");
  }

  return session;
}
