import {useEffect, useState} from "react";

/** The current time, updated every minute, so durations of running sessions keep growing. */
export const useMinuteNow = (): Date => {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  return now;
};
