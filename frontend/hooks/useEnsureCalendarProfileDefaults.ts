import {DateTime} from "luxon";
import {useEffect, useState} from "react";
import {useGetMeQuery, usePatchMeMutation} from "@/store/sdk";

const defaultTimezone = (): string => DateTime.local().zoneName ?? "UTC";

export const useEnsureCalendarProfileDefaults = (): void => {
  const {data: profile, isLoading} = useGetMeQuery();
  const [patchProfile] = usePatchMeMutation();
  const [attempted, setAttempted] = useState<boolean>(false);

  useEffect(() => {
    if (attempted || isLoading || !profile) {
      return;
    }
    if (profile.weekStartDay !== undefined && profile.timezone) {
      return;
    }
    setAttempted(true);
    void patchProfile({
      timezone: profile.timezone || defaultTimezone(),
      weekStartDay: profile.weekStartDay ?? 1,
    });
  }, [attempted, isLoading, patchProfile, profile]);
};
