import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { useInView, useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  /** Shown before the number (e.g. "$") */
  prefix?: string
  /** Shown after the number (e.g. "%") */
  suffix?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function formatNumber(value: number, decimalPlaces: number): string {
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(value.toFixed(decimalPlaces)))
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const finalDisplay = `${prefix}${formatNumber(value, decimalPlaces)}${suffix}`

  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  const paint = (latest: number) => {
    if (!ref.current) return
    ref.current.textContent = `${prefix}${formatNumber(latest, decimalPlaces)}${suffix}`
  }

  const paintFinal = () => {
    hasAnimated.current = true
    paint(value)
  }

  useEffect(() => {
    setReducedMotion(prefersReducedMotion())
  }, [])

  // Keep spring subscription always active so animated frames paint.
  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (hasAnimated.current && Math.abs(latest - value) >= 0.5) {
        // Ignore stale frames after we've locked to final.
        return
      }
      paint(latest)
      if (Math.abs(latest - value) < 0.001) {
        paintFinal()
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [springValue, decimalPlaces, prefix, suffix, value])

  useEffect(() => {
    if (hasAnimated.current) return

    // Reduced motion: final value immediately, no animation.
    if (reducedMotion) {
      paintFinal()
      return
    }

    // Nothing to animate (e.g. intentional 0): show final when in view (or immediately).
    if (value === startValue && direction === "up") {
      if (isInView) paintFinal()
      return
    }

    if (!isInView) return

    let startTimer: ReturnType<typeof setTimeout> | null = null
    let safetyTimer: ReturnType<typeof setTimeout> | null = null

    startTimer = setTimeout(() => {
      // Reset visible number to the start, then spring to the target.
      // textContent is updated imperatively so React does not re-flash.
      paint(direction === "down" ? value : startValue)
      motionValue.set(direction === "down" ? value : startValue)
      // Next frame: drive spring toward the final value.
      requestAnimationFrame(() => {
        motionValue.set(direction === "down" ? startValue : value)
      })
      // Safety net: if the spring never settles, lock to the final value.
      safetyTimer = setTimeout(() => {
        paintFinal()
      }, 2000)
    }, delay * 1000)

    return () => {
      if (startTimer !== null) clearTimeout(startTimer)
      if (safetyTimer !== null) clearTimeout(safetyTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInView,
    delay,
    value,
    direction,
    startValue,
    reducedMotion,
    motionValue,
    prefix,
    suffix,
    decimalPlaces,
  ])

  return (
    <span className={cn("inline-block tabular-nums tracking-wider", className)}>
      {/* Screen readers get the final value once; the animated span is decorative. */}
      <span className="sr-only">{finalDisplay}</span>
      <span
        ref={ref}
        aria-hidden="true"
        data-final={finalDisplay}
        className="inline-block tabular-nums print:hidden"
        {...props}
      >
        {/*
          SSR / first paint / slow JS / crawlers / already-visible refresh:
          always show the FINAL value so counters never remain stuck at 0.
          When the section enters the viewport, the effect above briefly
          resets to startValue and animates to the final value via textContent.
        */}
        {finalDisplay}
      </span>
      <span className="hidden print:inline" aria-hidden="true">
        {finalDisplay}
      </span>
    </span>
  )
}
