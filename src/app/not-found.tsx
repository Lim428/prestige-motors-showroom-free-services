import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-copper">404</p>
        <h1 className="mt-4 text-4xl font-black text-ink">That page is not in the showroom.</h1>
        <p className="mt-4 text-ink/65">The vehicle or page may have been moved.</p>
        <ButtonLink className="mt-8" href="/">
          Back to inventory
        </ButtonLink>
      </div>
    </main>
  );
}
