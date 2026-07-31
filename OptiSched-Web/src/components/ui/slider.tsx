import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  ticks = false,
  ...props
}: SliderPrimitive.Root.Props & {
  /** Render the track as discrete tick bars (filled up to the current value) instead of a continuous bar. */
  ticks?: boolean
}) {
  const _values = Array.isArray(value)
    ? value
    : typeof value === "number"
      ? [value]
      : Array.isArray(defaultValue)
        ? defaultValue
        : typeof defaultValue === "number"
          ? [defaultValue]
          : [min, max]

  const currentValue = _values[0] ?? min
  const tickCount = Math.max(1, Math.round((max - min) / (step || 1)))

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "relative grow select-none data-vertical:h-full data-vertical:w-1",
            ticks
              ? "data-horizontal:h-1.5 data-horizontal:w-full"
              : "overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-horizontal:w-full"
          )}
        >
          {ticks ? (
            <div className="absolute inset-y-0 flex w-full items-center gap-[3px]">
              {Array.from({ length: tickCount }, (_, index) => (
                <div
                  key={index}
                  data-slot="slider-tick"
                  className={cn(
                    "h-1.5 flex-1 rounded-[2px] transition-colors",
                    index < currentValue - min ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          ) : (
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
            />
          )}
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative z-10 block size-3.5 shrink-0 rounded-full border-2 border-primary bg-primary shadow-sm ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
