import { Card, CardContent } from "@/components/ui/card";

interface QuickStatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function QuickStatCard({ title, value, description, icon, color }: QuickStatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`rounded-full p-3 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
