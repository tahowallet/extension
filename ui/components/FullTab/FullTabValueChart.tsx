import React, {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"
import { fetchValueHistory } from "@tallyho/tally-background/redux-slices/history"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { useBackgroundDispatch } from "../../hooks"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import { DAY, RANGES, RangeKey, useChartRange } from "./chartRange"

const SAMPLES = 120
const HEIGHT = 200
const PADDING = { top: 12, right: 64, bottom: 24, left: 0 }

type Props = {
  addresses: string[]
  chainIDs?: string[]
  assetID?: string
  /** A label naming what the chart totals, used for screen readers. */
  label: string
}

type History = AsyncThunkFulfillmentType<typeof fetchValueHistory> & {
  /** The range the history was fetched for, and so the range it's drawn on. */
  rangeKey: RangeKey
}

const emptyHistory = (rangeKey: RangeKey): History => ({
  from: Date.now() - DAY,
  points: [],
  coverageStart: undefined,
  estimatedUntil: undefined,
  balanceHistoryFrom: undefined,
  reconstructedUntil: undefined,
  unrecorded: [],
  backfilling: false,
  rangeKey,
})

const formatValue = (value: number, compact = false) =>
  `$${value.toLocaleString(undefined, {
    maximumFractionDigits: compact && value >= 1000 ? 0 : 2,
    minimumFractionDigits: compact ? 0 : 2,
    notation: compact && value >= 100_000 ? "compact" : "standard",
  })}`

/**
 * Returns gridline values covering roughly `min` to `max`, spaced at 1, 2 or
 * 5 times a power of ten so that there are at most about `count` steps.
 */
function niceTicks(min: number, max: number, count = 3): number[] {
  const span = max - min || Math.abs(max) || 1
  const raw = span / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let tick = start; tick <= max + step * 0.5; tick += step) {
    ticks.push(tick)
  }
  return ticks
}

/**
 * Displays the value over time of some accounts' holdings as an area chart,
 * with a crosshair readout and range presets. History comes from the history
 * service, which backfills slowly, so the chart also shows where history
 * begins and whether more is still on its way.
 */
export default function FullTabValueChart({
  addresses,
  chainIDs,
  assetID,
  label,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "fullTab.chart" })
  const dispatch = useBackgroundDispatch()
  const [rangeKey, setRangeKey] = useChartRange()
  const [history, setHistory] = useState<History | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const range = RANGES.find(({ key }) => key === rangeKey) ?? RANGES[2]
  const subjectKey = JSON.stringify({ addresses, chainIDs, assetID })
  const queryKey = JSON.stringify({ subjectKey, rangeKey })

  // Showing a different subject's history would be misleading, so history is
  // cleared when the subject changes. A different range for the same subject,
  // on the other hand, stays up until the new range arrives.
  useEffect(() => setHistory(null), [subjectKey])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Skip this load if the previous one is still running, so that a slow
      // answer doesn't pile more queries up behind it.
      if (inFlight.current) return
      inFlight.current = true
      setLoading(true)
      const to = Date.now()
      try {
        const result = (await dispatch(
          fetchValueHistory({
            addresses,
            chainIDs,
            assetID,
            from: range.span === undefined ? "start" : to - range.span,
            to,
            samples: SAMPLES,
          }),
        )) as unknown as History | { payload?: History }
        // The background answers with the thunk's resulting action rather
        // than its value, and a rejected action carries no payload.
        const value = "points" in result ? result : result.payload
        if (!cancelled) {
          // If the request failed, keep what's already drawn; the next
          // refresh will try again.
          setHistory((current) =>
            value
              ? { ...value, rangeKey }
              : (current ?? emptyHistory(rangeKey)),
          )
        }
      } catch {
        // As above, keep what's drawn on a failure, but show an empty chart
        // rather than leaving a first load spinning.
        if (!cancelled) {
          setHistory((current) => current ?? emptyHistory(rangeKey))
        }
      } finally {
        inFlight.current = false
        if (!cancelled) setLoading(false)
      }
    }
    inFlight.current = false
    void load()
    // Refresh every minute to pick up live updates and backfill progress.
    const interval = window.setInterval(() => void load(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // The query key captures every input the query depends on, so the other
    // dependencies can be left out.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, dispatch])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const points = useMemo(() => history?.points ?? [], [history])
  const reconstructedUntil = history?.reconstructedUntil
  // Before this point, some holdings' values assume their earliest known
  // balance, since their balance history doesn't reach back that far.
  const estimatedUntil = history?.estimatedUntil
  const unrecorded = useMemo(() => history?.unrecorded ?? [], [history])
  const isUnrecorded = (time: number) =>
    unrecorded.some((stretch) => time >= stretch.from && time <= stretch.to)
  // History is drawn on the range it was fetched for until history for the
  // newly selected range arrives.
  const shownRange =
    RANGES.find(({ key }) => key === history?.rangeKey) ?? range
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const to = points.length > 0 ? points[points.length - 1].time : Date.now()
  const from = history?.from ?? to - (shownRange.span ?? DAY)
  const span = to - from

  const geometry = useMemo(() => {
    if (points.length === 0 || plotWidth === 0) return null
    const values = points.map(({ value }) => value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const ticks = niceTicks(min * 0.98, max * 1.02)
    const low = ticks[0]
    const high = ticks[ticks.length - 1]
    const x = (time: number) =>
      PADDING.left + ((time - from) / (to - from || 1)) * plotWidth
    const y = (value: number) =>
      PADDING.top +
      plotHeight -
      ((value - low) / (high - low || 1)) * plotHeight
    const coords = points.map(({ time, value }) => [x(time), y(value)])
    const pathOf = (segment: number[][]) =>
      segment
        .map(
          ([cx, cy], i) =>
            `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`,
        )
        .join("")
    const areaOf = (segment: number[][]) => {
      if (segment.length === 0) return undefined
      const baseline = PADDING.top + plotHeight
      return `${pathOf(segment)}L${segment[segment.length - 1][0].toFixed(1)},${baseline}L${segment[0][0].toFixed(1)},${baseline}Z`
    }
    const countUntil = (until: number | undefined) =>
      until === undefined
        ? 0
        : points.filter(({ time }) => time <= until).length

    // The line runs in up to three stretches, oldest first: values that
    // assume some holdings' earliest known balances, values that rely on
    // token balances reconstructed from transfers, and values from recorded
    // balances. Each stretch ends on the first point of the next, so the
    // line stays continuous.
    const estimatedCount = countUntil(estimatedUntil)
    const reconstructedCount = Math.max(
      estimatedCount,
      countUntil(reconstructedUntil),
    )
    const estimated =
      estimatedCount > 0 ? coords.slice(0, estimatedCount + 1) : []
    const reconstructed =
      reconstructedCount > estimatedCount
        ? coords.slice(estimatedCount, reconstructedCount + 1)
        : []
    // Recorded values run solid, except where they rely on prices that
    // weren't recorded, such as while the wallet wasn't running. Those
    // stretches are drawn apart, from the last recorded point before them to
    // the first after, so the line stays continuous.
    const solidPieces: number[][][] = [[]]
    const unrecordedPieces: number[][][] = []
    let inGap = false
    for (let index = reconstructedCount; index < points.length; index += 1) {
      const point = coords[index]
      const { time } = points[index]
      const unrecordedPoint = unrecorded.some(
        (stretch) => time >= stretch.from && time <= stretch.to,
      )
      if (unrecordedPoint && !inGap) {
        unrecordedPieces.push(index > 0 ? [coords[index - 1], point] : [point])
        inGap = true
      } else if (unrecordedPoint) {
        unrecordedPieces[unrecordedPieces.length - 1].push(point)
      } else {
        if (inGap) {
          unrecordedPieces[unrecordedPieces.length - 1].push(point)
          solidPieces.push([])
          inGap = false
        }
        solidPieces[solidPieces.length - 1].push(point)
      }
    }

    return {
      x,
      y,
      coords,
      ticks,
      estimatedLine: estimated.length > 0 ? pathOf(estimated) : undefined,
      estimatedArea: areaOf(estimated),
      reconstructedLine:
        reconstructed.length > 0 ? pathOf(reconstructed) : undefined,
      solidLine: solidPieces
        .filter((piece) => piece.length > 1)
        .map(pathOf)
        .join(""),
      unrecordedLine:
        unrecordedPieces.length > 0
          ? unrecordedPieces.map(pathOf).join("")
          : undefined,
      area: areaOf(coords.slice(estimatedCount)),
    }
  }, [
    estimatedUntil,
    from,
    plotHeight,
    plotWidth,
    points,
    reconstructedUntil,
    to,
    unrecorded,
  ])

  const latest = points[points.length - 1]
  const first = points[0]
  const change = latest && first ? latest.value - first.value : 0
  const changeRatio = first && first.value !== 0 ? change / first.value : 0
  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined
  const shown = hovered ?? latest

  // Explains what the hovered value rests on when it isn't simply recorded,
  // such as an estimate or a balance held over an unrecorded stretch. The plot
  // marks these stretches by their line alone, so the readout explains them.
  const hoveredNote = (() => {
    if (!hovered) return undefined
    if (estimatedUntil !== undefined && hovered.time <= estimatedUntil) {
      // The date is where the estimates end, which is where the marker is.
      // Whether history is unavailable or still filling in only picks the
      // wording.
      return history?.balanceHistoryFrom !== undefined
        ? t("estimatedUnavailable", {
            date: dayjs(estimatedUntil).format(
              shownRange.key === "day" ? "HH:mm" : "MMM D",
            ),
          })
        : t("estimated")
    }
    if (isUnrecorded(hovered.time)) {
      return history?.backfilling ? t("unrecordedFilling") : t("unrecorded")
    }
    if (
      reconstructedUntil !== undefined &&
      hovered.time <= reconstructedUntil
    ) {
      return t("reconstructed")
    }
    return undefined
  })()

  const onPointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    if (!geometry) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - bounds.left + PADDING.left
    let nearest = 0
    geometry.coords.forEach(([cx], index) => {
      if (
        Math.abs(cx - pointerX) <
        Math.abs(geometry.coords[nearest][0] - pointerX)
      ) {
        nearest = index
      }
    })
    setHoverIndex(nearest)
  }

  const estimatedEdge =
    geometry && estimatedUntil !== undefined
      ? geometry.x(estimatedUntil)
      : undefined

  const coverageStart = history?.coverageStart
  const coverageCut =
    geometry &&
    coverageStart !== undefined &&
    coverageStart > from + span * 0.02
      ? geometry.x(coverageStart)
      : undefined

  return (
    <section className="chart_card" aria-label={label}>
      <div className="header">
        <div className="readout" aria-live="polite">
          <span className="value">
            {shown ? formatValue(shown.value) : "—"}
          </span>
          {hovered ? (
            <span className="when">
              <span className="time">
                {dayjs(hovered.time).format("MMM D, YYYY · HH:mm")}
                {hoveredNote !== undefined && " · "}
              </span>
              {hoveredNote}
            </span>
          ) : (
            latest && (
              <span className={`change ${change >= 0 ? "up" : "down"}`}>
                {change >= 0 ? "▲" : "▼"} {formatValue(Math.abs(change))} (
                {(Math.abs(changeRatio) * 100).toFixed(2)}%)
              </span>
            )
          )}
        </div>
        <div className="ranges">
          <SharedPanelSwitcher
            panelId="value_chart_ranges"
            panelNames={RANGES.map(({ key }) => t(`ranges.${key}`))}
            panelNumber={RANGES.findIndex(({ key }) => key === rangeKey)}
            setPanelNumber={(index) => {
              setHoverIndex(null)
              setRangeKey(RANGES[index].key)
            }}
          />
        </div>
      </div>
      <div
        className={`plot${loading && history !== null ? " updating" : ""}`}
        ref={containerRef}
        aria-busy={loading}
      >
        {history === null && (
          <div className="overlay">
            <SharedLoadingSpinner size="small" />
          </div>
        )}
        {history !== null && points.length === 0 && (
          <div className="overlay muted">
            {history.backfilling ? t("backfilling") : t("empty")}
          </div>
        )}
        {geometry && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={label}
            key={`${subjectKey}:${shownRange.key}`}
          >
            <defs>
              <linearGradient id="value_fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--trophy-gold)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--trophy-gold)"
                  stopOpacity="0"
                />
              </linearGradient>
              {/* Diagonal stripes, under values that rely on estimated
                  balances. */}
              <pattern
                id="value_estimated_fill"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect
                  width="2"
                  height="6"
                  fill="var(--trophy-gold)"
                  fillOpacity="0.22"
                />
              </pattern>
            </defs>
            {geometry.ticks.map((tick) => (
              <g key={tick}>
                <line
                  className="grid"
                  x1={PADDING.left}
                  x2={PADDING.left + plotWidth}
                  y1={geometry.y(tick)}
                  y2={geometry.y(tick)}
                />
                <text
                  className="axis"
                  x={PADDING.left + plotWidth + 8}
                  y={geometry.y(tick)}
                  dominantBaseline="middle"
                >
                  {formatValue(tick, true)}
                </text>
              </g>
            ))}
            {[from, from + span / 2, to].map((time, index) => (
              <text
                key={time}
                className="axis"
                x={PADDING.left + (plotWidth * index) / 2}
                y={HEIGHT - 4}
                textAnchor={(["start", "middle", "end"] as const)[index]}
              >
                {dayjs(time).format(shownRange.format)}
              </text>
            ))}
            {estimatedEdge !== undefined && (
              <g className="estimated">
                <line
                  x1={estimatedEdge}
                  x2={estimatedEdge}
                  y1={PADDING.top}
                  y2={PADDING.top + plotHeight}
                />
              </g>
            )}
            {coverageCut !== undefined && (
              <g className="coverage">
                <line
                  x1={coverageCut}
                  x2={coverageCut}
                  y1={PADDING.top}
                  y2={PADDING.top + plotHeight}
                />
                <text
                  x={Math.max(coverageCut - 8, 4)}
                  y={PADDING.top + 12}
                  textAnchor={coverageCut > 160 ? "end" : "start"}
                >
                  {history?.backfilling
                    ? t("backfilling")
                    : t("historyBegins", {
                        date: dayjs(coverageStart).format("MMM D"),
                      })}
                </text>
              </g>
            )}
            {geometry.estimatedArea !== undefined && (
              <path
                className="area"
                d={geometry.estimatedArea}
                fill="url(#value_estimated_fill)"
              />
            )}
            {geometry.area !== undefined && (
              <path
                className="area"
                d={geometry.area}
                fill="url(#value_fill)"
              />
            )}
            {geometry.estimatedLine !== undefined && (
              <path className="line_estimated" d={geometry.estimatedLine} />
            )}
            {geometry.reconstructedLine !== undefined && (
              <path
                className="line_reconstructed"
                d={geometry.reconstructedLine}
              />
            )}
            <path className="line" d={geometry.solidLine} pathLength={1} />
            {geometry.unrecordedLine !== undefined && (
              <path className="unrecorded" d={geometry.unrecordedLine} />
            )}
            {hovered && hoverIndex !== null && (
              <g className="crosshair">
                <line
                  x1={geometry.coords[hoverIndex][0]}
                  x2={geometry.coords[hoverIndex][0]}
                  y1={PADDING.top}
                  y2={PADDING.top + plotHeight}
                />
                <circle
                  cx={geometry.coords[hoverIndex][0]}
                  cy={geometry.coords[hoverIndex][1]}
                  r={4.5}
                />
              </g>
            )}
            {/*
              The whole plot is the pointer target, and the crosshair snaps
              to the point nearest the pointer's x position.
            */}
            <rect
              x={PADDING.left}
              y={0}
              width={plotWidth}
              height={HEIGHT}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>
        )}
      </div>
      {/*
        Every tenth point of the series, plus the latest, as a table for
        screen readers.
      */}
      <table className="visually_hidden">
        <caption>{label}</caption>
        <tbody>
          {points
            .filter(
              (_, index) => index % 10 === 0 || index === points.length - 1,
            )
            .map(({ time, value }) => (
              <tr key={time}>
                <th scope="row">{dayjs(time).format("MMM D, YYYY HH:mm")}</th>
                <td>{formatValue(value)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <style jsx>{`
        .chart_card {
          position: relative;
          padding: 16px 16px 8px 20px;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .readout {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-height: 52px;
        }
        .value {
          font-size: 28px;
          font-weight: 500;
          color: var(--text-strong);
          font-variant-numeric: tabular-nums;
        }
        .when,
        .change {
          font-size: 14px;
          color: var(--green-40);
          font-variant-numeric: tabular-nums;
        }
        /* The time stays whole, and a long explanation after it wraps into
           the space above the plot rather than pushing the plot down under
           the pointer. */
        .when {
          height: 18px;
          line-height: 18px;
        }
        .time {
          white-space: nowrap;
        }
        .change.up {
          color: var(--success);
        }
        .change.down {
          color: var(--error);
        }
        /* The switcher fills its container and lays its tabs out from the
           left after an indent. The container therefore shrinks to fit the
           tabs and sits at the right, and the indent and the last tab's
           trailing margin are dropped so "All" ends where the plot does. */
        .ranges {
          margin-left: auto;
          margin-right: ${PADDING.right}px;
          --panel-switcher-border: transparent;
        }
        .ranges :global(ul) {
          padding-left: 0;
        }
        .ranges :global(li:last-child .option) {
          margin-right: 0;
        }
        .plot {
          position: relative;
          height: ${HEIGHT}px;
          margin-top: 8px;
        }
        .plot svg {
          transition: opacity 160ms ease-out;
        }
        .plot.updating svg {
          opacity: 0.5;
        }
        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .muted {
          color: var(--green-40);
        }
        svg {
          display: block;
          overflow: visible;
        }
        .grid {
          stroke: var(--green-95);
          stroke-width: 1;
        }
        .axis {
          fill: var(--green-60);
          font-size: 11px;
          font-variant-numeric: tabular-nums;
        }
        .line {
          fill: none;
          stroke: var(--trophy-gold);
          stroke-width: 2;
          stroke-linejoin: round;
          stroke-linecap: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: draw 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .line_estimated,
        .line_reconstructed {
          fill: none;
          stroke: var(--trophy-gold);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          animation: fade_in 0.5s ease 0.25s forwards;
        }
        /* Estimated values get short dashes over striped fill; values from
           reconstructed balances get longer dashes over the usual fill. */
        .line_estimated {
          stroke-dasharray: 2 5;
        }
        /* Values held over a stretch nobody recorded, in gray dots, so a flat
           line there doesn't read as a quiet market. */
        .unrecorded {
          fill: none;
          stroke: var(--green-40);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 0.5 5;
        }
        .line_reconstructed {
          stroke-dasharray: 7 5;
        }
        .area {
          opacity: 0;
          animation: fade_in 0.5s ease 0.25s forwards;
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade_in {
          to {
            opacity: 1;
          }
        }
        .estimated line {
          stroke: var(--green-60);
          stroke-dasharray: 3 3;
        }
        .coverage line {
          stroke: var(--green-60);
          stroke-dasharray: 3 3;
        }
        .coverage text {
          fill: var(--green-40);
          font-size: 11px;
        }
        .crosshair line {
          stroke: var(--green-40);
          stroke-width: 1;
        }
        .crosshair circle {
          fill: var(--trophy-gold);
          stroke: var(--green-120);
          stroke-width: 2;
        }
        .visually_hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .line {
            animation: none;
            stroke-dashoffset: 0;
          }
          .area {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </section>
  )
}
