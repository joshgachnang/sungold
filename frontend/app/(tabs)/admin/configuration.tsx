import {ConfigurationScreen} from "@terreno/admin-frontend";
import type React from "react";
import {adminTerrenoApi} from "@/store/sdk";

const ConfigurationPage: React.FC = () => {
  return <ConfigurationScreen api={adminTerrenoApi} />;
};

export default ConfigurationPage;
