import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line, Legend,
} from 'recharts'

const RANK_COLORS = { Hot: '#ef4444', Warm: '#f97316', Cold: '#3b82f6' }
const PLATFORM_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6b7280']
const FUNNEL_COLORS = ['#6366f1', '#818cf8', '#f97316', '#10b981', '#ef4444']

const tooltipStyle = { borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontSize: 12, fontWeight: 700, padding: '8px 12px' }

function DashboardHome() {
  const [data, setData] = React.useState(null)
  const navigate = useNavigate()
  const apiRef = React.useRef(null)

  React.useEffect(() => {
    import('../../services/api').then(m => {
      apiRef.current = m.default
      m.default.get('/dashboard/insights').then(r => setData(r.data)).catch(() => {})
    })
  }, [])

  const goToLeads = (filterKey, filterValue) => {
    navigate(`/leads?${filterKey}=${filterValue}`)
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative pb-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <i className="fa-solid fa-chart-simple text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>Dashboard</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Decision-making insights for your lead pipeline</p>
          </div>
        </div>
        <div className="absolute -bottom-0 left-0 right-0 h-[3px] bg-black mt-4" />
      </div>

      {/* KPI Row 1 — Primary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Hot Leads" value={data.hot_leads} icon="fa-fire"
          trend={data.hot_trend} trendLabel="vs last 7d"
          onClick={() => goToLeads('rank', 'Hot')} clickable
        />
        <KpiCard
          label="Needs Action" value={data.needs_action} icon="fa-bolt"
          subtitle="Hot+Warm sitting idle"
          onClick={() => goToLeads('status', 'new')} clickable
          accent={data.needs_action > 0}
        />
        <KpiCard
          label="Pipeline Value" value={`$${(data.pipeline_value || 0).toLocaleString()}`} icon="fa-dollar-sign"
          subtitle="Hot+Warm budget total"
        />
        <KpiCard
          label="Today's Activity" value={data.today_activity} icon="fa-bolt"
          subtitle="Replies + docs generated"
        />
      </div>

      {/* KPI Row 2 — Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Response Rate" value={`${data.response_rate}%`} icon="fa-reply"
          subtitle={`${data.contacted} contacted`}
          onClick={() => goToLeads('status', 'replied')} clickable
        />
        <KpiCard
          label="Contact Hit Rate" value={`${data.contact_hit_rate}%} `} icon="fa-address-card"
          subtitle="Leads with email"
        />
        <KpiCard
          label="AI Success Rate" value={`${data.ai_success_rate}%`} icon="fa-robot"
          subtitle={`${data.ai_performance.total_attempts} attempts`}
        />
        <KpiCard
          label="Total Leads" value={data.total_leads} icon="fa-chart-simple"
          subtitle="All platforms"
          onClick={() => navigate('/leads')} clickable
        />
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Conversion Funnel</h3>
        <p className="text-xs font-bold text-gray-500 mb-5">Where leads drop off in your pipeline</p>
        <div className="space-y-3">
          {data.funnel.map((stage, i) => {
            const widthPct = Math.max(stage.percentage, 4)
            const dropoff = i > 0 ? data.funnel[i - 1].count - stage.count : 0
            return (
              <div key={stage.label} className="flex items-center gap-4">
                <div className="w-32 text-right">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{stage.label}</span>
                </div>
                <div className="flex-1 relative">
                  <div className="w-full h-9 bg-gray-100 border-[3px] border-black overflow-hidden">
                    <div
                      className="h-full transition-all duration-700 ease-out flex items-center justify-end pr-3"
                      style={{ width: `${widthPct}%`, backgroundColor: FUNNEL_COLORS[i] }}
                    >
                      <span className="text-xs font-black text-white drop-shadow-sm">{stage.count}</span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="text-xs font-black text-gray-500">{stage.percentage}%</span>
                </div>
                {i > 0 && (
                  <div className="w-20 text-right">
                    {dropoff > 0 ? (
                      <span className="text-[10px] font-black text-red-500">-{dropoff}</span>
                    ) : (
                      <span className="text-[10px] font-black text-green-500">+{Math.abs(dropoff)}</span>
                    )}
                  </div>
                )}
                {i === 0 && <div className="w-20" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Row — Weekly Comparison + Platform ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Comparison */}
        <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Weekly Comparison</h3>
            <span className={`text-xs font-black uppercase px-2 py-0.5 border-[2px] border-black ${
              data.week_change_pct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {data.week_change_pct >= 0 ? '↑' : '↓'} {Math.abs(data.week_change_pct)}%
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 mb-4">This week vs last week</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.this_week.map((d, i) => ({
              day: d.date,
              thisWeek: d.count,
              lastWeek: data.last_week[i]?.count || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                iconType="square"
                iconSize={10}
              />
              <Line type="monotone" dataKey="thisWeek" name="This Week" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', stroke: '#000', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="lastWeek" name="Last Week" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#d1d5db' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform ROI Table */}
        <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Platform ROI</h3>
          <p className="text-xs font-bold text-gray-500 mb-4">Which platforms deliver the best returns</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-[3px] border-black">
                  <th className="text-left font-black uppercase tracking-wider text-gray-500 py-2 pr-2">Platform</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 px-2">Leads</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 px-2">Hot%</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 px-2">Contact</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 px-2">Reply</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 px-2">Avg $</th>
                  <th className="text-right font-black uppercase tracking-wider text-gray-500 py-2 pl-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.platform_roi.map((p, i) => (
                  <tr key={p.platform} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="py-2 pr-2 font-black text-gray-900">{p.platform}</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-700">{p.leads}</td>
                    <td className="py-2 px-2 text-right font-bold">
                      <span className={p.hot_pct >= 20 ? 'text-red-500' : 'text-gray-600'}>{p.hot_pct}%</span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-gray-600">{p.contact_rate}%</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-600">{p.response_rate}%</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-600">{p.avg_budget > 0 ? `$${p.avg_budget.toLocaleString()}` : '—'}</td>
                    <td className="py-2 pl-2 text-right">
                      <span className={`font-black px-2 py-0.5 border-[2px] border-black text-[10px] ${
                        p.roi_score >= 7 ? 'bg-green-100 text-green-700' :
                        p.roi_score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {p.roi_score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts Row 2 — Budget + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Intelligence */}
        <div className="lg:col-span-2 bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Budget Intelligence</h3>
          <p className="text-xs font-bold text-gray-500 mb-4">Lead distribution by budget range</p>
          {data.budget_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.budget_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {data.budget_distribution.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#d1d5db' : ['#6366f1', '#818cf8', '#a5b4fc', '#f97316'][Math.min(i - 1, 3)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No budget data yet</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Quick Actions</h3>
          <p className="text-xs font-bold text-gray-500 mb-4">What needs your attention</p>
          {data.quick_actions.length > 0 ? (
            <div className="space-y-2">
              {data.quick_actions.map(action => {
                const colorMap = {
                  orange: 'bg-orange-500',
                  blue: 'bg-blue-500',
                  red: 'bg-red-500',
                  gray: 'bg-gray-500',
                }
                const textColorMap = {
                  orange: 'text-orange-600',
                  blue: 'text-blue-600',
                  red: 'text-red-600',
                  gray: 'text-gray-600',
                }
                return (
                  <button
                    key={action.id}
                    onClick={() => goToLeads(action.filter_key, action.filter_value)}
                    className="w-full text-left bg-gray-50 border-[3px] border-black p-3 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${colorMap[action.color]} border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                        <i className={`fa-solid ${action.icon} text-white text-xs`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-gray-900 uppercase tracking-wider">{action.label}</div>
                        <div className="text-[10px] font-bold text-gray-500 truncate">{action.detail}</div>
                      </div>
                      <div className={`text-lg font-black ${textColorMap[action.color]}`}>{action.count}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[160px] text-center">
              <div className="w-10 h-10 bg-green-100 border-[3px] border-black flex items-center justify-center mb-3">
                <i className="fa-solid fa-check text-green-600"></i>
              </div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider">All caught up</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">No pending actions</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — AI Performance + Contact Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Performance */}
        <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">AI Performance</h3>
          <p className="text-xs font-bold text-gray-500 mb-4">Auto-apply and automation stats</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 border-[2px] border-black">
              <div className="text-lg font-black text-gray-900">{data.ai_performance.total_attempts}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Attempts</div>
            </div>
            <div className="text-center p-3 bg-green-50 border-[2px] border-black">
              <div className="text-lg font-black text-green-600">{data.ai_performance.success_count}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Success</div>
            </div>
            <div className="text-center p-3 bg-red-50 border-[2px] border-black">
              <div className="text-lg font-black text-red-600">{data.ai_performance.fail_count}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Failed</div>
            </div>
          </div>
          {Object.keys(data.ai_performance.model_usage).length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Model Usage</h4>
              <div className="space-y-1">
                {Object.entries(data.ai_performance.model_usage).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
                  <div key={model} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 h-2 bg-gray-100 border border-black overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${(count / Math.max(data.ai_performance.total_attempts, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-600 w-20 truncate">{model}</span>
                    <span className="font-black text-gray-900 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.ai_performance.common_errors.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Common Errors</h4>
              <div className="space-y-1">
                {data.ai_performance.common_errors.map((err, i) => (
                  <div key={i} className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 p-2 truncate">
                    {err.error} <span className="text-gray-400 ml-1">×{err.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Health */}
        <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Contact Health</h3>
          <p className="text-xs font-bold text-gray-500 mb-4">How well are scrapers finding contacts</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center p-3 bg-green-50 border-[2px] border-black">
              <div className="text-lg font-black text-green-600">{data.contact_health.with_email}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">With Email</div>
            </div>
            <div className="text-center p-3 bg-blue-50 border-[2px] border-black">
              <div className="text-lg font-black text-blue-600">{data.contact_health.with_phone}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">With Phone</div>
            </div>
            <div className="text-center p-3 bg-red-50 border-[2px] border-black">
              <div className="text-lg font-black text-red-600">{data.contact_health.no_contact}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">No Contact</div>
            </div>
          </div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Contact Rate by Platform</h4>
          <div className="space-y-2">
            {data.contact_health.by_platform.map(p => (
              <div key={p.platform} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 w-24 truncate">{p.platform}</span>
                <div className="flex-1 h-3 bg-gray-100 border border-black overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${p.rate >= 70 ? 'bg-green-500' : p.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${p.rate}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-700 w-10 text-right">{p.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Recent Leads</h3>
        <RecentLeadsList />
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, trend, trendLabel, subtitle, onClick, clickable, accent }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-4 ${
        clickable ? 'cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]' : ''
      } ${accent ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
    >
      <div className={`w-10 h-10 ${accent ? 'bg-orange-500' : 'bg-gray-900'} border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
        <i className={`fa-solid ${icon} text-sm text-white`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-black text-gray-900 tracking-tight">{value ?? '-'}</div>
          {trend !== undefined && (
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border border-black ${
              trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</div>
        {subtitle && <div className="text-[10px] font-bold text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      {clickable && (
        <i className="fa-solid fa-arrow-right text-gray-300 group-hover:text-orange-500 text-xs"></i>
      )}
    </div>
  )
}

function RecentLeadsList() {
  const [leads, setLeads] = React.useState([])
  React.useEffect(() => {
    import('../../services/api').then(m => {
      m.default.get('/leads/?limit=5').then(r => setLeads(r.data)).catch(() => {})
    })
  }, [])

  if (leads.length === 0) return null

  return (
    <div className="space-y-2">
      {leads.map(lead => (
        <div key={lead.id} className="flex items-center gap-3 p-3 bg-gray-50 border-[2px] border-black hover:bg-orange-50 transition-colors">
          <span className="bg-gray-200 border-[2px] border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{lead.platform}</span>
          <span className="flex-1 text-xs font-bold text-gray-900 truncate">{lead.title}</span>
          <span className={`px-2 py-0.5 border-[2px] border-black text-[10px] font-black ${
            lead.rank === 'Hot' ? 'bg-red-100 text-red-700' :
            lead.rank === 'Warm' ? 'bg-orange-100 text-orange-700' :
            'bg-blue-100 text-blue-700'
          }`}>{lead.rank}</span>
        </div>
      ))}
    </div>
  )
}

export default DashboardHome
