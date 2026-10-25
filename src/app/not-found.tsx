import Link from "next/link";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <section className="shell not-found">
      <span className="eyebrow">404 / A PAGE OUT OF PLACE</span>
      <h1>
        That page took
        <br />a wrong turn.
      </h1>
      <p>Your documents haven’t gone anywhere. Let’s get you back to the toolkit.</p>
      <Link href="/#tools" className="button button-green" prefetch={false}>
        Back to all tools <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
