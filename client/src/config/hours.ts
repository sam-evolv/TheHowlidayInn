export type DayKey = 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';
export type Window = { start: string; end: string }; // 24h "HH:mm"

export const HOURS: Record<DayKey, Window[]> = {
  monday:    [{start:'08:00', end:'10:00'}, {start:'16:00', end:'18:00'}],
  tuesday:   [{start:'08:00', end:'10:00'}, {start:'16:00', end:'18:00'}],
  wednesday: [{start:'08:00', end:'10:00'}, {start:'16:00', end:'18:00'}],
  thursday:  [{start:'08:00', end:'10:00'}, {start:'16:00', end:'18:00'}],
  friday:    [{start:'08:00', end:'10:00'}, {start:'16:00', end:'18:00'}],
  saturday:  [{start:'09:00', end:'11:00'}, {start:'16:00', end:'18:00'}],
  sunday:    [{start:'16:00', end:'18:00'}],
};

export const HOURS_COPY = {
  title: 'Drop-off & Pick-up Hours',
  subtitle: 'Set windows for arrivals and collections',
  bullets: [
    'Monday–Friday: 8:00–10:00 AM and 4:00–6:00 PM',
    'Saturday: 9:00–11:00 AM and 4:00–6:00 PM',
    'Sunday: 4:00–6:00 PM only',
    'Boarding check-ins/check-outs take place during these windows. Out-of-hours by prior arrangement.'
  ]
};
