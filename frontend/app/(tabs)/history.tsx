import {useQuery} from "@terreno/syncdb/react";
import {
  BarChart,
  Box,
  Button,
  Card,
  DataTable,
  type DataTableCellData,
  type DataTableColumn,
  Heading,
  Page,
  Spinner,
  Text,
} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useMemo, useState} from "react";
import {ReviewSheet} from "@/components/ReviewSheet";
import {useEnsureCalendarProfileDefaults} from "@/hooks/useEnsureCalendarProfileDefaults";
import {useMinuteNow} from "@/hooks/useMinuteNow";
import {useSyncLoaded} from "@/hooks/useSyncLoaded";
import {useGetMeQuery} from "@/store/sdk";
import {type FocusHoursGrant, type FocusHoursSession, focusHoursByWeek} from "@/utils/focusHours";

interface FocusSession extends FocusHoursSession {
  blockedDomains: string[];
  intention?: string;
  review?: {reviewedAt?: string};
  reviewSkippedAt?: string;
}

interface UnlockGrant extends FocusHoursGrant {}

interface ParkingLotItem {
  _id: string;
  text: string;
  status: "open" | "done" | "dismissed";
  deleted?: boolean;
}

const SESSION_COLUMNS: DataTableColumn[] = [
  {columnType: "text", title: "Date", width: 150},
  {columnType: "text", title: "Duration", width: 120},
  {columnType: "text", title: "Intention", width: 220},
  {columnType: "text", title: "Domains", width: 260},
  {columnType: "number", title: "Peeks", width: 90},
  {columnType: "text", title: "Review", width: 130},
];

const formatHours = (value: number): string => `${value.toFixed(2)} h`;

const formatDuration = (session: FocusSession): string => {
  if (!session.endedAt) {
    return "In progress";
  }
  const startedAt = DateTime.fromISO(session.startedAt);
  const endedAt = DateTime.fromISO(session.endedAt);
  const totalMinutes = Math.max(0, Math.round(endedAt.diff(startedAt, "minutes").minutes));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  return `${hours} h ${minutes} min`;
};

const reviewStatus = (session: FocusSession): string => {
  if (session.review?.reviewedAt) {
    return "Reviewed";
  }
  if (session.reviewSkippedAt) {
    return "Skipped";
  }
  return "Not reviewed";
};

const HistoryScreen: React.FC = () => {
  useEnsureCalendarProfileDefaults();
  const loaded = useSyncLoaded();
  const {data: profile} = useGetMeQuery();
  const sessions = useQuery<FocusSession>("focusSessions");
  const grants = useQuery<UnlockGrant>("unlockGrants");
  const openParkingLotItems = useQuery<ParkingLotItem>("parkingLotItems", {
    filter: (item) => !item.deleted && item.status === "open",
  });
  const [selectedReviewSessionId, setSelectedReviewSessionId] = useState<string | undefined>(
    undefined
  );
  const now = useMinuteNow();
  const timezone = profile?.timezone || DateTime.local().zoneName || "UTC";
  const weekStartDay = profile?.weekStartDay ?? 1;

  const weeks = useMemo(
    () =>
      focusHoursByWeek(sessions, grants, {
        now,
        timezone,
        weekStartDay,
        weeks: 8,
      }),
    [grants, now, sessions, timezone, weekStartDay]
  );

  const endedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "ended" && session.endedAt)
        .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")),
    [sessions]
  );

  const pendingReviewSessions = useMemo(
    () =>
      endedSessions.filter((session) => !session.review?.reviewedAt && !session.reviewSkippedAt),
    [endedSessions]
  );
  const selectedReviewSession = useMemo(
    () => pendingReviewSessions.find((session) => session._id === selectedReviewSessionId),
    [pendingReviewSessions, selectedReviewSessionId]
  );

  const grantsBySessionId = useMemo(() => {
    const grouped = new Map<string, UnlockGrant[]>();
    for (const grant of grants) {
      const sessionGrants = grouped.get(grant.sessionId) ?? [];
      sessionGrants.push(grant);
      grouped.set(grant.sessionId, sessionGrants);
    }
    return grouped;
  }, [grants]);

  const tableData = useMemo<DataTableCellData[][]>(
    () =>
      endedSessions.map((session) => [
        {
          value: DateTime.fromISO(session.endedAt as string)
            .setZone(timezone)
            .toFormat("LLL d, yyyy"),
        },
        {value: formatDuration(session)},
        {value: session.intention || "No intention"},
        {value: session.blockedDomains.join(", ")},
        {value: grantsBySessionId.get(session._id)?.length ?? 0},
        {value: reviewStatus(session)},
      ]),
    [endedSessions, grantsBySessionId, timezone]
  );

  return (
    <Page navigation={undefined} scroll title="History">
      <Box gap={4} padding={4} testID="history-screen">
        <Heading>History</Heading>
        {!loaded ? (
          <Box alignItems="center" padding={4} testID="history-loading">
            <Spinner />
          </Box>
        ) : (
          <>
            <Card>
              <Box gap={3}>
                <Heading size="sm">Focus hours</Heading>
                <Box testID="history-week-total">
                  <Text>{formatHours(weeks.at(-1)?.hours ?? 0)} this week</Text>
                </Box>
                <BarChart
                  accessibilityLabel="Weekly focus hours"
                  data={weeks.map((week) => ({label: week.label, value: week.hours}))}
                  emptyText="No focus hours yet"
                  formatValue={formatHours}
                  legendLabel="Focus hours"
                  testID="history-focus-hours-chart"
                />
                <Box direction="row" gap={2} testID="history-week-summaries" wrap>
                  {weeks.map((week, index) => (
                    <Box key={week.weekStart} testID={`history-week-${index}`}>
                      <Text color="secondaryDark" size="sm">
                        {week.label}: {formatHours(week.hours)}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Card>
            {selectedReviewSession ? (
              <ReviewSheet
                items={openParkingLotItems}
                onClose={() => setSelectedReviewSessionId(undefined)}
                session={selectedReviewSession}
              />
            ) : null}
            {pendingReviewSessions.length > 0 && !selectedReviewSession ? (
              <Card>
                <Box gap={3} testID="history-pending-reviews">
                  <Heading size="sm">Pending reviews</Heading>
                  {pendingReviewSessions.map((session) => (
                    <Box
                      direction="row"
                      gap={2}
                      key={session._id}
                      testID={`history-pending-review-${session._id}`}
                      wrap
                    >
                      <Box flex="grow">
                        <Text>{session.intention || "Ended focus session"}</Text>
                        <Text color="secondaryDark" size="sm">
                          {DateTime.fromISO(session.endedAt as string)
                            .setZone(timezone)
                            .toFormat("LLL d, yyyy")}
                        </Text>
                      </Box>
                      <Button
                        onClick={() => setSelectedReviewSessionId(session._id)}
                        testID={`history-review-button-${session._id}`}
                        text="Review"
                        variant="secondary"
                      />
                    </Box>
                  ))}
                </Box>
              </Card>
            ) : null}
            <Card>
              <Box gap={3}>
                <Heading size="sm">Sessions</Heading>
                <Box testID="history-sessions-table">
                  <DataTable
                    columns={SESSION_COLUMNS}
                    data={tableData}
                    emptyContent={<Text color="secondaryDark">No past sessions yet.</Text>}
                    getRowTestID={(_, index) => endedSessions[index]?._id ?? index}
                    testID="history-sessions-data-table"
                  />
                </Box>
              </Box>
            </Card>
          </>
        )}
      </Box>
    </Page>
  );
};

export default HistoryScreen;
