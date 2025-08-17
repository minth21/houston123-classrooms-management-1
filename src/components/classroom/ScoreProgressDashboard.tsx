"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { classroomService } from '@/lib/api/classroom';
import { buildProgressOverview } from '@/lib/utils/progressUtils';
import { MonthlyScoreDataset, ProgressOverview, ProgressStudentSummary, ProgressStudentMonthly } from '@/types/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ScoreProgressDashboardProps {
  classID: string;
  baseMonth: number; // current selected month
  baseYear: number;  // current selected year
  type?: number; // score type (process/final)
}

export const ScoreProgressDashboard: React.FC<ScoreProgressDashboardProps> = ({ classID, baseMonth, baseYear, type = 0 }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<MonthlyScoreDataset[]>([]);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ProgressStudentSummary | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    classroomService.getClassroomScoresHistory({ classID, baseMonth, baseYear, span: 3, type })
      .then(res => { if (!active) return; setDatasets(res); })
      .finally(()=> active && setLoading(false));
    return () => { active = false; };
  }, [classID, baseMonth, baseYear, type]);

  useEffect(() => {
    if (!datasets.length) { setOverview(null); return; }
    const ov = buildProgressOverview({ classID, datasets });
    setOverview(ov);
  }, [datasets, classID]);

  const chartData = useMemo(() => {
    if (!overview) return { months: [] as string[], perSkill: { listening: [] as number[], speaking: [] as number[], reading: [] as number[], writing: [] as number[] }, overall: [] as number[] };
    const monthKeys: string[] = [];
    const perSkill: Record<string, number[]> = { listening: [], speaking: [], reading: [], writing: [] };
    const overall: number[] = [];
    // Collect distinct months from overview.range (sorted oldest->newest already in students data)
    const monthSet = new Set<string>();
    overview.students.forEach(s => s.months.forEach(m => monthSet.add(`${m.year}-${m.month}`)));
    const ordered = Array.from(monthSet).sort((a,b)=> {
      const [ya,ma] = a.split('-').map(Number); const [yb,mb] = b.split('-').map(Number); return (ya*100+ma)-(yb*100+mb);
    });
    ordered.forEach(key => {
      const [y,m] = key.split('-').map(Number);
      monthKeys.push(`${m}/${y}`);
      const skillAcc: Record<string,{sum:number;count:number}> = { listening:{sum:0,count:0}, speaking:{sum:0,count:0}, reading:{sum:0,count:0}, writing:{sum:0,count:0} };
      let overallSum = 0; let overallCount = 0;
      overview.students.forEach(s => {
        const monthEntry = s.months.find(mm=> mm.month===m && mm.year===y);
        if (monthEntry) {
          if (typeof monthEntry.average === 'number') { overallSum += monthEntry.average; overallCount++; }
          (['listening','speaking','reading','writing'] as const).forEach(sk => {
            const val = monthEntry.skills[sk];
            if (typeof val === 'number') { skillAcc[sk].sum += val; skillAcc[sk].count++; }
          });
        }
      });
      (['listening','speaking','reading','writing'] as const).forEach(sk => {
        perSkill[sk].push(skillAcc[sk].count ? Number((skillAcc[sk].sum/skillAcc[sk].count).toFixed(2)) : 0);
      });
      overall.push(overallCount ? Number((overallSum/overallCount).toFixed(2)) : 0);
    });
  return { months: monthKeys, perSkill: perSkill as { listening: number[]; speaking: number[]; reading: number[]; writing: number[] }, overall };
  }, [overview]);

  if (loading) return <div className="text-sm text-muted-foreground">{t('loading')}</div>;
  if (!overview) return <div className="text-sm text-muted-foreground">{t('scoreSheet.empty')}</div>;

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{t('progress.section.kpis','Progress Overview')}</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label={t('progress.kpis.improved', 'Improved')} value={overview.kpis.improved} variant="positive" />
          <KPI label={t('progress.kpis.declined', 'Declined')} value={overview.kpis.declined} variant="negative" />
            <KPI label={t('progress.kpis.unchanged', 'Unchanged')} value={overview.kpis.unchanged} variant="neutral" />
          <KPI label={t('progress.kpis.avgDelta', 'Avg Δ')} value={overview.kpis.avgDelta} suffix="" variant={overview.kpis.avgDelta >= 0 ? 'positive':'negative'} />
        </div>
      </section>

      {/* Chart Section */}
      <section className="rounded-lg border bg-card/50 backdrop-blur-sm p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold leading-tight">{t('progress.section.classTrend','Class Trend')}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-prose">{t('progress.section.classTrendDesc','Grouped skill bars with overall performance line for the last 3 months.')}</p>
          </div>
        </div>
        <EnhancedProgressChart data={chartData} />
      </section>

      {/* Students Table Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{t('progress.section.students','Student Progress')}</h3>
          <div className="text-[10px] text-muted-foreground">{t('progress.section.clickRow','Click a row for detail')}</div>
        </div>
        <StudentsProgressTable students={overview.students} onSelect={(s)=>setSelectedStudent(s)} />
      </section>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {selectedStudent?.userName?.[0]}
              </span>
              <span>{selectedStudent?.userName} <span className="text-muted-foreground font-normal">({selectedStudent?.userID})</span></span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[480px] pr-1 mt-4">
            {selectedStudent && <StudentDetail student={selectedStudent} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KPI: React.FC<{ label: string; value: number | string; suffix?: string; variant?: 'positive'|'negative'|'neutral' }>
 = ({ label, value, suffix, variant='neutral' }) => {
  const tone = variant==='positive' ? 'text-emerald-600 dark:text-emerald-400' : variant==='negative' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
  const ring = variant==='positive' ? 'ring-emerald-500/20' : variant==='negative' ? 'ring-red-500/20' : 'ring-border/50';
  return (
    <div className={`relative rounded-lg border bg-gradient-to-br from-background to-muted/40 p-4 shadow-sm hover:shadow-md transition-shadow ring-1 ${ring}`}>
      <div className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-semibold leading-none ${tone}`}>{value}{suffix}</div>
    </div>
  );
};

interface EnhancedChartData { months: string[]; perSkill: { listening: number[]; speaking: number[]; reading: number[]; writing: number[] }; overall: number[] }
const skillColors: Record<string,string> = {
  listening: 'hsl(var(--chart-1, 210 90% 55%))',
  speaking: 'hsl(var(--chart-2, 150 70% 45%))',
  reading: 'hsl(var(--chart-3, 40 90% 55%))',
  writing: 'hsl(var(--chart-4, 280 65% 60%))',
};
const EnhancedProgressChart: React.FC<{ data: EnhancedChartData }> = ({ data }) => {
  const { t } = useTranslation();
  if (!data.months.length) return null;
  // Determine max for scale across skills and overall
  const allVals = [...data.overall, ...Object.values(data.perSkill).flat()];
  const max = Math.max(10, ...allVals); // guard minimum scale 10
  const barWidth = 28; const groupGap = 28; const skillGap = 4;
  const skills = Object.keys(data.perSkill) as (keyof typeof data.perSkill)[];
  const chartWidth = data.months.length * (barWidth * skills.length + groupGap);
  const chartHeight = 180;
  // Tooltip state (client only)
  const [tip, setTip] = useState<{ x:number; y:number; label:string; value:number } | null>(null);
  const svgRef = useRef<SVGSVGElement|null>(null);
  return (
    <div className="rounded border p-4">
  <h4 className="text-sm font-medium mb-3">{t('progress.chart.title','Class Progress')} ({data.months[0]} → {data.months[data.months.length-1]})</h4>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={chartWidth} height={chartHeight} className="select-none">
          {/* Y axis grid */}
          {Array.from({length:6},(_,i)=> i).map(i=>{
            const val = (max/5)*i; const y = chartHeight - (val/max)* (chartHeight-30) - 10;
            return <g key={i}>
              <line x1={0} x2={chartWidth} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.08} />
              <text x={0} y={y-2} fontSize={10} className="fill-muted-foreground">{val.toFixed(0)}</text>
            </g>;
          })}
          {data.months.map((m, idx) => {
            const groupX = idx * (barWidth * skills.length + groupGap) + 40;
            return (
              <g key={m}>
                {/* Bars per skill */}
                {skills.map((sk, sIdx) => {
                  const v = data.perSkill[sk][idx] || 0;
                  const h = (v / max) * (chartHeight - 30);
                  const x = groupX + sIdx * (barWidth + skillGap);
                  const y = chartHeight - h - 10;
                  return <rect key={sk} x={x} y={y} width={barWidth} height={h} rx={3} fill={skillColors[sk]} fillOpacity={0.7} onMouseEnter={(e)=>{
                    setTip({ x: x + barWidth/2, y, label: `${m} • ${sk}`, value: v });
                  }} onMouseLeave={()=> setTip(null)} />;
                })}
                {/* Overall point */}
                {(() => {
                  const ov = data.overall[idx];
                  const y = chartHeight - (ov / max) * (chartHeight - 30) - 10;
                  const xCenter = groupX + (barWidth * skills.length + skillGap*(skills.length-1))/2 - 4;
                  return <g>
                    <circle cx={xCenter} cy={y} r={5} fill="var(--foreground)" onMouseEnter={()=> setTip({ x: xCenter, y: y-8, label: `${m} • overall`, value: ov })} onMouseLeave={()=> setTip(null)} />
                  </g>;
                })()}
                {/* Month label */}
                <text x={groupX + (barWidth * skills.length + skillGap*(skills.length-1))/2} y={chartHeight-2} fontSize={11} textAnchor="middle" className="fill-muted-foreground">{m}</text>
              </g>
            );
          })}
          {/* Overall line */}
          {data.months.length > 1 && (()=>{
            const path = data.months.map((m,idx)=>{
              const groupX = idx * (barWidth * skills.length + groupGap) + 40 + (barWidth * skills.length + skillGap*(skills.length-1))/2 - 4;
              const ov = data.overall[idx];
              const y = chartHeight - (ov / max) * (chartHeight - 30) - 10;
              return `${idx===0?'M':'L'}${groupX},${y}`;
            }).join(' ');
            return <path d={path} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeDasharray="4 2" />;
          })()}
          {tip && <g pointerEvents="none" transform={`translate(${tip.x},${tip.y})`}>
            <rect x={-50} y={-34} width={100} height={28} rx={4} fill="var(--background)" stroke="var(--border)" />
            <text x={0} y={-18} textAnchor="middle" fontSize={10} className="fill-muted-foreground">{tip.label}</text>
            <text x={0} y={-6} textAnchor="middle" fontSize={12} className="font-medium">{tip.value}</text>
          </g>}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        {skills.map(sk => (
          <div key={sk} className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: skillColors[sk] }} />
            <span className="capitalize">{t(`progress.chart.legend.${sk}`, sk)}</span>
          </div>
        ))}
        <div className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-foreground" />
          <span>{t('progress.chart.legend.overall', t('progress.chart.overall','Overall'))}</span>
        </div>
      </div>
    </div>
  );
};

const StudentsProgressTable: React.FC<{ students: ProgressStudentSummary[]; onSelect: (s: ProgressStudentSummary)=>void; }> = ({ students, onSelect }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 backdrop-blur">
          <tr className="text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.student','Student')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.m1','M1')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.m2','M2')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.m3','M3')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.delta','Δ')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('progress.table.trend','Trend')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {students.map((s, idx) => {
            const months = s.months; // oldest -> newest
            const last3 = months.slice(-3);
            const [m1, m2, m3] = last3; // may be undefined if <3 months
            return (
              <tr key={s.userID} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={()=>onSelect(s)}>
                <td className="px-3 py-2 text-xs text-muted-foreground">{idx+1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {s.userName[0]}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium leading-tight">{s.userName}</span>
                      <span className="text-[10px] text-muted-foreground">{s.userID}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{m1?.average ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{m2?.average ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{m3?.average ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{typeof s.latestDelta === 'number' ? s.latestDelta : '-'}</td>
                <td className="px-3 py-2"><TrendBadge trend={s.trend} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const TrendBadge: React.FC<{ trend: ProgressStudentSummary['trend'] }> = ({ trend }) => {
  const colorMap: Record<string, string> = {
    improved: 'bg-green-500/15 text-green-600 dark:text-green-400',
    declined: 'bg-red-500/15 text-red-600 dark:text-red-400',
    unchanged: 'bg-muted text-muted-foreground',
    insufficient: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
  };
  const labelMap: Record<string, string> = {
    improved: '↑',
    declined: '↓',
    unchanged: '→',
    insufficient: '·'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[trend]}`}>{labelMap[trend]}</span>;
};

const StudentDetail: React.FC<{ student: ProgressStudentSummary }> = ({ student }) => {
  const { t } = useTranslation();
  const skills: Array<keyof ProgressStudentMonthly['skills']> = ['listening','speaking','reading','writing'];
  return (
    <div className="space-y-8">
      <section>
        <header className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{t('progress.detail.averages','Averages')}</h4>
          <span className="text-[10px] text-muted-foreground">{student.months.length} {t('progress.detail.months','months')}</span>
        </header>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/60">
              <tr className="text-[10px] tracking-wide text-muted-foreground">
                <th className="px-2 py-1 text-left font-medium">{t('progress.detail.month','Month')}</th>
                <th className="px-2 py-1 text-left font-medium">{t('progress.detail.avg','Avg')}</th>
                {skills.map(k=> <th key={String(k)} className="px-2 py-1 text-left font-medium capitalize">{t(`progress.chart.legend.${k}`, k)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {student.months.map(m => (
                <tr key={`${m.year}-${m.month}`} className="hover:bg-muted/40">
                  <td className="px-2 py-1 font-mono">{m.month}/{m.year}</td>
                  <td className="px-2 py-1 font-mono">{m.average ?? '-'}</td>
                  {skills.map(k=> <td key={String(k)} className="px-2 py-1 font-mono">{m.skills[k] ?? '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <header className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{t('progress.detail.trend','Trend')}</h4>
          <span className="text-[10px] text-muted-foreground">{t('progress.detail.sparklineHint','Smoothed sparkline')}</span>
        </header>
        <div className="rounded-md border bg-card/40 p-2 inline-block">
          <TrendSparkline months={student.months} />
        </div>
      </section>
    </div>
  );
};

const TrendSparkline: React.FC<{ months: ProgressStudentMonthly[] }> = ({ months }) => {
  const [active, setActive] = React.useState<number | null>(null);
  const points = months.filter(m => typeof m.average === 'number');
  const { t } = useTranslation();
  if (points.length < 2) return <div className="text-xs text-muted-foreground">{t('progress.detail.insufficient','Insufficient data')}</div>;
  const max = Math.max(...points.map(p=> p.average!));
  const min = Math.min(...points.map(p=> p.average!));
  const range = max - min || 1;
  const width = 180; const height = 70; const paddingY = 4;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p,i)=>{
    const x = i * step;
    const y = (height - paddingY) - ((p.average! - min) / range) * (height - paddingY*2);
    return { x, y, value: p.average!, label: `${p.month}/${p.year}` };
  });
  // Smooth path (cubic) + area
  const lineD = coords.reduce((acc,c,i,arr)=>{
    if(i===0) return `M${c.x},${c.y}`;
    const prev = arr[i-1];
    const cp1x = prev.x + (c.x - prev.x)/2; const cp1y = prev.y;
    const cp2x = prev.x + (c.x - prev.x)/2; const cp2y = c.y;
    return acc + ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${c.x},${c.y}`;
  },'');
  const areaD = `${lineD} L ${coords[coords.length-1].x},${height} L 0,${height} Z`;
  // Segment lines (straight) for rise/fall coloring
  const segments = coords.slice(1).map((c,i)=>{
    const prev = coords[i];
    let color = '#6b7280';
    if (c.value > prev.value) color = '#16a34a';
    else if (c.value < prev.value) color = '#dc2626';
    return { x1: prev.x, y1: prev.y, x2: c.x, y2: c.y, color };
  });
  const gradientId = React.useId();
  return (
    <div className="relative" style={{ width: width, height: height }}
      onMouseLeave={()=> setActive(null)}>
      <svg width={width} height={height} className="overflow-visible block">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
        <path d={lineD} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
        {segments.map((s,i)=>(
          <path key={i} d={`M${s.x1},${s.y1} L${s.x2},${s.y2}`} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
        ))}
        {coords.map((c,i)=>(
          <g key={i} onMouseEnter={()=> setActive(i)}>
            <circle cx={c.x} cy={c.y} r={active===i?4:3} className="fill-background" stroke="hsl(var(--primary))" strokeWidth={1.5} />
          </g>
        ))}
        {active != null && (
          <g>
            <line x1={coords[active].x} x2={coords[active].x} y1={0} y2={height} stroke="#999" strokeDasharray="4 4" />
          </g>
        )}
      </svg>
      {active != null && (
        <div className="pointer-events-none absolute z-10 px-2 py-1 rounded bg-popover text-popover-foreground text-[10px] shadow border"
             style={{ left: Math.min(Math.max(0, coords[active].x - 30), width - 60), top: 0 }}>
          <div className="font-medium">{coords[active].label}</div>
          <div>{coords[active].value.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
};
