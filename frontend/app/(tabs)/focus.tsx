import {Box, Heading, Page} from "@terreno/ui";
import type React from "react";
import {FocusSessionPanel} from "@/components/FocusSessionPanel";

const FocusScreen: React.FC = () => {
  return (
    <Page navigation={undefined} title="Focus">
      <Box gap={4} padding={4} testID="focus-screen">
        <Heading>Focus</Heading>
        <FocusSessionPanel testIDPrefix="focus" />
      </Box>
    </Page>
  );
};

export default FocusScreen;
