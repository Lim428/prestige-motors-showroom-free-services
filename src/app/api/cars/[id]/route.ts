import { getCarBySlugOrId } from "@/lib/cars";
import { fail, handleRouteError, ok } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const car = await getCarBySlugOrId(id);

    if (!car) {
      return fail("Vehicle not found.", 404);
    }

    return ok(car);
  } catch (error) {
    return handleRouteError(error);
  }
}
