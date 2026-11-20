import type { Metadata } from "next";
import { SuggestionsView } from "@/components/console/SuggestionsView";

export const metadata: Metadata = { title: "Suggestions · Admin" };

export default function SuggestionsPage() {
  return <SuggestionsView />;
}
