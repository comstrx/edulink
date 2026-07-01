import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SalaryCurrency = "USD" | "EGP";

interface SalaryRangeFilterProps {
  salaryMin: number;
  salaryMax: number;
  currency: SalaryCurrency;
  onSalaryMinChange: (v: number) => void;
  onSalaryMaxChange: (v: number) => void;
  onCurrencyChange: (v: SalaryCurrency) => void;
}

const USD_MARKERS = [500, 1000, 2000, 3000, 4000, 5000, 7000];
const EGP_MARKERS = [5000, 10000, 20000, 40000, 60000, 80000, 100000];

const USD_MIN = 500;
const USD_MAX = 7000;
const EGP_MIN = 5000;
const EGP_MAX = 100000;

const STEP_USD = 100;
const STEP_EGP = 1000;

const formatCurrency = (value: number, currency: SalaryCurrency) => {
  const symbol = currency === "USD" ? "$" : "E£";
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${symbol}${value}`;
};

const SalaryRangeFilter = ({
  salaryMin,
  salaryMax,
  currency,
  onSalaryMinChange,
  onSalaryMaxChange,
  onCurrencyChange,
}: SalaryRangeFilterProps) => {
  const { t } = useLanguage();

  const isUSD = currency === "USD";
  const min = isUSD ? USD_MIN : EGP_MIN;
  const max = isUSD ? USD_MAX : EGP_MAX;
  const step = isUSD ? STEP_USD : STEP_EGP;
  const markers = isUSD ? USD_MARKERS : EGP_MARKERS;

  // Clamp current values to currency range
  const clampedMin = Math.max(min, Math.min(salaryMin, max));
  const clampedMax = Math.max(min, Math.min(salaryMax, max));

  const handleSliderChange = (values: number[]) => {
    onSalaryMinChange(values[0]);
    onSalaryMaxChange(values[1]);
  };

  const handleCurrencyChange = (v: string) => {
    const newCurrency = v as SalaryCurrency;
    onCurrencyChange(newCurrency);
    // Reset to full range when switching
    if (newCurrency === "USD") {
      onSalaryMinChange(USD_MIN);
      onSalaryMaxChange(USD_MAX);
    } else {
      onSalaryMinChange(EGP_MIN);
      onSalaryMaxChange(EGP_MAX);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 opacity-60" />
          {t("jobs.filter.salaryRange") || "Salary Range"}
        </Label>
        <Select value={currency} onValueChange={handleCurrencyChange}>
          <SelectTrigger className="h-6 w-[72px] text-[10px] border-border/50 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD" className="text-xs">USD</SelectItem>
            <SelectItem value="EGP" className="text-xs">EGP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Display range */}
      <p className="text-xs text-muted-foreground text-center font-medium">
        {formatCurrency(clampedMin, currency)} — {formatCurrency(clampedMax, currency)}
      </p>

      {/* Dual-thumb slider */}
      <Slider
        min={min}
        max={max}
        step={step}
        value={[clampedMin, clampedMax]}
        onValueChange={handleSliderChange}
        className="w-full"
      />

      {/* Markers */}
      <div className="relative w-full h-4">
        {markers.map((mark) => {
          const pct = ((mark - min) / (max - min)) * 100;
          return (
            <span
              key={mark}
              className="absolute text-[9px] text-muted-foreground/60 -translate-x-1/2 leading-none"
              style={{ left: `${pct}%` }}
            >
              {formatCurrency(mark, currency)}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default SalaryRangeFilter;
