import {Box, Card, Heading, Page, Text} from "@terreno/ui";
import type React from "react";

const HistoryScreen: React.FC = () => {
  return (
    <Page navigation={undefined} scroll title="History">
      <Box gap={4} padding={4} testID="history-screen">
        <Heading>History</Heading>
        <Card>
          <Box gap={2}>
            <Heading size="sm">Focus hours</Heading>
            <Text color="secondaryDark">
              Weekly focus charts and past sessions will appear here.
            </Text>
          </Box>
        </Card>
      </Box>
    </Page>
  );
};

export default HistoryScreen;
