import { Link } from "react-router";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";

export function NotFoundPage() {
  return (
    <EmptyState
      className="mt-10"
      icon={<MapPin />}
      title="Página no encontrada"
      description="La dirección no corresponde a ninguna sección del sistema."
      action={
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      }
    />
  );
}
