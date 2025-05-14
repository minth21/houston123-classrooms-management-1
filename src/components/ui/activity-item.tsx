interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
}

export function ActivityItem({ title, description, time }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-3">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  );
}
