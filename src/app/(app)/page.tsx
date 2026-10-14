import { Suspense } from "react";
import { CardsView } from "./cards-view";

export default function CardsPage() {
  return (
    <Suspense>
      <CardsView />
    </Suspense>
  );
}
