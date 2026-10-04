import {Box, Button, Card, Heading, Page, SelectField, Spinner, TapToEdit, Text} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useCallback, useEffect, useMemo, useState} from "react";
import {signOut} from "@/lib/betterAuth";
import {logout, syncBetterAuthSession, useAppDispatch} from "@/store/index";
import {useGetMeQuery, usePatchMeMutation} from "@/store/sdk";

const weekStartOptions = [
  {label: "Sunday", value: "0"},
  {label: "Monday", value: "1"},
  {label: "Tuesday", value: "2"},
  {label: "Wednesday", value: "3"},
  {label: "Thursday", value: "4"},
  {label: "Friday", value: "5"},
  {label: "Saturday", value: "6"},
];

const timezoneOptions = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
].map((timezone) => ({label: timezone.replace("_", " "), value: timezone}));

const deviceTimezone = (): string => DateTime.local().zoneName ?? "UTC";

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {data: profile, isLoading} = useGetMeQuery();
  const [updateProfile] = usePatchMeMutation();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [weekStartDay, setWeekStartDay] = useState<string>("1");
  const [timezone, setTimezone] = useState<string>(deviceTimezone);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [calendarSaveState, setCalendarSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const user = profile;
  const timezoneChoices = useMemo(() => {
    const options = [...timezoneOptions];
    if (!options.some((option) => option.value === timezone)) {
      options.unshift({label: timezone.replace("_", " "), value: timezone});
    }
    return options;
  }, [timezone]);

  // Copy the server name into local state without resetting an in-progress email edit.
  const serverName = user?.name;
  useEffect(() => {
    if (serverName === undefined) {
      return;
    }
    setName(serverName || "");
  }, [serverName]);

  // Copy the server email into local state without resetting an in-progress name edit.
  const serverEmail = user?.email;
  useEffect(() => {
    if (serverEmail === undefined) {
      return;
    }
    setEmail(serverEmail || "");
  }, [serverEmail]);

  const serverWeekStartDay = user?.weekStartDay;
  useEffect(() => {
    if (serverWeekStartDay === undefined) {
      return;
    }
    setWeekStartDay(String(serverWeekStartDay));
  }, [serverWeekStartDay]);

  const serverTimezone = user?.timezone;
  useEffect(() => {
    if (serverTimezone === undefined) {
      return;
    }
    setTimezone(serverTimezone || deviceTimezone());
  }, [serverTimezone]);

  const handleLogout = useCallback(async (): Promise<void> => {
    await signOut();
    dispatch(logout());
    await syncBetterAuthSession(dispatch);
  }, [dispatch]);

  const handleSaveName = useCallback(
    async (value: string): Promise<void> => {
      setSaveError(null);
      try {
        await updateProfile({name: value}).unwrap();
      } catch (err) {
        console.error("Error updating name:", err);
        setSaveError("Failed to update name");
      }
    },
    [updateProfile]
  );

  const handleSaveEmail = useCallback(
    async (value: string): Promise<void> => {
      setSaveError(null);
      try {
        await updateProfile({email: value}).unwrap();
      } catch (err) {
        console.error("Error updating email:", err);
        setSaveError("Failed to update email");
      }
    },
    [updateProfile]
  );

  const handleSavePassword = useCallback(
    async (value: string): Promise<void> => {
      if (!value) {
        return;
      }
      setSaveError(null);
      try {
        await updateProfile({password: value}).unwrap();
        setPassword("");
      } catch (err) {
        console.error("Error updating password:", err);
        setSaveError("Failed to update password");
      }
    },
    [updateProfile]
  );

  const handleSaveCalendarSettings = useCallback(async (): Promise<void> => {
    setSaveError(null);
    setCalendarSaveState("saving");
    try {
      await updateProfile({timezone, weekStartDay: Number(weekStartDay)}).unwrap();
      setCalendarSaveState("saved");
    } catch (err) {
      console.error("Error updating calendar settings:", err);
      setCalendarSaveState("idle");
      setSaveError("Failed to update calendar settings");
    }
  }, [timezone, updateProfile, weekStartDay]);

  if (isLoading) {
    return (
      <Page navigation={undefined} title="Profile">
        <Box alignItems="center" flex="grow" justifyContent="center" padding={4}>
          <Spinner />
        </Box>
      </Page>
    );
  }

  return (
    <Page navigation={undefined} scroll title="Profile">
      <Box gap={4} padding={4} testID="profile-screen">
        <Heading>Profile</Heading>
        <Card>
          <Box gap={4}>
            <TapToEdit
              onSave={handleSaveName}
              setValue={setName}
              title="Name"
              type="text"
              value={name}
            />
            <TapToEdit
              onSave={handleSaveEmail}
              setValue={setEmail}
              title="Email"
              type="email"
              value={email}
            />
            <TapToEdit
              helperText="Leave blank to keep your current password"
              onSave={handleSavePassword}
              setValue={setPassword}
              title="New Password"
              type="password"
              value={password}
            />
            {saveError && <Text color="error">{saveError}</Text>}
          </Box>
        </Card>
        <Card>
          <Box gap={4}>
            <Heading size="sm">Calendar Settings</Heading>
            <Box testID="profile-week-start-field">
              <SelectField
                onChange={setWeekStartDay}
                options={weekStartOptions}
                requireValue
                testID="profile-week-start-select"
                title="Week starts on"
                value={weekStartDay}
              />
            </Box>
            <Box testID="profile-timezone-field">
              <SelectField
                onChange={setTimezone}
                options={timezoneChoices}
                requireValue
                testID="profile-timezone-select"
                title="Timezone"
                value={timezone}
              />
            </Box>
            <Button
              loading={calendarSaveState === "saving"}
              onClick={handleSaveCalendarSettings}
              testID="profile-calendar-save-button"
              text="Save calendar settings"
            />
            {calendarSaveState === "saved" ? (
              <Text color="success" testID="profile-calendar-saved">
                Calendar settings saved.
              </Text>
            ) : null}
          </Box>
        </Card>
        <Box marginTop={4}>
          <Button fullWidth onClick={handleLogout} text="Logout" variant="outline" />
        </Box>
      </Box>
    </Page>
  );
};

export default ProfileScreen;
