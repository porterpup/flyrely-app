import { cn } from '~/lib/utils';

export interface OptionTileProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

/** "More options" tile: muted surface, title and a caption. Wrap in a Link/button to make it tappable. */
export function OptionTile({ title, description, icon, className, ...props }: OptionTileProps) {
  return (
    <div
      className={cn(
        'min-h-[104px] rounded-tile border border-surface-stroke bg-surface-muted p-4',
        className
      )}
      {...props}
    >
      {icon && <div className="mb-3 text-ink-caption [&_svg]:h-5 [&_svg]:w-5">{icon}</div>}
      <p className="text-body-lg text-ink">{title}</p>
      {description && <p className="mt-1 text-body-sm text-ink-caption">{description}</p>}
    </div>
  );
}
