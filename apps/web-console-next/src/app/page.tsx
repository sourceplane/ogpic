"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * App entry. Rondo is the product: everyone lands in the Rondo experience,
 * which resolves the caller's squad (or the Rondo-branded sign-in when signed
 * out). The generic console surface is retired (see next.config redirects).
 */
export default function HomePage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/rondo");
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
