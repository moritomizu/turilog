export type TideDirection = "rising" | "falling" | "unknown";

export type TidePhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type TideType = "high" | "low" | "unknown";

export type User = {
  uid: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
};

export type TideInfo = {
  tideHeight: number | null;
  tideDirection: TideDirection;
  tidePhase: TidePhase | null;
  tidePhaseLabel: string;
  previousTideTime: string | null;
  previousTideType: TideType;
  nextTideTime: string | null;
  nextTideType: TideType;
  minutesToNextTide: number | null;
  tideStationName: string | null;
  tideStationDistance: number | null;
  tideApiProvider: "stormglass" | "worldtides" | "none";
};

export type OfficialTideReference = {
  officialTideStationName: string | null;
  officialTideStationDistance: number | null;
  officialTideCurveUrl: string | null;
  officialTideSourceName: string | null;
  officialTideDate: string | null;
};

export type WeatherInfo = {
  weatherLabel: string;
  weatherCode: number | null;
  temperatureC: number | null;
  precipitationMm: number | null;
  cloudCoverPercent: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  windDirectionLabel: string | null;
  windGustMs: number | null;
  weatherSourceName: string | null;
  weatherSourceUrl: string | null;
  weatherFetchedAt: string | null;
};

export type LunarInfo = {
  lunarDateLabel: string | null;
  lunarYearName: string | null;
  lunarMonthLabel: string | null;
  lunarDay: number | null;
  moonAge: number | null;
  moonPhase: number | null;
  moonPhaseLabel: string | null;
};

export type Catch = TideInfo &
  OfficialTideReference & {
  weather: WeatherInfo;
  lunar: LunarInfo;
  id: string;
  userId: string;
  imageUrl: string | null;
  fishType: string;
  sizeCm: number;
  caughtAt: string;
  comment: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
};
