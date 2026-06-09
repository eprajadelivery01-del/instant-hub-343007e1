import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isStoreOpenBySchedule(hoursJson: string | null | undefined): boolean {
  if (!hoursJson) return true; // Se não tiver horário, consideramos que a trava manual (is_open) é a única que vale.
  if (!hoursJson.startsWith('[')) return true;
  
  try {
    const parsed = JSON.parse(hoursJson);
    const todayIndex = new Date().getDay();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const todayStr = days[todayIndex];
    
    const schedule = parsed.find((d: any) => d.day === todayStr);
    if (!schedule || !schedule.active) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = (schedule.start || "00:00").split(':').map(Number);
    const [endH, endM] = (schedule.end || "23:59").split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (e) {
    return true; // Falha no parse, assume aberto por padrão e depende do is_open
  }
}
