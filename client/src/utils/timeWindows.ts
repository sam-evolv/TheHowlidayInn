import { HOURS, type DayKey } from '@/config/hours';

export function allowedSlotsFor(dateISO: string, stepMinutes=30): string[] {
  const d = new Date(dateISO);
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()] as DayKey;
  const windows = HOURS[day] || [];
  const pad = (n:number)=> String(n).padStart(2,'0');
  const slots:string[] = [];
  
  for (const w of windows) {
    const [sh, sm] = w.start.split(':').map(Number);
    const [eh, em] = w.end.split(':').map(Number);
    const start = new Date(d); start.setHours(sh, sm, 0, 0);
    const end   = new Date(d); end.setHours(eh, em, 0, 0);
    
    for (let t = +start; t <= +end - stepMinutes*60*1000; t += stepMinutes*60*1000) {
      const dt = new Date(t);
      slots.push(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
    }
  }
  
  return slots;
}

export function isTimeInWindow(dateISO: string, time: string): boolean {
  const allowedSlots = allowedSlotsFor(dateISO, 1); // 1-minute granularity for validation
  return allowedSlots.includes(time);
}

export function formatWindowsForDay(day: DayKey): string {
  const windows = HOURS[day];
  if (!windows || windows.length === 0) return 'Closed';
  
  return windows.map(w => {
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    };
    return `${formatTime(w.start)}–${formatTime(w.end)}`;
  }).join(' and ');
}
