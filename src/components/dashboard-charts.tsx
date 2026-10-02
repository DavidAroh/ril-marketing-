import Link from "next/link";
import { channelLabel } from "@/lib/channels";
import type { KpiProgress } from "@/lib/audience/kpis";

const TINTS = ["#e5e7eb", "#9ca3af", "#606975", "#39424e"];

export function ContentMixChart({ channels, total }: { channels: { channel: string; count: number }[]; total: number }) {
  const count = channels.reduce((sum, item) => sum + item.count, 0);
  const ordered = [...channels].sort((a,b) => b.count-a.count);
  const slices = ordered.slice(0,3);
  if (channels.length > 3) slices.push({ channel: "Other", count: ordered.slice(3).reduce((sum,item)=>sum+item.count,0) });
  let offset = 0;
  const circumference = 2 * Math.PI * 72;
  return (
    <section aria-labelledby="content-mix-heading" className="overflow-hidden rounded-xl border border-[#303c4c] bg-[#182332] text-white">
      <header className="px-5 pt-5"><h2 id="content-mix-heading" className="text-[15px] font-semibold">Content mix</h2><p className="mt-1 text-xs text-[#b2c1d4]">{count < total ? `${count} sampled assets of ${total}` : `${count} assets across your channels`}</p></header>
      {!count ? <div className="px-5 py-12 text-sm text-[#d7e0eb]">Create content from an activity to see your channel mix. <Link href="/activities" className="mt-4 block underline">Open activities</Link></div> : <figure className="p-5">
        <svg viewBox="0 0 220 200" className="mx-auto w-full max-w-64" role="img" aria-label={`Content mix: ${slices.map(s=>`${channelLabel(s.channel)} ${Math.round(s.count/count*100)} percent`).join(", ")}`}>
          {slices.map((slice,i)=>{
            const fraction=slice.count/count;
            const dash=Math.max(0,fraction*circumference-(slices.length>1?7:0));
            const start=offset; offset+=fraction*circumference;
            const mid=(start/circumference+fraction/2)*2*Math.PI-Math.PI/2;
            return <g key={slice.channel}><circle cx="110" cy="100" r="72" fill="none" stroke={TINTS[i]} strokeWidth="36" strokeDasharray={`${dash} ${circumference-dash}`} strokeDashoffset={-start} transform="rotate(-90 110 100)" strokeLinecap={slices.length>1?"butt":"round"}/>{fraction>.08&&<text x={110+72*Math.cos(mid)} y={104+72*Math.sin(mid)} textAnchor="middle" fontSize="12" fontWeight="700" fill={i<2?"#182332":"#ffffff"}>{Math.round(fraction*100)}%</text>}</g>;
          })}
        </svg>
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-3 text-xs" aria-label="Channel legend">{slices.map((slice,i)=><li key={slice.channel} className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-sm" style={{background:TINTS[i]}} aria-hidden="true"/><span className="flex-1">{channelLabel(slice.channel)}</span><span className="tabular-nums text-[#b2c1d4]">{slice.count}</span></li>)}</ul>
        <figcaption className="sr-only">Share of content by channel. {slices.map(s=>`${channelLabel(s.channel)}: ${s.count} assets.`).join(" ")}</figcaption>
      </figure>}
    </section>
  );
}

export function KpiProgressChart({ kpis }: { kpis: KpiProgress[] }) {
  return <section className="workspace-panel overflow-hidden" aria-labelledby="kpi-progress-heading">
    <header className="workspace-panel-heading"><div><h2 id="kpi-progress-heading">Progress toward your goals</h2><p>Current period · each target equals 100%</p></div></header>
    {!kpis.length ? <p className="workspace-empty">No targets are configured for this workspace.</p> : <figure className="p-5">
      <div className="flex justify-between pb-3 text-[11px] text-muted-foreground"><span>Target completion</span><span>0% — 100%</span></div>
      <ul className="space-y-4">{kpis.map(kpi=>{
        const pct=kpi.fraction===null?null:Math.min(100,Math.max(0,kpi.fraction*100));
        const value=kpi.current===null?"Not measured":`${Number(kpi.current.toFixed(1)).toLocaleString()} / ${kpi.target_value.toLocaleString()} ${kpi.unit}`;
        return <li key={kpi.id}><div className="mb-1.5 flex flex-wrap justify-between gap-1 text-xs"><span className="font-semibold">{kpi.name}</span><span className="text-muted-foreground">{value}</span></div><svg viewBox="0 0 400 16" preserveAspectRatio="none" className="h-4 w-full" role="img" aria-label={`${kpi.name}: ${value}${pct===null?"":`; ${Number(pct.toFixed(1))}% of target`}`}><rect x="0" y="4" width="400" height="8" rx="4" fill="hsl(var(--muted))"/>{[100,200,300].map(x=><line key={x} x1={x} x2={x} y1="1" y2="15" stroke="hsl(var(--border))"/>)}{pct===null?<line x1="0" x2="400" y1="8" y2="8" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 4"/>:<rect x="0" y="4" width={pct*4} height="8" rx="4" fill="hsl(var(--primary))"/>}</svg></li>;
      })}</ul><figcaption className="mt-4 border-t pt-3 text-xs leading-5 text-muted-foreground">Unmeasured goals use dashed lines. Missing data is never shown as zero progress.</figcaption>
    </figure>}
  </section>;
}
