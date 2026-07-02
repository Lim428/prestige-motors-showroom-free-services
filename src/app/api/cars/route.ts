import { carQuerySchema } from "@/lib/validators";
import { getCars } from "@/lib/cars";
import { handleRouteError, ok } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    for (const key of Object.keys(params)) {
      if (params[key] === "") {
        delete params[key];
      }
    }

    const query = carQuerySchema.parse(params);
    const cars = await getCars(query);

    return ok(cars);
  } catch (error) {
    return handleRouteError(error);
  }
}
