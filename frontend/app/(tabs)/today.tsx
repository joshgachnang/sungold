import {useQuery} from "@terreno/syncdb/react";
import {Box, Card, DashboardGrid, Heading, Page, Text} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useMemo} from "react";
import {FocusSessionPanel} from "@/components/FocusSessionPanel";
import {useEnsureCalendarProfileDefaults} from "@/hooks/useEnsureCalendarProfileDefaults";
import {useGetMeQuery} from "@/store/sdk";
import {type FocusHoursGrant, type FocusHoursSession, focusHoursByWeek} from "@/utils/focusHours";

const formatHours = (value: number): string => `${value.toFixed(2)} h`;

const formatDelta = (current: number, previous: number): string => {
  const delta = Number((current - previous).toFixed(2));
  if (delta === 0) {
    return "Even with last week";
  }
  return `${formatHours(Math.abs(delta))} ${delta > 0 ? "more" : "less"} than last week`;
};

const TodayScreen: React.FC = () => {
  useEnsureCalendarProfileDefaults();
  const {data: profile} = useGetMeQuery();
  const sessions = useQuery<FocusHoursSession>("focusSessions");
  const grants = useQuery<FocusHoursGrant>("unlockGrants");
  const timezone = profile?.timezone || DateTime.local().zoneName || "UTC";
  const weekStartDay = profile?.weekStartDay ?? 1;
  const weeks = useMemo(
    () =>
      focusHoursByWeek(sessions, grants, {
        timezone,
        weekStartDay,
        weeks: 2,
      }),
    [grants, sessions, timezone, weekStartDay]
  );
  const lastWeek = weeks.at(0)?.hours ?? 0;
  const thisWeek = weeks.at(1)?.hours ?? 0;

  return (
    <Page navigation={undefined} scroll title="Today">
      <Box gap={4} padding={4} testID="today-screen">
        <Heading>Today</Heading>
        <DashboardGrid columns={{lg: 2, md: 2, sm: 1}} testID="today-dashboard-grid">
          <FocusSessionPanel testIDPrefix="today" />
          <Card>
            <Box gap={3} testID="today-week-comparison">
              <Heading size="sm">Weekly focus</Heading>
              <Box gap={1} testID="today-this-week-hours">
                <Text>{formatHours(thisWeek)} this week</Text>
                <Text color="secondaryDark">{formatHours(lastWeek)} last week</Text>
              </Box>
              <Box testID="today-week-delta">
                <Text color="secondaryDark">{formatDelta(thisWeek, lastWeek)}</Text>
              </Box>
            </Box>
          </Card>
        </DashboardGrid>
      </Box>
    </Page>
  );
};

export default TodayScreen;
