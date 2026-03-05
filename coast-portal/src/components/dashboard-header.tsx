import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function DashboardHeader({ clientCount }: { clientCount: number }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
          {clientCount}
        </span>
      </div>
      <Link href="/clients/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </Link>
    </div>
  );
}
