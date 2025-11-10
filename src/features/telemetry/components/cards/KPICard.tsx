import { CardItem } from '@/shared/components';

interface KPICardProps {
  description: string;
  title: string;
  value: string;
}

/**
 * KPICard component
 *
 * Renders a single key performance indicator (KPI) in a card layout.
 * Displays the KPI title, value, and description vertically, styled for emphasis.
 * Typically used for presenting telemetry or statistical metrics.
 *
 * @param {KPICardProps} props
 * @param {string} props.title - Label or name of the KPI
 * @param {string} props.value - Main numerical or string value representing the KPI
 * @param {string} props.description - Brief description or context for the KPI
 *
 * @returns {JSX.Element} CardItem containing the formatted KPI information
 */
export function KPICard({ description, title, value }: KPICardProps) {
  return (
    <CardItem>
      <div className="flex flex-col gap-2">
        <p className="muted-foreground text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="muted-foreground mt-1 text-xs">{description}</p>
      </div>
    </CardItem>
  );
}
