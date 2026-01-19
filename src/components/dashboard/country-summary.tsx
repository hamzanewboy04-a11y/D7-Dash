"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CountryData {
  name: string;
  code: string;
  revenue: number;
  spend: number;
  profit: number;
  roi: number;
}

interface CountrySummaryProps {
  countries: CountryData[];
}

const countryFlags: Record<string, string> = {
  PE: "🇵🇪",
  IT_F: "🇮🇹",
  IT_M: "🇮🇹",
  AR: "🇦🇷",
  CL: "🇨🇱",
};

export function CountrySummary({ countries }: CountrySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Country</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {countries.map((country) => (
            <div
              key={country.code}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{countryFlags[country.code] || "🌍"}</span>
                <div>
                  <p className="font-medium">{country.name}</p>
                  <p className="text-sm text-slate-500">
                    Spend: ${country.spend.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">${country.revenue.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">Revenue</p>
                </div>

                <div className="text-right">
                  <p
                    className={cn(
                      "font-medium",
                      country.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    ${country.profit.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">Profit</p>
                </div>

                <Badge
                  variant={country.roi >= 0 ? "default" : "destructive"}
                  className={cn(
                    country.roi >= 0
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : ""
                  )}
                >
                  ROI: {(country.roi * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
