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

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const RANGES = [
  { key: "day", span: DAY, format: "HH:mm" },
  { key: "week", span: 7 * DAY, format: "MMM D" },
  { key: "month", span: 30 * DAY, format: "MMM D" },
  { key: "quarter", span: 90 * DAY, format: "MMM D" },
  { key: "year", span: 365 * DAY, format: "MMM YYYY" },
] as const

type RangeKey = (typeof RANGES)[number]["key"]

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

type History = AsyncThunkFulfillmentType<typeof fetchValueHistory>

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
  const [rangeKey, setRangeKey] = useState<RangeKey>("month")
  const [history, setHistory] = useState<History | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const range = RANGES.find(({ key }) => key === rangeKey) ?? RANGES[2]
  const queryKey = JSON.stringify({ addresses, chainIDs, assetID, rangeKey })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const to = Date.now()
      const result = (await dispatch(
        fetchValueHistory({
          addresses,
          chainIDs,
          assetID,
          from: to - range.span,
          to,
          samples: SAMPLES,
        }),
      )) as unknown as History | { payload?: History }
      // The background answers with the thunk's fulfilled action.
      const value = "points" in result ? result : result.payload
      if (!cancelled)
        setHistory(
          value ?? { points: [], coverageStart: undefined, backfilling: false },
        )
    }
    setHistory(null)
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
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const to = points.length > 0 ? points[points.length - 1].time : Date.now()
  const from = to - range.span

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
    const line = coords
      .map(
        ([cx, cy], i) =>
          `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`,
      )
      .join("")
    const baseline = PADDING.top + plotHeight
    const area = `${line}L${coords[coords.length - 1][0].toFixed(1)},${baseline}L${coords[0][0].toFixed(1)},${baseline}Z`
    return { x, y, coords, line, area, ticks }
  }, [from, plotHeight, plotWidth, points, to])

  const latest = points[points.length - 1]
  const first = points[0]
  const change = latest && first ? latest.value - first.value : 0
  const changeRatio = first && first.value !== 0 ? change / first.value : 0
  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined
  const shown = hovered ?? latest

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

  const coverageStart = history?.coverageStart
  const coverageCut =
    geometry &&
    coverageStart !== undefined &&
    coverageStart > from + range.span * 0.02
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
              {dayjs(hovered.time).format("MMM D, YYYY · HH:mm")}
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
      <div className="plot" ref={containerRef}>
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
            key={queryKey}
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
            {[from, from + range.span / 2, to].map((time, index) => (
              <text
                key={time}
                className="axis"
                x={PADDING.left + (plotWidth * index) / 2}
                y={HEIGHT - 4}
                textAnchor={(["start", "middle", "end"] as const)[index]}
              >
                {dayjs(time).format(range.format)}
              </text>
            ))}
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
            <path className="area" d={geometry.area} fill="url(#value_fill)" />
            <path className="line" d={geometry.line} pathLength={1} />
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
        .change.up {
          color: var(--success);
        }
        .change.down {
          color: var(--error);
        }
        .ranges {
          width: 300px;
          --panel-switcher-border: transparent;
        }
        .plot {
          position: relative;
          height: ${HEIGHT}px;
          margin-top: 8px;
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
