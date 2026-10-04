import {Box, Card, Heading, Page, Text} from "@terreno/ui";
import type React from "react";

const TodayScreen: React.FC = () => {
  return (
    <Page navigation={undefined} scroll title="Today">
      <Box gap={4} padding={4} testID="today-screen">
        <Heading>Today</Heading>
        <Card>
          <Box gap={2}>
            <Heading size="sm">Focus dashboard</Heading>
            <Text color="secondaryDark">
              Today's active session and weekly focus summary will appear here.
            </Text>
          </Box>
        </Card>
      </Box>
    </Page>
  );
};

export default TodayScreen;
