import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '~/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    className?: string;
    onDoubleClick?: () => void;
  }
>(({ className, onDoubleClick, value, defaultValue, ...props }, ref) => {
  // Determine the number of thumbs based on the value or defaultValue
  const thumbCount = React.useMemo(() => {
    const val = value || defaultValue;
    if (Array.isArray(val)) {
      return val.length;
    }
    return 1;
  }, [value, defaultValue]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      {...props}
      {...{
        className: cn(
          'relative flex w-full cursor-pointer touch-none select-none items-center',
          className,
        ),
        onDoubleClick,
      }}
    >
      <SliderPrimitive.Track
        {...{ className: 'relative h-2 w-full grow overflow-hidden rounded-full bg-secondary' }}
      >
        <SliderPrimitive.Range {...{ className: 'absolute h-full bg-primary' }} />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          {...{
            className:
              'block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          }}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
