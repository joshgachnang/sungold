import {Box, Card, Heading, Page, Text} from "@terreno/ui";
import type React from "react";

const DevicesScreen: React.FC = () => {
  return (
    <Page navigation={undefined} scroll title="Devices">
      <Box gap={4} padding={4} testID="devices-screen">
        <Heading>Devices</Heading>
        <Card>
          <Box gap={2}>
            <Heading size="sm">Signed-in devices</Heading>
            <Text color="secondaryDark">Device sessions and revoke controls will appear here.</Text>
          </Box>
        </Card>
      </Box>
    </Page>
  );
};

export default DevicesScreen;
