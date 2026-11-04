import ReactMarkdown from "react-markdown"
import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  FileCode2,
  Lightbulb,
  LoaderCircle,
  Package,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  analystCategories,
  suggestedQuestions,
} from "@/data/analystData"

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001"

type QueryResult = {
  title: string
  sql: string
  columns: string[]
  rows: Record<string, unknown>[]
  error: string | null
}

type AnalystResponse = {
  id: string
  question: string
  insights: boolean
  summary: string
  analysis: string
  results: QueryResult[]
}

const orange = "#ff6b35"

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—"

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value)
  }

  return String(value)
}

function downloadFile(
  contents: string,
  filename: string,
  type = "text/csv",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function resultsToCsv(results: QueryResult[]) {
  return results
    .map((result) => {
      const escape = (value: unknown) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`

      const header = result.columns.map(escape).join(",")
      const rows = result.rows.map((row) =>
        result.columns.map((column) => escape(row[column])).join(","),
      )

      return [
        escape(result.title),
        header,
        ...rows,
      ].join("\n")
    })
    .join("\n\n")
}

function SuggestedQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void
}) {
  const icons = {
    sales: BarChart3,
    menu: UtensilsCrossed,
    inventory: Package,
    reviews: ShoppingBag,
  }

  return (
    <section className="analyst-welcome panel">
      <div className="analyst-greeting">
        <span>
          <Sparkles size={17} />
        </span>
        <p>
          Good morning. What would you like to understand about your restaurant
          business today?
        </p>
      </div>

      <div className="analyst-category-grid">
        {analystCategories.map((category) => {
          const Icon = icons[category.icon as keyof typeof icons]

          return (
            <button
              key={category.title}
              onClick={() => onSelect(category.question)}
            >
              <span>
                {Icon && <Icon size={15} />}
              </span>
              <strong>{category.title}</strong>
              <small>{category.description}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function LoadingState({ question }: { question: string }) {
  return (
    <>
      <div className="analyst-question">
        <p>{question}</p>
      </div>

      <section className="analysis-state panel" aria-live="polite">
        <div className="analysis-loader">
          <LoaderCircle size={24} />
        </div>

        <div>
          <strong>Analyzing your restaurant data</strong>
          <p>Generating SQL, querying Snowflake, and preparing insights...</p>
        </div>

        <div className="loading-steps">
          <span className="done">
            <Check size={13} /> Understanding question
          </span>
          <span className="active">
            <LoaderCircle size={13} /> Running secure query
          </span>
          <span>Preparing response</span>
        </div>
      </section>
    </>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <section className="analysis-state analysis-error panel" role="alert">
      <span>
        <AlertCircle size={22} />
      </span>

      <div>
        <strong>We couldn't complete this analysis</strong>
        <p>{message}</p>
      </div>

      <button onClick={onRetry}>
        <RotateCcw size={14} /> Try again
      </button>
    </section>
  )
}

function EmptyState({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <section className="analyst-empty">
      <span>
        <Bot size={25} />
      </span>

      <h2>Start a new analysis</h2>
      <p>
        Ask a question in plain language or choose a common business question.
      </p>

      <div>
        {suggestedQuestions.slice(0, 2).map((question) => (
          <button key={question} onClick={() => onSelect(question)}>
            {question}
          </button>
        ))}
      </div>
    </section>
  )
}

function ResultsTable({ result }: { result: QueryResult }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="answer-panel query-results panel">
      <div className="answer-panel-head">
        <button
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <strong>{result.title}</strong>
          <span>{result.rows.length} rows</span>
        </button>

        <button
          onClick={() =>
            downloadFile(
              resultsToCsv([result]),
              "query-results.csv",
            )
          }
        >
          <Download size={14} /> Download CSV
        </button>
      </div>

      {result.error && (
        <p className="analysis-error-message">{result.error}</p>
      )}

      {expanded && !result.error && (
        <div className="analyst-table-scroll">
          <table>
            <thead>
              <tr>
                {result.columns.map((column) => (
                  <th key={column}>{column.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {result.rows.map((row, index) => (
                <tr key={index}>
                  {result.columns.map((column) => (
                    <td key={column}>{formatValue(row[column])}</td>
                  ))}
                </tr>
              ))}

              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={result.columns.length}>
                    No rows returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SqlPanel({ result }: { result: QueryResult }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copySql = async () => {
    await navigator.clipboard.writeText(result.sql)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="answer-panel sql-panel panel">
      <div className="answer-panel-head">
        <button
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <FileCode2 size={15} />
          <strong>SQL Generated</strong>
        </button>

        <span className={result.error ? "" : "query-success"}>
          {result.error ? (
            <AlertCircle size={12} />
          ) : (
            <Check size={12} />
          )}
          {result.error ? "Query failed" : "Query executed"}
        </span>
      </div>

      {expanded && (
        <div className="sql-code">
          <div>
            <span>Read-only query</span>
            <button onClick={copySql}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy SQL"}
            </button>
          </div>

          <pre>
            <code>{result.sql}</code>
          </pre>
        </div>
      )}
    </section>
  )
}

function AnalysisChart({ result }: { result: QueryResult }) {
  if (result.columns.length < 2 || result.rows.length === 0) return null

  // Identify the first column containing dates.
  const dateColumn = result.columns.find((column) => {
    const name = column.toLowerCase()

    return (
      name.includes("date") ||
      name.includes("month") ||
      name.includes("year")
    )
  })

  // Identify a numeric column.
  const numericColumn = result.columns.find((column) =>
    result.rows.some((row) => typeof row[column] === "number"),
  )

  if (!numericColumn) return null

  // Date-based results use line charts.
  const isTrend = Boolean(dateColumn)
  const labelColumn = dateColumn || result.columns[0]

  const chartData = result.rows
    .filter((row) => typeof row[numericColumn] === "number")
    .map((row) => ({
      label: String(row[labelColumn] ?? ""),
      value: Number(row[numericColumn]),
    }))

  if (chartData.length === 0) return null

  // Sort dates chronologically for trend charts.
  if (isTrend) {
    chartData.sort(
      (a, b) =>
        new Date(a.label).getTime() - new Date(b.label).getTime(),
    )
  }

  return (
    <div className="analysis-chart">
      <div>
        <h3>{result.title}</h3>
        <span>
          {isTrend ? "Sales / performance trend" : "Category comparison"}
          {" · Hover for exact values"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={205}>
        {isTrend ? (
          <LineChart
            data={chartData}
            margin={{ top: 6, right: 20, left: 2, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e8edf1"
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={25}
            />

            <YAxis
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(value) => [
                formatValue(value),
                numericColumn,
              ]}
              labelFormatter={(label) => String(label)}
            />

            <Line
              type="monotone"
              dataKey="value"
              name={numericColumn}
              stroke={orange}
              strokeWidth={2.5}
              dot={{ r: 3, fill: orange }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        ) : (
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 6, right: 28, left: 2, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="#e8edf1"
            />

            <XAxis
              type="number"
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              type="category"
              dataKey="label"
              width={125}
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(value) => [
                formatValue(value),
                numericColumn,
              ]}
              cursor={{ fill: "#fff1eb" }}
            />

            <Bar
              dataKey="value"
              fill={orange}
              radius={[0, 4, 4, 0]}
              barSize={17}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function AnalysisAnswer({
  response,
}: {
  response: AnalystResponse
}) {
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const copyResponse = async () => {
    await navigator.clipboard.writeText(
      `${response.question}\n\n${response.analysis}`,
    )

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <div className="analyst-question">
        <p>{response.question}</p>
      </div>

      <div className="analysis-complete">
        <div className="analysis-main panel">
          <div className="analysis-title-row">
            <div>
              <span className="analysis-icon">
                <Bot size={15} />
              </span>
              <strong>Analysis Complete</strong>
            </div>

            <div className="analysis-actions">
              <button
                onClick={copyResponse}
                aria-label="Copy response"
              >
                {copied ? <Check size={15} /> : <Clipboard size={15} />}
              </button>
            </div>
          </div>

          <p className="analysis-summary">{response.summary}</p>

          <div className="finding-section">
            <h3>
              <Lightbulb size={14} /> AI Analysis and Recommendations
            </h3>

            <div className="analysis-markdown">
              <ReactMarkdown>{response.analysis}</ReactMarkdown>
            </div>
          </div>

          <button
            className="caveat-toggle"
            onClick={() => setShowDetails((value) => !value)}
            aria-expanded={showDetails}
          >
            {showDetails ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            Query details and methodology
          </button>

          {showDetails && (
            <div className="caveat-list">
              <p><strong>Analysis ID:</strong> {response.id}</p>
              <p><strong>Insight generation:</strong> {response.insights ? "Enabled" : "Disabled"}</p>
              <p><strong>Queries generated:</strong> {response.results.length}</p>
            </div>
          )}

          {response.results.map((result, index) => (
            <AnalysisChart key={`${result.title}-${index}`} result={result} />
          ))}
        </div>

        <aside className="analysis-details">
          {response.results.map((result, index) => (
            <div key={`${result.title}-${index}`}>
              <ResultsTable result={result} />
              <SqlPanel result={result} />
            </div>
          ))}
        </aside>
      </div>
    </>
  )
}

function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  loading,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  loading: boolean
}) {
  return (
    <form
      className="analyst-composer"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()

        if (loading) {
          onStop()
        } else {
          onSubmit()
        }
      }}
    >
      <textarea
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onInput={(e) => {
    const textarea = e.currentTarget
    textarea.style.height = "auto"

    const lineHeight = parseFloat(
      getComputedStyle(textarea).lineHeight
    )
    const maxHeight = lineHeight * 4

  textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        maxHeight
      )}px`

      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden"
    }}
    rows={1}
    placeholder="Ask a question about your restaurant data..."
  />

      <button
        type="submit"
        disabled={!loading && !value.trim()}
        aria-label={loading ? "Stop analysis" : "Send question"}
        title={loading ? "Stop analysis" : "Send question"}
      >
        {loading ? <span className="analyst-stop-icon" /> : <Send size={16} />}
        {loading ? "Stop" : "Send"}
      </button>

      <small>Answers are generated from your connected business data.</small>
    </form>
  )
}

export default function AnalystPage() {
  const [input, setInput] = useState("")
  const [response, setResponse] = useState<AnalystResponse | null>(null)
  const [question, setQuestion] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState("")
  const controller = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controller.current?.abort()
    },
    [],
  )

  const analyze = async (nextQuestion = input) => {
    const trimmedQuestion = nextQuestion.trim()

    if (!trimmedQuestion || status === "loading") return

    controller.current?.abort()

    const abortController = new AbortController()
    controller.current = abortController

    setQuestion(trimmedQuestion)
    setInput("")
    setError("")
    setResponse(null)
    setStatus("loading")

    try {
      const result = await fetch(`${API_URL}/api/analyst`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          insights: true,
        }),
        signal: abortController.signal,
      })

      const data = await result.json()

      if (!result.ok) {
        throw new Error(
          data.detail ||
          `The API returned an error (${result.status}).`,
        )
        
      }

      setResponse(data as AnalystResponse)
      setStatus("idle")
    } catch (analysisError) {
      if ((analysisError as Error).name === "AbortError") return

      setError(
        (analysisError as Error).message ||
        "An unexpected error occurred.",
      )
      setStatus("error")
    }
  }

  const clear = () => {
    controller.current?.abort()
    controller.current = null
    setResponse(null)
    setQuestion("")
    setInput("")
    setStatus("idle")
    setError("")
  }
  const retry = () => {
    if (question) analyze(question)
  }
  const stopAnalysis = () => {
    controller.current?.abort()
    controller.current = null
    setStatus("idle")
    setError("")
}
  
  const allResults = response?.results ?? []

  return (
    <div className="analyst-page">
      <div className="analyst-statusbar">
        <div>
          <span>
            API: <b>Restaurant Intelligence</b>
          </span>
          <i />
          <span>
            Data source: <strong>RESTAURANT_DB.MARTS</strong> (Synthetic)
          </span>
        </div>

        <div>
          <button onClick={clear}>
            <Trash2 size={14} /> Clear conversation
          </button>

          <button
            disabled={!response || allResults.length === 0}
            onClick={() =>
              downloadFile(
                resultsToCsv(allResults),
                "restaurant-analysis.csv",
              )
            }
          >
            <Download size={14} /> Export results
          </button>
        </div>
      </div>

      <SuggestedQuestions onSelect={analyze} />

      <div className="analyst-thread">
        {!response && status === "idle" && (
          <EmptyState onSelect={analyze} />
        )}

        {status === "loading" && (
          <LoadingState question={question} />
        )}

        {status === "error" && (
          <>
            <div className="analyst-question">
              <p>{question}</p>
            </div>

            <ErrorState message={error} onRetry={retry} />
          </>
        )}

        {status === "idle" && response && (
          <AnalysisAnswer response={response} />
        )}
      </div>

      <div className="analyst-quick-questions">
        {suggestedQuestions.map((suggestion) => (
          <button
            key={suggestion}
            disabled={status === "loading"}
            onClick={() => analyze(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

  <ChatComposer
    value={input}
    onChange={setInput}
    onSubmit={() => analyze()}
    onStop={stopAnalysis}
    loading={status === "loading"}
  />
    </div>
  )
}
