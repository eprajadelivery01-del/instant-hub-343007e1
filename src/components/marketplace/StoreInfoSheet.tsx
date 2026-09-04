import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Company } from "@/types/database";
import { Info, Clock, MapPin, Phone, Star, Store as StoreIcon, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { parseBusinessHours, getPrepTimeLabel, getStoreStatusLabel, isStoreOpenNow, WeekDay, WEEK_DAYS } from "@/lib/storeHours";
import { MediaImage } from "@/components/shared/MediaImage";
import { getCompanyLogoImage } from "@/lib/media";
import { cn } from "@/lib/utils";

interface StoreInfoSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}

const WEEKDAY_FULL_NAMES: Record<WeekDay, string> = {
  Dom: "Domingo",
  Seg: "Segunda-feira",
  Ter: "Terça-feira",
  Qua: "Quarta-feira",
  Qui: "Quinta-feira",
  Sex: "Sexta-feira",
  Sab: "Sábado",
};

export function StoreInfoSheet({ isOpen, onOpenChange, company }: StoreInfoSheetProps) {
  if (!company) return null;

  const companyLogo = getCompanyLogoImage(company);
  const isOpenStatus = isStoreOpenNow(company as any);
  const scheduleEntries = parseBusinessHours(company.business_hours);
  const prepTimeLabel = getPrepTimeLabel(company as any);

  // Determinar o dia atual (Dom, Seg, Ter...)
  const todayIndex = new Date().getDay();
  const dayNames: WeekDay[] = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const currentWeekDay = dayNames[todayIndex];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2rem] p-6 sm:max-w-lg mx-auto max-h-[85vh] flex flex-col gap-0 z-[110] border-t border-border/80 shadow-2xl overflow-hidden bg-background">
        {/* Header com Logo e Nome */}
        <SheetHeader className="pb-4 border-b border-border/60 text-left space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-secondary shadow-sm">
              <MediaImage
                src={companyLogo}
                alt={company.name}
                className="h-full w-full object-cover"
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <StoreIcon className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl font-black tracking-tight text-foreground truncate">
                  {company.name}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  isOpenStatus
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", isOpenStatus ? "bg-emerald-500 animate-pulse" : "bg-destructive")} />
                  {getStoreStatusLabel(company as any)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {company.category || "Restaurante"}
                </span>
                {company.rating && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 ml-auto">
                    <Star className="h-3 w-3 fill-amber-500" />
                    {Number(company.rating).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Informações detalhadas sobre o estabelecimento {company.name}
          </SheetDescription>
        </SheetHeader>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto pt-5 space-y-6 scrollbar-hide pb-6 pr-1">
          {/* Seção BIO / Sobre */}
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
              <Info className="h-4 w-4" />
              Sobre o Estabelecimento
            </div>
            {company.description ? (
              <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-line">
                {company.description}
              </p>
            ) : (
              <p className="text-xs font-medium text-muted-foreground italic">
                Nenhuma biografia ou descrição cadastrada no momento.
              </p>
            )}
          </div>

          {/* Seção Tempo de Preparo & Entrega */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Tempo de Preparo
              </div>
              <p className="text-base font-black text-foreground">
                {prepTimeLabel}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Média de produção
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <StoreIcon className="h-3.5 w-3.5 text-primary" />
                Taxa de Entrega
              </div>
              <p className="text-base font-black text-foreground">
                {company.delivery_fee != null
                  ? Number(company.delivery_fee) === 0
                    ? "Grátis"
                    : Number(company.delivery_fee).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "A calcular"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Base por região
              </p>
            </div>
          </div>

          {/* Seção Endereço e Contato */}
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Localização e Contato
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Endereço:</p>
                <p className="font-semibold text-foreground">
                  {company.address || "Endereço sob consulta no estabelecimento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {company.city || "Diamantino"}{company.state ? ` - ${company.state}` : " - MT"}
                </p>
              </div>

              {company.phone && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground">Telefone / WhatsApp:</p>
                      <p className="text-xs font-bold text-foreground">{company.phone}</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    Conversar
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Seção Horário de Funcionamento */}
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Horário de Funcionamento
            </div>

            {scheduleEntries && scheduleEntries.length > 0 ? (
              <div className="space-y-1.5">
                {WEEK_DAYS.map((dayKey) => {
                  const entry = scheduleEntries.find((s) => s.day === dayKey);
                  const isToday = currentWeekDay === dayKey;
                  const isActive = entry ? entry.active : false;

                  return (
                    <div
                      key={dayKey}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-colors",
                        isToday
                          ? "bg-primary/10 border border-primary/20 font-bold"
                          : "hover:bg-muted/40 font-medium text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(isToday ? "text-primary font-black" : "text-foreground font-semibold")}>
                          {WEEKDAY_FULL_NAMES[dayKey]}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground tracking-wider">
                            Hoje
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        {isActive && entry ? (
                          <span className={cn(isToday ? "text-foreground font-bold" : "text-foreground")}>
                            {entry.start} às {entry.end}
                          </span>
                        ) : (
                          <span className="text-destructive/80 font-bold">
                            Fechado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Horários não especificados em grade semanal.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
